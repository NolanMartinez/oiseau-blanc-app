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

// Génère un code fidélité à 6 chiffres unique (retry en cas de collision).
export async function ensureLoyaltyCode(subscriberId: string): Promise<string> {
  const existing = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    select: { loyaltyCode: true },
  });
  if (existing?.loyaltyCode) return existing.loyaltyCode;

  for (let i = 0; i < 20; i++) {
    const code = String(Math.floor(100000 + Math.random() * 900000)); // 100000..999999
    const clash = await prisma.subscriber.findUnique({ where: { loyaltyCode: code } });
    if (!clash) {
      await prisma.subscriber.update({ where: { id: subscriberId }, data: { loyaltyCode: code } });
      return code;
    }
  }
  throw new Error('Impossible de générer un code fidélité unique');
}

function statusFrom(subscriberId: string, points: number, config: LoyaltyConfig): LoyaltyStatus {
  return {
    subscriberId,
    points,
    pointsReward: config.pointsReward,
    eurosPerPoint: config.eurosPerPoint,
    rewardAvailable: config.enabled && points >= config.pointsReward,
    enabled: config.enabled,
  };
}

async function findByCode(code: string) {
  return prisma.subscriber.findUnique({ where: { loyaltyCode: code.trim() } });
}

// Consulte le solde par code (borne : avant paiement). null si code inconnu.
export async function lookupByCode(code: string): Promise<LoyaltyStatus | null> {
  const config = await getLoyaltyConfig();
  const subscriber = await findByCode(code);
  if (!subscriber) return null;
  return statusFrom(subscriber.id, subscriber.loyaltyPoints, config);
}

// Crédite les points gagnés pour un achat (montant en centimes). null si code inconnu/désactivé.
export async function creditPurchaseByCode(
  code: string,
  amountCents: number,
  frigoId: string,
  dishId: string,
): Promise<LoyaltyStatus | null> {
  const config = await getLoyaltyConfig();
  if (!config.enabled) return null;
  const subscriber = await findByCode(code);
  if (!subscriber) return null;

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
export async function redeemRewardByCode(
  code: string,
  frigoId: string,
  dishId: string,
): Promise<{ ok: boolean; status: LoyaltyStatus } | null> {
  const config = await getLoyaltyConfig();
  const subscriber = await findByCode(code);
  if (!subscriber) return null;
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
