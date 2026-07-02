import { prisma } from '../utils/prisma';

// Réglages de fidélité, modifiables depuis l'admin. Valeurs par défaut si absentes.
export interface LoyaltyConfig {
  enabled: boolean;
  eurosPerPoint: number; // nb d'euros dépensés pour gagner 1 point (1 = 1€ → 1 pt)
  pointsReward: number; // points nécessaires pour un repas offert
}

const LOYALTY_KEY = 'loyalty';
const DEFAULT_LOYALTY: LoyaltyConfig = { enabled: true, eurosPerPoint: 1, pointsReward: 100 };

export async function getLoyaltyConfig(): Promise<LoyaltyConfig> {
  const row = await prisma.appSetting.findUnique({ where: { key: LOYALTY_KEY } });
  if (!row) return { ...DEFAULT_LOYALTY };
  try {
    return { ...DEFAULT_LOYALTY, ...(JSON.parse(row.value) as Partial<LoyaltyConfig>) };
  } catch {
    return { ...DEFAULT_LOYALTY };
  }
}

export async function setLoyaltyConfig(config: LoyaltyConfig): Promise<LoyaltyConfig> {
  const value = JSON.stringify(config);
  await prisma.appSetting.upsert({
    where: { key: LOYALTY_KEY },
    create: { key: LOYALTY_KEY, value },
    update: { value },
  });
  return config;
}
