import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { getFridgeMeta } from '../services/fridges';
import { markSeen, getStatus } from '../services/fridgeStatus';
import { enqueueCommand, drainCommands } from '../services/remoteCommands';
import { notifyFridgeSubscribers } from '../services/push.service';
import { creditPurchase } from '../services/loyalty.service';

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

interface FridgeRow {
  id: string;
  name: string;
  serialNumber: string | null;
  location: string | null;
  teamviewerId: string | null;
  teamviewerPassword: string | null;
}

// includePrivate = true uniquement pour l'admin (identifiants TeamViewer sensibles).
function buildFridge(f: FridgeRow, dishes: ReturnType<typeof toDishEntry>[], includePrivate = false) {
  const st = getStatus(f.id);
  return {
    id: f.id,
    name: f.name,
    serialNumber: f.serialNumber,
    location: f.location,
    ...(includePrivate ? { teamviewerId: f.teamviewerId, teamviewerPassword: f.teamviewerPassword } : {}),
    online: st.online,
    temperature: st.temperature,
    lastSync: st.lastSync,
    dishes,
  };
}

// GET /api/v1/admin/frigos  &  GET /api/v1/public/frigos
export async function listFridges(req: Request, res: Response): Promise<void> {
  const isAdmin = req.baseUrl.includes('/admin');
  const lang = parseLang(req.query['lang']);
  const byFridge = await stockByFridge(lang);
  const fridges = await prisma.fridge.findMany({ orderBy: { name: 'asc' } });
  res.json({ fridges: fridges.map((f) => buildFridge(f, byFridge.get(f.id) ?? [], isAdmin)) });
}

// GET /api/v1/admin/frigos/:id  &  GET /api/v1/public/frigos/:id
export async function getFridge(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const meta = await getFridgeMeta(id);
  if (!meta) {
    res.status(404).json({ error: 'Frigo introuvable' });
    return;
  }
  const isAdmin = req.baseUrl.includes('/admin');
  const lang = parseLang(req.query['lang']);
  const byFridge = await stockByFridge(lang);
  res.json({ fridge: buildFridge(meta, byFridge.get(meta.id) ?? [], isAdmin) });
}

// ── CRUD frigo (admin) ──────────────────────────────────────────────────────
const fridgeSchema = z.object({
  name: z.string().min(1).max(120),
  serialNumber: z.string().max(80).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  teamviewerId: z.string().max(120).nullable().optional(),
  teamviewerPassword: z.string().max(120).nullable().optional(),
});

// POST /api/v1/admin/frigos
export async function createFridge(req: Request, res: Response): Promise<void> {
  const parsed = fridgeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const fridge = await prisma.fridge.create({ data: parsed.data });
  res.status(201).json({ fridge });
}

// PATCH /api/v1/admin/frigos/:id
export async function updateFridge(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  if (!(await getFridgeMeta(id))) {
    res.status(404).json({ error: 'Frigo introuvable' });
    return;
  }
  const parsed = fridgeSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const fridge = await prisma.fridge.update({ where: { id }, data: parsed.data });
  res.json({ fridge });
}

// DELETE /api/v1/admin/frigos/:id (+ son stock)
export async function deleteFridge(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  if (!(await getFridgeMeta(id))) {
    res.status(404).json({ error: 'Frigo introuvable' });
    return;
  }
  await prisma.fridgeStock.deleteMany({ where: { frigoId: id } });
  await prisma.fridge.delete({ where: { id } });
  res.status(204).send();
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
  const meta = await getFridgeMeta(req.params['id'] as string);
  if (!meta) {
    res.status(404).json({ error: 'Frigo introuvable' });
    return;
  }
  const fid = meta.id;

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
      where: { frigoId_dishId: { frigoId: fid, dishId: s.dishId } },
      create: { frigoId: fid, dishId: s.dishId, quantity: s.quantity },
      update: { quantity: s.quantity },
    });
  }

  // Plats de ce frigo absents du snapshot → stock épuisé.
  await prisma.fridgeStock.updateMany({
    where: { frigoId: fid, dishId: { notIn: toApply.map((s) => s.dishId) } },
    data: { quantity: 0 },
  });

  markSeen(fid); // la borne s'est manifestée → frigo « en ligne »
  res.json({ ok: true, updated: toApply.length });
}

// ── Remontée de la carte complète (borne → serveur) ─────────────────────────
// La borne est la source de vérité : elle pousse toute sa carte (plats + prix +
// DLC + stock + images). On upsert le catalogue et le stock du frigo, puis on
// retire les plats absents → l'app web affiche exactement la carte de la borne.
const menuSyncSchema = z.object({
  dishes: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1).max(200),
      category: z.string().max(80).nullable().optional(),
      description: z.string().nullable().optional(),
      price: z.number().int().min(0), // centimes
      allergens: z.array(z.string()).default([]),
      dlcDays: z.number().int().nullable().optional(),
      expiryDate: z.string().nullable().optional(),
      quantity: z.number().int().min(0),
      image: z.object({ base64: z.string(), mime: z.string() }).nullable().optional(),
    }),
  ),
});

