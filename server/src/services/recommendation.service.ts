import { prisma } from '../utils/prisma';
import { getFridgeMeta } from './bicom.mock';

// --- Constantes ajustables ---
const PROMO_HORIZON_DAYS = 5; // au-delà, pas de suggestion de promo
const ADVICE_WINDOW_DAYS = 14; // fenêtre d'analyse de consommation
const LOW_STOCK_DAYS = 2; // sous ce nb de jours de stock → augmenter
const HIGH_STOCK_DAYS = 10; // au-dessus → réduire
const MIN_SALES_FOR_ADVICE = 3; // ventes mini pour conseiller fiablement
const DAY_MS = 24 * 60 * 60 * 1000;

const round2 = (n: number) => Math.round(n * 100) / 100;

// Remise suggérée selon le nombre de jours avant péremption
function suggestedPromo(daysLeft: number): number {
  if (daysLeft <= 1) return 40;
  if (daysLeft === 2) return 30;
  if (daysLeft === 3) return 20;
  return 10; // 4-5 jours
}

export interface PromoSuggestion {
  stockId: string;
  frigoId: string;
  frigoName: string;
  dishId: string;
  dishName: string;
  quantity: number;
  expiryDate: Date;
  daysLeft: number;
  expired: boolean;
  suggestedPromoPercent: number | null;
  price: number;
  promoPrice: number | null;
  urgency: 'haute' | 'moyenne';
}

export interface StockAdvice {
  stockId: string;
  frigoId: string;
  frigoName: string;
  dishId: string;
  dishName: string;
  category: string;
  quantity: number;
  expiryDate: Date | null;
  type: 'augmenter' | 'reduire' | 'surveiller';
  message: string;
  recommendedQuantity: number | null;
  salesCount: number;
  crossNote: string | null;
}

