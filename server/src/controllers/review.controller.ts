import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import type { SubscriberRequest } from '../middleware/userAuth';

const createReviewSchema = z.object({
  dish_id: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

// POST /api/v1/public/reviews — requiert auth subscriber + achat préalable
export async function createReview(req: Request, res: Response): Promise<void> {
  const subscriberId = (req as SubscriberRequest).subscriberId;

  const result = createReviewSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { dish_id, rating, comment } = result.data;

  // Vérifie que le subscriber a bien acheté ce plat
  // TODO (Bicom) : remplacer par l'historique Bicom une fois l'API connectée
  const hasPurchased = await prisma.purchase.findFirst({
    where: { subscriberId, dishId: dish_id },
  });
  if (!hasPurchased) {
    res.status(403).json({ error: 'Vous ne pouvez noter que les plats que vous avez pris.' });
    return;
  }

  // Mise à jour si avis existant, sinon création
  const existing = await prisma.review.findFirst({
    where: { subscriberId, dishId: dish_id },
  });

  if (existing) {
    const updated = await prisma.review.update({
      where: { id: existing.id },
      data: { rating, comment },
    });
    res.json({ message: 'Avis mis à jour', review: updated });
    return;
  }

  const review = await prisma.review.create({
    data: { subscriberId, dishId: dish_id, rating, comment },
  });

  res.status(201).json({ message: 'Avis enregistré', review });
}

// GET /api/v1/admin/reviews
export async function listReviews(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const dishId = req.query['dish_id'] as string | undefined;
  const limit = 20;
  const skip = (page - 1) * limit;

  const where = dishId ? { dishId } : {};

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        subscriber: {
          select: { email: true, phone: true },
        },
      },
    }),
    prisma.review.count({ where }),
  ]);

  // Moyenne globale ou par plat
  const avg = await prisma.review.aggregate({
    where,
    _avg: { rating: true },
    _count: true,
  });

  res.json({
    reviews,
    total,
    page,
    pages: Math.ceil(total / limit),
    average: avg._avg.rating ? Math.round(avg._avg.rating * 10) / 10 : null,
  });
}

// DELETE /api/v1/admin/reviews/:id
export async function deleteReview(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  await prisma.review.delete({ where: { id } });
  res.status(204).send();
}

// GET /api/v1/admin/reviews/export
export async function exportReviews(_req: Request, res: Response): Promise<void> {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: 'desc' },
    include: { subscriber: { select: { email: true, phone: true } } },
  });

  // Carte id → nom depuis le mock Bicom (import inline pour éviter la dépendance circulaire)
  const { MOCK_FRIDGES } = await import('../services/bicom.mock');
  const dishNameMap: Record<string, string> = {};
  for (const fridge of MOCK_FRIDGES) {
    for (const dish of fridge.dishes) {
      dishNameMap[dish.id] = dish.name;
    }
  }

  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ['Plat', 'Note', 'Commentaire', 'Email/Téléphone', 'Date'].map(escape).join(',');
  const rows = reviews.map((r) =>
    [
      dishNameMap[r.dishId] ?? r.dishId,
      String(r.rating),
      r.comment ?? '',
      r.subscriber.email ?? r.subscriber.phone ?? '',
      new Date(r.createdAt).toLocaleDateString('fr-FR'),
    ].map(escape).join(','),
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="avis.csv"');
  res.send('\uFEFF' + [header, ...rows].join('\r\n'));
}