// POST /api/v1/public/frigos/:id/menu
export async function syncFridgeMenu(req: Request, res: Response): Promise<void> {
  const meta = await getFridgeMeta(req.params['id'] as string);
  if (!meta) {
    res.status(404).json({ error: 'Frigo introuvable' });
    return;
  }
  const fid = meta.id;
  const expectedKey = process.env['KIOSK_API_KEY'];
  if (expectedKey && req.header('x-kiosk-key') !== expectedKey) {
    res.status(401).json({ error: 'Clé borne invalide' });
    return;
  }
  const parsed = menuSyncSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { dishes } = parsed.data;

  // État avant mise à jour → sert à repérer les plats réellement nouveaux.
  const before = await prisma.fridgeStock.findMany({
    where: { frigoId: fid },
    select: { dishId: true },
  });
  const beforeIds = new Set(before.map((s) => s.dishId));

  for (const d of dishes) {
    const base = {
      name: d.name,
      category: d.category ?? 'Autre',
      description: d.description ?? null,
      price: d.price / 100, // centimes → euros
      allergens: d.allergens ?? [],
      dlcDays: d.dlcDays ?? null,
    };
    // Les photos sont gérées côté admin (source de vérité) : on n'écrit JAMAIS
    // l'image depuis la borne → les photos uploadées dans l'admin sont préservées.
    await prisma.dish.upsert({
      where: { id: d.id },
      create: { id: d.id, ...base, isActive: true },
      update: base,
    });
    await prisma.fridgeStock.upsert({
      where: { frigoId_dishId: { frigoId: fid, dishId: d.id } },
      create: {
        frigoId: fid,
        dishId: d.id,
        quantity: d.quantity,
        expiryDate: d.expiryDate ? new Date(d.expiryDate) : null,
      },
      update: {
        quantity: d.quantity,
        expiryDate: d.expiryDate ? new Date(d.expiryDate) : null,
      },
    });
  }

  // Plats de ce frigo absents de la carte poussée → on les retire (web = borne).
  // Garde-fou : on ne purge que si la borne a réellement envoyé des plats.
  if (dishes.length > 0) {
    await prisma.fridgeStock.deleteMany({
      where: { frigoId: fid, dishId: { notIn: dishes.map((d) => d.id) } },
    });
  }

  markSeen(fid);

  // Notification automatique : dès qu'un plat est physiquement ajouté à la borne
  // (donc nouveau dans ce frigo), on prévient les abonnés de ce frigo. Le garde-fou
  // `beforeIds.size > 0` évite d'alerter lors du tout premier garnissage du frigo.
  if (beforeIds.size > 0) {
    const added = dishes.filter((d) => !beforeIds.has(d.id));
    if (added.length > 0) {
      const noms = added.map((d) => d.name).join(', ');
      void notifyFridgeSubscribers(fid, {
        title: `Nouveau au ${meta.name}`,
        body: added.length === 1 ? `${noms} vient d'arriver !` : `Nouveaux plats : ${noms}`,
        url: '/app/mon-frigo',
        tag: `newdish-${fid}`,
      }).catch(() => {});
    }
  }

  res.json({ ok: true, count: dishes.length });
}

// ── Remontée des ventes (borne → serveur) ───────────────────────────────────
const saleSchema = z.object({
  dishId: z.string().min(1),
  amount: z.number().int().min(0),
  mode: z.enum(['paid', 'free']).default('paid'),
  soldAt: z.string().optional(),
  contact: z.string().trim().min(3).optional(), // email/tél saisi à la borne → fidélité
});

// POST /api/v1/public/frigos/:id/sales — la borne remonte une vente.
export async function recordSale(req: Request, res: Response): Promise<void> {
  const meta = await getFridgeMeta(req.params['id'] as string);
  if (!meta) {
    res.status(404).json({ error: 'Frigo introuvable' });
    return;
  }
  const expectedKey = process.env['KIOSK_API_KEY'];
  if (expectedKey && req.header('x-kiosk-key') !== expectedKey) {
    res.status(401).json({ error: 'Clé borne invalide' });
    return;
  }
  const parsed = saleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { dishId, amount, mode, soldAt, contact } = parsed.data;
  const sale = await prisma.sale.create({
    data: { frigoId: meta.id, dishId, amount, mode, soldAt: soldAt ? new Date(soldAt) : new Date() },
  });
  markSeen(meta.id);

  // Fidélité : si le client s'est identifié et que c'est un achat payant, on crédite ses points.
  let loyalty = null;
  if (contact && mode === 'paid' && amount > 0) {
    try {
      loyalty = await creditPurchase(contact, amount, meta.id, dishId);
    } catch {
      // La fidélité ne doit jamais faire échouer l'enregistrement de la vente.
    }
  }
  res.status(201).json({ sale, loyalty });
}

// ── Ouverture/fermeture à distance des casiers ──────────────────────────────
const remoteCmdSchema = z.object({
  board: z.string().min(1).max(1).default('A'),
  boxNumber: z.number().int().min(0).max(32).default(0),
  action: z.enum(['open', 'close_all']).default('open'),
});

// POST /api/v1/admin/frigos/:id/commands — l'opérateur empile une commande.
export async function queueFridgeCommand(req: Request, res: Response): Promise<void> {
  const meta = await getFridgeMeta(req.params['id'] as string);
  if (!meta) {
    res.status(404).json({ error: 'Frigo introuvable' });
    return;
  }
  const parsed = remoteCmdSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const cmd = enqueueCommand({ frigoId: meta.id, ...parsed.data });
  res.status(201).json({ command: cmd });
}

// GET /api/v1/public/frigos/:id/commands — la borne récupère (et vide) ses commandes.
export async function pullFridgeCommands(req: Request, res: Response): Promise<void> {
  const meta = await getFridgeMeta(req.params['id'] as string);
  if (!meta) {
    res.status(404).json({ error: 'Frigo introuvable' });
    return;
  }
  const expectedKey = process.env['KIOSK_API_KEY'];
  if (expectedKey && req.header('x-kiosk-key') !== expectedKey) {
    res.status(401).json({ error: 'Clé borne invalide' });
    return;
  }
  // La borne interroge cet endpoint toutes les 3 s : c'est notre « heartbeat ».
  // → le frigo reste « en ligne » tant qu'il est joignable, même sans vente.
  markSeen(meta.id);
  res.json({ commands: drainCommands(meta.id) });
}
