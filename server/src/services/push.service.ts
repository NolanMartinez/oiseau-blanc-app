import webpush from 'web-push';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { sendNotificationEmail } from './email.service';

// Envoie la même notification par EMAIL aux abonnés ayant consenti (email non nul).
// `where` restreint la cible (ex. frigo favori) ; best-effort, ne bloque jamais.
async function emailSubscribers(
  where: Prisma.SubscriberWhereInput,
  payload: PushPayload,
): Promise<number> {
  const subs = await prisma.subscriber.findMany({ where, select: { email: true } });
  const results = await Promise.allSettled(
    subs.map((s) => sendNotificationEmail(s.email as string, payload)),
  );
  return results.filter((r) => r.status === 'fulfilled' && r.value).length;
}

export function initVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    logger.warn('Clés VAPID non configurées — push notifications désactivées');
    return;
  }

  webpush.setVapidDetails('mailto:contact@oiseaublanc.fr', publicKey, privateKey);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Envoie une notification push à un subscriber unique.
 * Retourne false si la subscription est invalide (expired / unsubscribed).
 */
export async function sendToSubscriber(subscriberId: string, payload: PushPayload): Promise<boolean> {
  const subscriber = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    select: { pushToken: true, consentPush: true },
  });

  if (!subscriber?.consentPush || !subscriber.pushToken) return false;

  let subscription: webpush.PushSubscription;
  try {
    subscription = JSON.parse(subscriber.pushToken);
  } catch {
    return false;
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 410 || status === 404) {
      // Subscription expirée — on nettoie
      await prisma.subscriber.update({
        where: { id: subscriberId },
        data: { pushToken: null, consentPush: false },
      });
    } else {
      logger.error({ subscriberId, err }, 'Erreur envoi push');
    }
    return false;
  }
}

/**
 * Broadcast à tous les subscribers ayant consentPush = true.
 * Retourne le nombre de notifications envoyées avec succès.
 */
export async function broadcastPush(payload: PushPayload): Promise<{ sent: number; total: number }> {
  const subscribers = await prisma.subscriber.findMany({
    where: { consentPush: true, pushToken: { not: null } },
    select: { id: true },
  });

  const results = await Promise.allSettled(
    subscribers.map((s) => sendToSubscriber(s.id, payload))
  );

  // + envoi par email aux abonnés ayant activé les emails.
  await emailSubscribers({ consentEmail: true, email: { not: null } }, payload);

  const sent = results.filter((r) => r.status === 'fulfilled' && r.value).length;
  return { sent, total: subscribers.length };
}

/**
 * Notifie uniquement les abonnés dont le frigo favori est `frigoId`
 * (utilisé pour l'alerte automatique « nouveau plat »).
 */
export async function notifyFridgeSubscribers(
  frigoId: string,
  payload: PushPayload,
): Promise<{ sent: number; total: number }> {
  const subscribers = await prisma.subscriber.findMany({
    where: { favoriId: frigoId, consentPush: true, pushToken: { not: null } },
    select: { id: true },
  });

  const results = await Promise.allSettled(
    subscribers.map((s) => sendToSubscriber(s.id, payload)),
  );

  // + envoi par email aux abonnés de ce frigo ayant activé les emails (promo, nouveau plat).
  await emailSubscribers({ favoriId: frigoId, consentEmail: true, email: { not: null } }, payload);

  const sent = results.filter((r) => r.status === 'fulfilled' && r.value).length;
  return { sent, total: subscribers.length };
}
