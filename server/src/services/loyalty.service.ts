import { prisma } from '../utils/prisma';
import { getLoyaltyConfig, type LoyaltyConfig } from './settings.service';

export interface LoyaltyStatus {
  subscriberId: string;
  points: number;
  pointsReward: number;
  eurosPerPoint: number;
  rewardAvailable: boolean; // le client a assez de points pour un repas offert
  enabled: boolean;
}

// Trouve (ou crée) un abonné à partir d'un email ou téléphone saisi à la borne.
export async function findOrCreateByContact(contactRaw: string) {
  const contact = contactRaw.trim();
  const isEmail = contact.includes('@');
  let subscriber = isEmail
    ? await prisma.subscriber.findUnique({ where: { email: contact } })
    : await prisma.subscriber.findFirst({ where: { phone: contact } });
  if (!subscriber) {
    subscriber = await prisma.subscriber.create({
      data: isEmail ? { email: contact } : { phone: contact },
    });
  }
  return subscriber;
}

function statusFrom(
  subscriberId: string,
  points: number,
  config: LoyaltyConfig,
): LoyaltyStatus {
  return {
    subscriberId,
    points,
    pointsReward: config.pointsReward,
    eurosPerPoint: config.eurosPerPoint,
    rewardAvailable: config.enabled && points >= config.pointsReward,
    enabled: config.enabled,
  };
}

// Consulte le solde d'un abonné par contact (borne : avant paiement).
export async function lookupByContact(contact: string): Promise<LoyaltyStatus> {
  const config = await getLoyaltyConfig();
  const subscriber = await findOrCreateByContact(contact);
  return statusFrom(subscriber.id, subscriber.loyaltyPoints, config);
}

// Crédite les points gagnés pour un achat (montant en centimes). No-op si fidélité désactivée.
export async function creditPurchase(
  contact: string,
  amountCents: number,
  frigoId: string,
  dishId: string,
): Promise<LoyaltyStatus | null> {
  const config = await getLoyaltyConfig();
  if (!config.enabled) return null;
  const subscriber = await findOrCreateByContact(contact);

  const euros = amountCents / 100;
  const gained = Math.floor(euros / Math.max(1, config.eurosPerPoint));
  if (gained <= 0) return statusFrom(subscriber.id, subscriber.loyaltyPoints, config);

  const [updated] = await prisma.$transaction([
    prisma.subscriber.update({
      where: { id: subscriber.id },
      data: { loyaltyPoints: { increment: gained } },
    }),
    prisma.loyaltyEntry.create({
      data: { subscriberId: subscriber.id, delta: gained, reason: 'purchase', frigoId, dishId },
    }),
  ]);
  return statusFrom(updated.id, updated.loyaltyPoints, config);
}

// Débite les points pour un repas offert (borne : le client échange sa récompense).
export async function redeemReward(
  contact: string,
  frigoId: string,
  dishId: string,
): Promise<{ ok: boolean; status: LoyaltyStatus }> {
  const config = await getLoyaltyConfig();
  const subscriber = await findOrCreateByContact(contact);
  if (!config.enabled || subscriber.loyaltyPoints < config.pointsReward) {
    return { ok: false, status: statusFrom(subscriber.id, subscriber.loyaltyPoints, config) };
  }
  const [updated] = await prisma.$transaction([
    prisma.subscriber.update({
      where: { id: subscriber.id },
      data: { loyaltyPoints: { decrement: config.pointsReward } },
    }),
    prisma.loyaltyEntry.create({
      data: {
        subscriberId: subscriber.id,
        delta: -config.pointsReward,
        reason: 'reward',
        frigoId,
        dishId,
      },
    }),
  ]);
  return { ok: true, status: statusFrom(updated.id, updated.loyaltyPoints, config) };
}
