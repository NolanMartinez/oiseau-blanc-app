import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

// Journée d'exploitation : commence au dernier 03:00. « Aujourd'hui » = depuis ce
// 03:00 ; « la veille » = les 24 h précédentes. Cohérent avec le rapport quotidien.
function dayBounds(now = new Date()) {
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 3, 0, 0, 0);
  if (now < dayStart) dayStart.setDate(dayStart.getDate() - 1);
  const prevStart = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);
  return { dayStart, prevStart };
}

const siteKey = (f: { name: string; location: string | null }) =>
  (f.location && f.location.trim()) || f.name;

// GET /api/v1/livreur/sites — frigos regroupés par site, avec stock + ventes
// (aujourd'hui / veille) pour préparer la tournée.
export async function getSites(_req: Request, res: Response): Promise<void> {
  const now = new Date();
  const { dayStart, prevStart } = dayBounds(now);

  const [fridges, stocks, sales, purchases, dishes] = await Promise.all([
    prisma.fridge.findMany({ select: { id: true, name: true, location: true } }),
    prisma.fridgeStock.groupBy({ by: ['frigoId'], _sum: { quantity: true }, _count: { _all: true } }),
    prisma.sale.findMany({ where: { soldAt: { gte: prevStart } }, select: { frigoId: true, amount: true, soldAt: true } }),
    prisma.purchase.findMany({ where: { purchasedAt: { gte: prevStart } }, select: { frigoId: true, dishId: true, purchasedAt: true } }),
    prisma.dish.findMany({ select: { id: true, price: true } }),
  ]);

  const dishPrice = new Map(dishes.map((d) => [d.id, d.price]));
  const stockByFridge = new Map(stocks.map((s) => [s.frigoId, { qty: s._sum.quantity ?? 0, items: s._count._all }]));

  type Bucket = { count: number; revenueCents: number };
  const empty = (): Bucket => ({ count: 0, revenueCents: 0 });
  const salesByFridge = new Map<string, { today: Bucket; prev: Bucket }>();
  const bucketFor = (frigoId: string, when: Date): Bucket => {
    let e = salesByFridge.get(frigoId);
    if (!e) { e = { today: empty(), prev: empty() }; salesByFridge.set(frigoId, e); }
    return when >= dayStart ? e.today : e.prev;
  };
  for (const s of sales) { const b = bucketFor(s.frigoId, s.soldAt); b.count += 1; b.revenueCents += s.amount; }
  for (const p of purchases) { const b = bucketFor(p.frigoId, p.purchasedAt); b.count += 1; b.revenueCents += Math.round((dishPrice.get(p.dishId) ?? 0) * 100); }

  const sites = new Map<string, {
    site: string;
    fridges: { id: string; name: string; stockQty: number; stockItems: number }[];
    todayCount: number; todayRevenueCents: number;
    prevCount: number; prevRevenueCents: number;
  }>();
  for (const f of fridges) {
    const key = siteKey(f);
    let s = sites.get(key);
    if (!s) { s = { site: key, fridges: [], todayCount: 0, todayRevenueCents: 0, prevCount: 0, prevRevenueCents: 0 }; sites.set(key, s); }
    const st = stockByFridge.get(f.id) ?? { qty: 0, items: 0 };
    s.fridges.push({ id: f.id, name: f.name, stockQty: st.qty, stockItems: st.items });
    const sb = salesByFridge.get(f.id);
    if (sb) {
      s.todayCount += sb.today.count; s.todayRevenueCents += sb.today.revenueCents;
      s.prevCount += sb.prev.count; s.prevRevenueCents += sb.prev.revenueCents;
    }
  }

  const list = Array.from(sites.values()).sort((a, b) => b.todayRevenueCents - a.todayRevenueCents);
  res.json({ sites: list });
}

// GET /api/v1/livreur/frigos/:id/detail — stock + détail des ventes (aujourd'hui
// et la veille) avec horaire et localisation casier.
export async function getFridgeDetail(req: Request, res: Response): Promise<void> {
  const frigoId = req.params['id'] as string;
  const now = new Date();
  const { dayStart, prevStart } = dayBounds(now);

  const [fridge, stocks, sales, purchases, dishes] = await Promise.all([
    prisma.fridge.findUnique({ where: { id: frigoId }, select: { id: true, name: true, location: true } }),
    prisma.fridgeStock.findMany({ where: { frigoId }, select: { dishId: true, quantity: true, expiryDate: true } }),
    prisma.sale.findMany({ where: { frigoId, soldAt: { gte: prevStart } }, orderBy: { soldAt: 'desc' } }),
    prisma.purchase.findMany({ where: { frigoId, purchasedAt: { gte: prevStart } }, orderBy: { purchasedAt: 'desc' } }),
    prisma.dish.findMany({ select: { id: true, name: true, price: true } }),
  ]);
  if (!fridge) { res.status(404).json({ error: 'Frigo introuvable' }); return; }

  const dish = new Map(dishes.map((d) => [d.id, d]));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const stock = stocks
    .map((s) => ({
      dishName: dish.get(s.dishId)?.name ?? s.dishId,
      quantity: s.quantity,
      expiryDate: s.expiryDate,
      expired: !!s.expiryDate && new Date(s.expiryDate) < today,
    }))
    .sort((a, b) => a.dishName.localeCompare(b.dishName));

  // Ventes détaillées (borne = casier connu ; achats app = casier inconnu).
  type SaleItem = { dishName: string; soldAt: Date; board: string | null; boxNumber: number | null; amountCents: number; mode: string; source: string };
  const items: SaleItem[] = [
    ...sales.map((s) => ({
      dishName: dish.get(s.dishId)?.name ?? s.dishId,
      soldAt: s.soldAt, board: s.board, boxNumber: s.boxNumber,
      amountCents: s.amount, mode: s.mode, source: 'borne',
    })),
    ...purchases.map((p) => ({
      dishName: dish.get(p.dishId)?.name ?? p.dishId,
      soldAt: p.purchasedAt, board: null, boxNumber: null,
      amountCents: Math.round((dish.get(p.dishId)?.price ?? 0) * 100), mode: 'paid', source: 'app',
    })),
  ].sort((a, b) => b.soldAt.getTime() - a.soldAt.getTime());

  const todaySales = items.filter((i) => i.soldAt >= dayStart);
  const prevSales = items.filter((i) => i.soldAt < dayStart);

  res.json({ fridge, stock, todaySales, prevSales });
}
