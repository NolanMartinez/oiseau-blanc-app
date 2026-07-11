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

// Coordonnées de l'entreprise pour les reçus (justificatifs d'achat).
export interface CompanyInfo {
  name: string;
  address: string;
  siret: string;
  tvaNumber: string; // n° TVA intracommunautaire (facultatif)
  tvaRate: number; // taux de TVA en % appliqué aux plats (ex. 10)
}

const COMPANY_KEY = 'company';
const DEFAULT_COMPANY: CompanyInfo = {
  name: "L'Oiseau Blanc Traiteur",
  address: '59 rue Roger Salengro, 59770 Marly',
  siret: '',
  tvaNumber: '',
  tvaRate: 10,
};

export async function getCompanyInfo(): Promise<CompanyInfo> {
  const row = await prisma.appSetting.findUnique({ where: { key: COMPANY_KEY } });
  if (!row) return { ...DEFAULT_COMPANY };
  try {
    return { ...DEFAULT_COMPANY, ...(JSON.parse(row.value) as Partial<CompanyInfo>) };
  } catch {
    return { ...DEFAULT_COMPANY };
  }
}

export async function setCompanyInfo(info: CompanyInfo): Promise<CompanyInfo> {
  const value = JSON.stringify(info);
  await prisma.appSetting.upsert({
    where: { key: COMPANY_KEY },
    create: { key: COMPANY_KEY, value },
    update: { value },
  });
  return info;
}
