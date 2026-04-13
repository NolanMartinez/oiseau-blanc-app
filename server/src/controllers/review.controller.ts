import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

const createReviewSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(6).optional(),
  dish_id: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
}).refine((data) => data.email || data.phone, {
  message: 'Un email ou un numéro de téléphone est requis',
});

// POST /api/v1/public/reviews
export async function createReview(req: Request, res: Response): Promise<void> {
  const result = createReviewSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { email, phone, dish_id, rating, comment } = result.data;

  // Trouve ou crée le subscriber
  let subscriber = email
    ? await prisma.subscriber.findUnique({ where: { email } })
    : null;

  if (!subscriber) {
    subscriber = await prisma.subscriber.create({
      data: { email, phone },
    });
  }

  // Vérifie si cet abonné a déjà noté ce plat
  const existing = await prisma.review.findFirst({
    where: { subscriberId: subscriber.id, dishId: dish_id },
  });

  if (existing) {
    // Met à jour l'avis existant
    const updated = await prisma.review.update({
      where: { id: existing.id },
      data: { rating, comment },
    });
    res.json({ message: 'Avis mis à jour', review: updated });
    return;
  }

  const review = await prisma.review.create({
    data: {
      subscriberId: subscriber.id,
      dishId: dish_id,
      rating,
      comment,
    },
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
