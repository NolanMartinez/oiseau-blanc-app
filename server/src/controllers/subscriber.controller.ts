import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

const subscribeSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(6).optional(),
  consent_email: z.boolean().default(false),
  consent_push: z.boolean().default(false),
}).refine((data) => data.email || data.phone, {
  message: 'Un email ou un numéro de téléphone est requis',
});

// POST /api/v1/public/subscribe
export async function subscribe(req: Request, res: Response): Promise<void> {
  const result = subscribeSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { email, phone, consent_email, consent_push } = result.data;

  // Vérifie si l'email existe déjà
  if (email) {
    const existing = await prisma.subscriber.findUnique({ where: { email } });
    if (existing) {
      // Met à jour les consentements si déjà inscrit
      const updated = await prisma.subscriber.update({
        where: { email },
        data: { consentEmail: consent_email, consentPush: consent_push, phone: phone ?? existing.phone },
        select: { id: true, email: true, phone: true, consentEmail: true, consentPush: true },
      });
      res.json({ message: 'Préférences mises à jour', subscriber: updated });
      return;
    }
  }

  const subscriber = await prisma.subscriber.create({
    data: {
      email,
      phone,
      consentEmail: consent_email,
      consentPush: consent_push,
    },
    select: { id: true, email: true, phone: true, consentEmail: true, consentPush: true },
  });

  res.status(201).json({ message: 'Inscription réussie', subscriber });
}

// GET /api/v1/admin/subscribers
export async function listSubscribers(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = 20;
  const skip = (page - 1) * limit;

  const [subscribers, total] = await Promise.all([
    prisma.subscriber.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        phone: true,
        consentEmail: true,
        consentPush: true,
        createdAt: true,
        _count: { select: { reviews: true } },
      },
    }),
    prisma.subscriber.count(),
  ]);

  res.json({ subscribers, total, page, pages: Math.ceil(total / limit) });
}

// DELETE /api/v1/admin/subscribers/:id
export async function deleteSubscriber(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  await prisma.subscriber.delete({ where: { id } });
  res.status(204).send();
}
