import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { getFridgeMeta } from '../services/bicom.mock';

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function toMonthKey(d: Date): string {
  return d.toISOString().slice(0, 7); // YYYY-MM
}

function parseRange(from: unknown, to: unknown): { fromDate: Date; toDate: Date } | null {
  if (typeof from !== 'string' || typeof to !== 'string') return null;
  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return null;
  return { fromDate, toDate };
}

interface EnrichedPurchase {
  id: string;
  dishId: string;
  frigoId: string;
  purchasedAt: Date;
  dishName: string;
  dishCategory: string;
  dishPrice: number;
}

// Regroupe DEUX sources : les ventes remontées par la borne (table `ventes` /
// modèle Sale, montant réellement payé en centimes) ET les achats via l'app
// abonnés (table `purchases`). Sans ça, les paiements de la borne n'apparaissaient
// pas dans l'état des ventes.
async function fetchPurchases(fromDate: Date, toDate: Date): Promise<EnrichedPurchase[]> {
  const [purchases, sales, dishes] = await Promise.all([
    prisma.purchase.findMany({
      where: { purchasedAt: { gte: fromDate, lte: toDate } },
    }),
    prisma.sale.findMany({
      where: { soldAt: { gte: fromDate, lte: toDate } },
    }),
    prisma.dish.findMany({ select: { id: true, name: true, category: true, price: true } }),
  ]);

  const dishMap = new Map(dishes.map((d) => [d.id, d]));

  const fromPurchases: EnrichedPurchase[] = purchases.map((p) => {
    const dish = dishMap.get(p.dishId);
    return {
      id: p.id,
      dishId: p.dishId,
      frigoId: p.frigoId,
      purchasedAt: p.purchasedAt,
      dishName: dish?.name ?? p.dishId,
      dishCategory: dish?.category ?? '',
      dishPrice: dish?.price ?? 0,
    };
  });

  const fromSales: EnrichedPurchase[] = sales.map((s) => {
    const dish = dishMap.get(s.dishId);
    return {
      id: s.id,
      dishId: s.dishId,
      frigoId: s.frigoId,
      purchasedAt: s.soldAt,
      dishName: dish?.name ?? s.dishId,
      dishCategory: dish?.category ?? '',
      dishPrice: s.amount / 100, // montant réellement payé (centimes → euros)
    };
  });

  return [...fromPurchases, ...fromSales].sort(
    (a, b) => a.purchasedAt.getTime() - b.purchasedAt.getTime(),
  );
}

// GET /api/v1/admin/accounting/stats?from=&to=
export async function getAccountingStats(req: Request, res: Response): Promise<void> {
  const range = parseRange(req.query['from'], req.query['to']);
  if (!range) {
    res.status(400).json({ error: 'Paramètres from et to requis (format YYYY-MM-DD)' });
    return;
  }
  const { fromDate, toDate } = range;

  const purchases = await fetchPurchases(fromDate, toDate);

  const totalTransactions = purchases.length;
  const totalRevenue = purchases.reduce((sum, p) => sum + p.dishPrice, 0);

  // Breakdown : par jour si période ≤ 31j, par mois sinon
  const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / DAY_MS);
  const useMonthly = diffDays > 31;

  const breakdownMap = new Map<string, { count: number; revenue: number }>();
  for (const p of purchases) {
    const key = useMonthly ? toMonthKey(p.purchasedAt) : toDateKey(p.purchasedAt);
    const entry = breakdownMap.get(key) ?? { count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += p.dishPrice;
    breakdownMap.set(key, entry);
  }

  const breakdown = Array.from(breakdownMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, { count, revenue }]) => ({
      period,
      count,
      revenue: Math.round(revenue * 100) / 100,
    }));

  res.json({
    totalTransactions,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    breakdown,
    granularity: useMonthly ? 'monthly' : 'daily',
  });
}

// GET /api/v1/admin/accounting/export?from=&to=&granularity=detail|daily|monthly
export async function exportAccounting(req: Request, res: Response): Promise<void> {
  const range = parseRange(req.query['from'], req.query['to']);
  if (!range) {
    res.status(400).json({ error: 'Paramètres from et to requis (format YYYY-MM-DD)' });
    return;
  }
  const { fromDate, toDate } = range;
  const granularity = (req.query['granularity'] as string) ?? 'detail';

  const purchases = await fetchPurchases(fromDate, toDate);

  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const fmt = (from: Date) => from.toISOString().slice(0, 10).replace(/-/g, '');
  const fileDate = `${fmt(fromDate)}_${fmt(toDate)}`;

  let csv = '';

  if (granularity === 'daily') {
    const map = new Map<string, { count: number; revenue: number }>();
    for (const p of purchases) {
      const key = toDateKey(p.purchasedAt);
      const e = map.get(key) ?? { count: 0, revenue: 0 };
      e.count += 1;
      e.revenue += p.dishPrice;
      map.set(key, e);
    }
    const header = ['Date', 'Nb ventes', 'CA (€)'].map(escape).join(',');
    const rows = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { count, revenue }]) =>
        [date, String(count), (Math.round(revenue * 100) / 100).toFixed(2)].map(escape).join(','),
      );
    csv = [header, ...rows].join('\r\n');
    res.setHeader('Content-Disposition', `attachment; filename="ventes_par_jour_${fileDate}.csv"`);

  } else if (granularity === 'monthly') {
    const map = new Map<string, { count: number; revenue: number }>();
    for (const p of purchases) {
      const key = toMonthKey(p.purchasedAt);
      const e = map.get(key) ?? { count: 0, revenue: 0 };
      e.count += 1;
      e.revenue += p.dishPrice;
      map.set(key, e);
    }
    const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const header = ['Mois', 'Nb ventes', 'CA (€)'].map(escape).join(',');
    const rows = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, { count, revenue }]) => {
        const [year, month] = ym.split('-');
        const label = `${MONTHS_FR[parseInt(month) - 1]} ${year}`;
        return [label, String(count), (Math.round(revenue * 100) / 100).toFixed(2)].map(escape).join(',');
      });
    csv = [header, ...rows].join('\r\n');
    res.setHeader('Content-Disposition', `attachment; filename="ventes_par_mois_${fileDate}.csv"`);

  } else {
    // detail (default)
    const header = ['Date', 'Heure', 'Plat', 'Catégorie', 'Frigo', 'Prix (€)'].map(escape).join(',');
    const rows = purchases.map((p) => {
      const d = p.purchasedAt;
      const date = toDateKey(d);
      const hour = d.toISOString().slice(11, 16);
      const fridgeName = getFridgeMeta(p.frigoId)?.name ?? p.frigoId;
      return [
        date,
        hour,
        p.dishName,
        p.dishCategory,
        fridgeName,
        p.dishPrice.toFixed(2),
      ].map(escape).join(',');
    });
    csv = [header, ...rows].join('\r\n');
    res.setHeader('Content-Disposition', `attachment; filename="ventes_${fileDate}.csv"`);
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.send('﻿' + csv);
}
