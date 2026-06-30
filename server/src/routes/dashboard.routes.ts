import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../utils/prisma';

const router = Router();
router.use(requireAuth);

// Génère un tableau de {date, count} pour les N derniers jours
// en remplissant les jours sans données avec 0
function fillDailyArray(
  raw: { date: string; count: number }[],
  from: Date,
  to: Date,
): { date: string; count: number }[] {
  const map: Record<string, number> = {};
  for (const r of raw) {
    map[r.date] = Number(r.count);
  }

  const result: { date: string; count: number }[] = [];
  const current = new Date(from);
  current.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    const key = current.toISOString().slice(0, 10);
    result.push({ date: key, count: map[key] ?? 0 });
    current.setDate(current.getDate() + 1);
  }
  return result;
}

router.get('/stats', async (_req, res) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [
    subscribers,
    reviews,
    activeSurveys,
    openVotes,
    reviewsRaw,
    subscribersRaw,
    ratingsByDishRaw,
    dishes,
    salesCount,
    revenueAgg,
    salesRaw,
    salesByDishRaw,
  ] = await Promise.all([
    prisma.subscriber.count(),
    prisma.review.count(),
    prisma.preferenceSurvey.count({ where: { active: true } }),
    prisma.menuVote.count({ where: { voteDeadline: { gt: now } } }),

    // Avis par jour — 30 derniers jours
    prisma.$queryRaw<{ date: string; count: number }[]>`
      SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, COUNT(*) as count
      FROM avis
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `,

    // Abonnés par jour — 30 derniers jours
    prisma.$queryRaw<{ date: string; count: number }[]>`
      SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, COUNT(*) as count
      FROM abonnes
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `,

    // Notes moyennes par plat
    prisma.review.groupBy({
      by: ['dishId'],
      _avg: { rating: true },
      _count: { rating: true },
    }),

    // Noms des plats (en base)
    prisma.dish.findMany({ select: { id: true, name: true } }),

    // Ventes : total, chiffre d'affaires, par jour, par plat
    prisma.sale.count(),
    prisma.sale.aggregate({ _sum: { amount: true } }),
    prisma.$queryRaw<{ date: string; count: number }[]>`
      SELECT DATE_FORMAT(sold_at, '%Y-%m-%d') as date, COUNT(*) as count
      FROM ventes
      WHERE sold_at >= ${thirtyDaysAgo}
      GROUP BY DATE(sold_at)
      ORDER BY date ASC
    `,
    prisma.sale.groupBy({ by: ['dishId'], _count: { _all: true }, _sum: { amount: true } }),
  ]);

  // Carte id → nom des plats
  const dishNameMap = new Map(dishes.map((d) => [d.id, d.name]));

  const ratingsByDish = ratingsByDishRaw
    .filter((r) => r._avg.rating !== null)
    .map((r) => ({
      dishId: r.dishId,
      name: dishNameMap.get(r.dishId) ?? r.dishId,
      average: Math.round((r._avg.rating ?? 0) * 10) / 10,
      count: r._count.rating,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topSellers = salesByDishRaw
    .map((s) => ({
      dishId: s.dishId,
      name: dishNameMap.get(s.dishId) ?? s.dishId,
      count: s._count._all,
      revenue: Math.round((s._sum.amount ?? 0)) / 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  res.json({
    subscribers,
    reviews,
    activeSurveys,
    openVotes,
    reviewsLast30Days: fillDailyArray(reviewsRaw, thirtyDaysAgo, now),
    subscribersLast30Days: fillDailyArray(subscribersRaw, thirtyDaysAgo, now),
    ratingsByDish,
    salesCount,
    revenue: Math.round(revenueAgg._sum.amount ?? 0) / 100,
    salesLast30Days: fillDailyArray(salesRaw, thirtyDaysAgo, now),
    topSellers,
  });
});

export default router;
