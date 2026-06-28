import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { MOCK_FRIDGES, getFridgeMeta, type MockFridge } from '../services/bicom.mock';
import { enqueueCommand, drainCommands } from '../services/remoteCommands';

const round2 = (n: number) => Math.round(n * 100) / 100;

const SUPPORTED_LANGS = new Set(['en', 'es', 'pt', 'de', 'it']);

function parseLang(query: unknown): string {
  if (typeof query !== 'string') return 'fr';
  const code = query.toLowerCase().split('-')[0];
  return SUPPORTED_LANGS.has(code) ? code : 'fr';
}

// Charge tout le stock en base et le regroupe par frigo (une seule requête, pas de N+1).
async function stockByFridge(lang: string): Promise<Map<string, ReturnType<typeof toDishEntry>[]>> {
  const stocks = await prisma.fridgeStock.findMany({
    include: {
      dish: {
        select: {
          id: true,
          name: true,
          category: true,
          description: true,
          price: true,
          allergens: true,
          dlcDays: true,
          isActive: true,
          imageMimeType: true,
          translations: {
            where: { language: lang },
            select: { name: true, description: true },
          },
        },
      },
    },
  });

  const map = new Map<string, ReturnType<typeof toDishEntry>[]>();
  for (const stock of stocks) {
    if (!stock.dish.isActive) continue;
    const list = map.get(stock.frigoId) ?? [];
    list.push(toDishEntry(stock));
    map.set(stock.frigoId, list);
  }
  return map;
}

function toDishEntry(stock: {
  id: string;
  quantity: number;
  expiryDate: Date | null;
  promoPercent: number | null;
  dish: {
    id: string;
    name: string;
    category: string;
    description: string | null;
    price: number;
    allergens: unknown; // JSON (tableau de chaînes) en MySQL
    dlcDays: number | null;
    imageMimeType: string | null;
    translations: { name: string; description: string | null }[];
  };
}) {
  const { dish } = stock;
  const t = dish.translations[0];
  const displayName = t?.name ?? dish.name;
  const displayDescription = t !== undefined ? t.description : dish.description;

  const finalPrice =
    stock.promoPercent && stock.promoPercent > 0
      ? round2(dish.price * (1 - stock.promoPercent / 100))
      : dish.price;
  return {
    id: dish.id,
    stockId: stock.id,
    name: displayName,
    category: dish.category,
    description: displayDescription,
    price: dish.price,
    allergens: Array.isArray(dish.allergens) ? (dish.allergens as string[]) : [],
    dlcDays: dish.dlcDays,
    stock: stock.quantity,
    expiryDate: stock.expiryDate,
    promoPercent: stock.promoPercent,
    finalPrice,
    hasImage: dish.imageMimeType != null,
  };
}

function buildFridge(meta: MockFridge, dishes: ReturnType<typeof toDishEntry>[]) {
  return { ...meta, dishes };
}

// GET /api/v1/admin/frigos  &  GET /api/v1/public/frigos
export async function listFridges(req: Request, res: Response): Promise<void> {
  const lang = parseLang(req.query['lang']);
  const byFridge = await stockByFridge(lang);
  const fridges = MOCK_FRIDGES.map((meta) => buildFridge(meta, byFridge.get(meta.id) ?? []));
  res.json({ fridges, isMock: true });
}

// GET /api/v1/admin/frigos/:id  &  GET /api/v1/public/frigos/:id
export async function getFridge(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const meta = getFridgeMeta(id);
  if (!meta) {
    res.status(404).json({ error: 'Frigo introuvable' });
    return;
  }
  const lang = parseLang(req.query['lang']);
  const byFridge = await stockByFridge(lang);
  res.json({ fridge: buildFridge(meta, byFridge.get(id) ?? []), isMock: true });
}

// Snapshot de stock envoyé par la borne (1 entrée par plat encore présent).
const stockSyncSchema = z.object({
  stocks: z.array(
    z.object({
      dishId: z.string().min(1),
      quantity: z.number().int().min(0),
    }),
  ),
});

// POST /api/v1/public/frigos/:id/stock
// La borne pousse l'inventaire réel (nombre de casiers remplis par plat). On met
// à jour les quantités du frigo et on remet à 0 les plats absents du snapshot
// (vendus / retirés) → l'app web client reflète le stock réel de la borne.
export async function syncFridgeStock(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  if (!getFridgeMeta(id)) {
    res.status(404).json({ error: 'Frigo introuvable' });
    return;
  }

  // Protection optionnelle : si KIOSK_API_KEY est défini, exiger l'en-tête.
  const expectedKey = process.env['KIOSK_API_KEY'];
  if (expectedKey && req.header('x-kiosk-key') !== expectedKey) {
    res.status(401).json({ error: 'Clé borne invalide' });
    return;
  }

  const parsed = stockSyncSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { stocks } = parsed.data;

  // On ne garde que les plats existants (contrainte de clé étrangère).
  const known = await prisma.dish.findMany({
    where: { id: { in: stocks.map((s) => s.dishId) } },
    select: { id: true },
  });
  const valid = new Set(known.map((d) => d.id));
  const toApply = stocks.filter((s) => valid.has(s.dishId));

  for (const s of toApply) {
    await prisma.fridgeStock.upsert({
      where: { frigoId_dishId: { frigoId: id, dishId: s.dishId } },
      create: { frigoId: id, dishId: s.dishId, quantity: s.quantity },
      update: { quantity: s.quantity },
    });
  }

  // Plats de ce frigo absents du snapshot → stock épuisé.
  await prisma.fridgeStock.updateMany({
    where: { frigoId: id, dishId: { notIn: toApply.map((s) => s.dishId) } },
    data: { quantity: 0 },
  });

  res.json({ ok: true, updated: toApply.length });
}

// ── Ouverture/fermeture à distance des casiers ──────────────────────────────
const remoteCmdSchema = z.object({
  board: z.string().min(1).max(1).default('A'),
  boxNumber: z.number().int().min(0).max(32).default(0),
  action: z.enum(['open', 'close_all']).default('open'),
});

// POST /api/v1/admin/frigos/:id/commands — l'opérateur empile une commande.
export async function queueFridgeCommand(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  if (!getFridgeMeta(id)) {
    res.status(404).json({ error: 'Frigo introuvable' });
    return;
  }
  const parsed = remoteCmdSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const cmd = enqueueCommand({ frigoId: id, ...parsed.data });
  res.status(201).json({ command: cmd });
}

// GET /api/v1/public/frigos/:id/commands — la borne récupère (et vide) ses commandes.
export async function pullFridgeCommands(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  if (!getFridgeMeta(id)) {
    res.status(404).json({ error: 'Frigo introuvable' });
    return;
  }
  const expectedKey = process.env['KIOSK_API_KEY'];
  if (expectedKey && req.header('x-kiosk-key') !== expectedKey) {
    res.status(401).json({ error: 'Clé borne invalide' });
    return;
  }
  res.json({ commands: drainCommands(id) });
}
