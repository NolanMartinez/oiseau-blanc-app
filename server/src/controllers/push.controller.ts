import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { broadcastPush } from '../services/push.service';
import type { SubscriberRequest } from '../middleware/userAuth';

// GET /public/user/push/vapid-key
export async function getVapidKey(_req: Request, res: Response): Promise<void> {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    res.status(503).json({ error: 'Push notifications non configurées' });
    return;
  }
  res.json({ publicKey: key });
}

const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
});

// POST /public/user/push/subscribe — enregistre la subscription push du subscriber
export async function savePushSubscription(req: Request, res: Response): Promise<void> {
  const subscriberId = (req as SubscriberRequest).subscriberId;

  const result = subscribeSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  await prisma.subscriber.update({
    where: { id: subscriberId },
    data: {
      pushToken: JSON.stringify(result.data.subscription),
      consentPush: true,
    },
  });

  res.json({ message: 'Abonnement push enregistré' });
}

// DELETE /public/user/push/subscribe — désabonnement
export async function removePushSubscription(req: Request, res: Response): Promise<void> {
  const subscriberId = (req as SubscriberRequest).subscriberId;

  await prisma.subscriber.update({
    where: { id: subscriberId },
    data: { pushToken: null, consentPush: false },
  });

  res.json({ message: 'Désabonnement effectué' });
}

const sendSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  url: z.string().optional(),
  tag: z.string().optional(),
});

// POST /admin/notifications/send — envoi broadcast (admin)
export async function sendBroadcast(req: Request, res: Response): Promise<void> {
  const result = sendSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const stats = await broadcastPush(result.data);
  res.json({ message: `${stats.sent} notification(s) envoyée(s) sur ${stats.total} abonnés` , ...stats });
}
