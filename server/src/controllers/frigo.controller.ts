import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { MOCK_FRIDGES, getFridgeMeta, type MockFridge } from '../services/bicom.mock';

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
    allergens: string[];
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
    allergens: dish.allergens,
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
