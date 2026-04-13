import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { MOCK_FRIDGES } from '../services/bicom.mock';
import type { SubscriberRequest } from '../middleware/userAuth';

const createPurchaseSchema = z.object({
  dishId: z.string().min(1),
  frigoId: z.string().min(1),
});

// POST /public/user/purchases
export async function recordPurchase(req: Request, res: Response): Promise<void> {
  const subscriberId = (req as SubscriberRequest).subscriberId;

  const result = createPurchaseSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { dishId, frigoId } = result.data;

  const fridge = MOCK_FRIDGES.find((f) => f.id === frigoId);
  const dish = fridge?.dishes.find((d) => d.id === dishId);
  if (!dish) {
    res.status(404).json({ error: 'Plat introuvable dans ce frigo' });
    return;
  }

  const purchase = await prisma.purchase.create({
    data: { subscriberId, dishId, frigoId },
  });

  res.status(201).json({ purchase });
}

// GET /public/user/purchases
export async function listMyPurchases(req: Request, res: Response): Promise<void> {
  const subscriberId = (req as SubscriberRequest).subscriberId;

  const [purchases, reviewedRows] = await Promise.all([
    prisma.purchase.findMany({
      where: { subscriberId },
      orderBy: { purchasedAt: 'desc' },
    }),
    prisma.review.findMany({
      where: { subscriberId },
      select: { dishId: true },
    }),
  ]);

  const reviewedDishIds = new Set(reviewedRows.map((r) => r.dishId));

  const dishMap: Record<string, { name: string; frigoName: string }> = {};
  for (const fridge of MOCK_FRIDGES) {
    for (const dish of fridge.dishes) {
      dishMap[dish.id] = { name: dish.name, frigoName: fridge.name };
    }
  }

  const enriched = purchases.map((p) => ({
    ...p,
    dishName: dishMap[p.dishId]?.name ?? p.dishId,
    frigoName: dishMap[p.dishId]?.frigoName ?? p.frigoId,
    hasReview: reviewedDishIds.has(p.dishId),
  }));

  res.json({ purchases: enriched });
}
