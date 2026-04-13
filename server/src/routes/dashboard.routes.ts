import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { MOCK_FRIDGES } from '../services/bicom.mock';

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
  ] = await Promise.all([
    prisma.subscriber.count(),
    prisma.review.count(),
    prisma.preferenceSurvey.count({ where: { active: true } }),
    prisma.menuVote.count({ where: { voteDeadline: { gt: now } } }),

    // Avis par jour — 30 derniers jours
    prisma.$queryRaw<{ date: string; count: number }[]>`
      SELECT TO_CHAR(DATE("created_at"), 'YYYY-MM-DD') as date, COUNT(*)::int as count
      FROM reviews
      WHERE "created_at" >= ${thirtyDaysAgo}
      GROUP BY DATE("created_at")
      ORDER BY date ASC
    `,

    // Abonnés par jour — 30 derniers jours
    prisma.$queryRaw<{ date: string; count: number }[]>`
      SELECT TO_CHAR(DATE("created_at"), 'YYYY-MM-DD') as date, COUNT(*)::int as count
      FROM subscribers
      WHERE "created_at" >= ${thirtyDaysAgo}
      GROUP BY DATE("created_at")
      ORDER BY date ASC
    `,

    // Notes moyennes par plat
    prisma.review.groupBy({
      by: ['dishId'],
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  // Carte id → nom des plats (depuis le mock Bicom)
  const dishNameMap: Record<string, string> = {};
  for (const fridge of MOCK_FRIDGES) {
    for (const dish of fridge.dishes) {
      dishNameMap[dish.id] = dish.name;
    }
  }

  const ratingsByDish = ratingsByDishRaw
    .filter((r) => r._avg.rating !== null)
    .map((r) => ({
      dishId: r.dishId,
      name: dishNameMap[r.dishId] ?? r.dishId,
      average: Math.round((r._avg.rating ?? 0) * 10) / 10,
      count: r._count.rating,
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
  });
});

export default router;