export async function getRecommendations(): Promise<{
  promoSuggestions: PromoSuggestion[];
  stockAdvice: StockAdvice[];
}> {
  const now = new Date();
  const fridgeName = (id: string) => getFridgeMeta(id)?.name ?? id;

  const stocks = await prisma.fridgeStock.findMany({
    include: {
      dish: {
        select: { id: true, name: true, category: true, price: true, isActive: true },
      },
    },
  });
  const activeStocks = stocks.filter((s) => s.dish.isActive);

  // --- Promos suggérées ---
  const promoSuggestions: PromoSuggestion[] = [];
  for (const s of activeStocks) {
    if (s.quantity <= 0 || !s.expiryDate || s.promoPercent != null) continue;
    const daysLeft = Math.ceil((s.expiryDate.getTime() - now.getTime()) / DAY_MS);
    if (daysLeft > PROMO_HORIZON_DAYS) continue;

    const expired = daysLeft <= 0;
    const pct = expired ? null : suggestedPromo(daysLeft);
    promoSuggestions.push({
      stockId: s.id,
      frigoId: s.frigoId,
      frigoName: fridgeName(s.frigoId),
      dishId: s.dish.id,
      dishName: s.dish.name,
      quantity: s.quantity,
      expiryDate: s.expiryDate,
      daysLeft,
      expired,
      suggestedPromoPercent: pct,
      price: s.dish.price,
      promoPrice: pct ? round2(s.dish.price * (1 - pct / 100)) : null,
      urgency: expired || daysLeft <= 2 || s.quantity >= 6 ? 'haute' : 'moyenne',
    });
  }
  promoSuggestions.sort((a, b) => {
    if (a.expired !== b.expired) return a.expired ? -1 : 1;
    return a.daysLeft - b.daysLeft;
  });

  // --- Conseils de stock ---
  const since = new Date(now.getTime() - ADVICE_WINDOW_DAYS * DAY_MS);
  const sales = await prisma.purchase.groupBy({
    by: ['frigoId', 'dishId'],
    where: { purchasedAt: { gte: since } },
    _count: { _all: true },
  });
  // Aucun achat sur la fenêtre → le moteur de consommation n'a aucun signal :
  // on ne conseille rien plutôt que de tout signaler comme « dormant ».
  if (sales.length === 0) {
    return { promoSuggestions, stockAdvice: [] };
  }

  const salesMap = new Map<string, number>();
  for (const row of sales) {
    salesMap.set(`${row.frigoId}|${row.dishId}`, row._count._all);
  }
  const rateOf = (frigoId: string, dishId: string) =>
    (salesMap.get(`${frigoId}|${dishId}`) ?? 0) / ADVICE_WINDOW_DAYS;

  // Regroupe les frigos qui stockent chaque plat (pour la comparaison inter-frigo)
  const fridgesByDish = new Map<string, string[]>();
  for (const s of activeStocks) {
    const list = fridgesByDish.get(s.dish.id) ?? [];
    list.push(s.frigoId);
    fridgesByDish.set(s.dish.id, list);
  }

  const stockAdvice: StockAdvice[] = [];
  for (const s of activeStocks) {
    // Pas de stock = rien à conseiller (évite le bruit, ex. frigo hors ligne vide)
    if (s.quantity === 0) continue;

    const count = salesMap.get(`${s.frigoId}|${s.dish.id}`) ?? 0;
    const rate = count / ADVICE_WINDOW_DAYS;
    const daysOfStock = rate > 0 ? s.quantity / rate : Infinity;

    let type: StockAdvice['type'] | 'ok' = 'ok';
    let message = '';
    let recommendedQuantity: number | null = null;

    if (count === 0 && s.quantity > 0) {
      type = 'reduire';
      recommendedQuantity = 0;
      message = `Aucune vente depuis ${ADVICE_WINDOW_DAYS} jours — stock dormant.`;
    } else if (count > 0 && count < MIN_SALES_FOR_ADVICE) {
      type = 'surveiller';
      message = `Seulement ${count} vente(s) sur ${ADVICE_WINDOW_DAYS} jours — données insuffisantes pour conseiller.`;
    } else if (daysOfStock < LOW_STOCK_DAYS) {
      type = 'augmenter';
      recommendedQuantity = Math.ceil(rate * 7);
      message = `Se vend vite (${count} ventes/${ADVICE_WINDOW_DAYS}j) — stock épuisé en ~${daysOfStock.toFixed(1)} j.`;
    } else if (daysOfStock > HIGH_STOCK_DAYS) {
      type = 'reduire';
      recommendedQuantity = Math.max(1, Math.ceil(rate * 5));
      message = `Se vend lentement (${count} ventes/${ADVICE_WINDOW_DAYS}j) — stock actuel pour ~${Math.round(daysOfStock)} j.`;
    }

    // Comparaison inter-frigo : ce plat marche-t-il bien mieux ailleurs ?
    let crossNote: string | null = null;
    const otherFridges = (fridgesByDish.get(s.dish.id) ?? []).filter((f) => f !== s.frigoId);
    if (otherFridges.length > 0) {
      const otherRates = otherFridges.map((f) => rateOf(f, s.dish.id));
      const avgOther = otherRates.reduce((a, b) => a + b, 0) / otherRates.length;
      if (avgOther > 0 && avgOther > 2 * rate) {
        crossNote = 'Ce plat se vend nettement mieux dans d\'autres frigos.';
      }
    }

    if (type === 'ok') continue;
    stockAdvice.push({
      stockId: s.id,
      frigoId: s.frigoId,
      frigoName: fridgeName(s.frigoId),
      dishId: s.dish.id,
      dishName: s.dish.name,
      category: s.dish.category,
      quantity: s.quantity,
      expiryDate: s.expiryDate,
      type,
      message,
      recommendedQuantity,
      salesCount: count,
      crossNote,
    });
  }

  const order: Record<StockAdvice['type'], number> = { augmenter: 0, reduire: 1, surveiller: 2 };
  stockAdvice.sort((a, b) => order[a.type] - order[b.type]);

  return { promoSuggestions, stockAdvice };
}
