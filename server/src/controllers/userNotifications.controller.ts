import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import type { SubscriberRequest } from '../middleware/userAuth';

// GET /public/user/notifications
export async function listNotifications(req: Request, res: Response): Promise<void> {
  const subscriberId = (req as SubscriberRequest).subscriberId;

  const [notifications, subscriber] = await Promise.all([
    prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.subscriber.findUnique({
      where: { id: subscriberId },
      select: { notificationsSeenAt: true },
    }),
  ]);

  const seenAt = subscriber?.notificationsSeenAt;
  const unreadCount = seenAt
    ? notifications.filter((n) => n.createdAt > seenAt).length
    : notifications.length;

  res.json({ notifications, unreadCount });
}

// PATCH /public/user/notifications/seen
export async function markSeen(req: Request, res: Response): Promise<void> {
  const subscriberId = (req as SubscriberRequest).subscriberId;
  await prisma.subscriber.update({
    where: { id: subscriberId },
    data: { notificationsSeenAt: new Date() },
  });
  res.json({ ok: true });
}
