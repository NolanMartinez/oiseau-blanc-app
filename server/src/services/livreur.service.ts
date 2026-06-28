import { prisma } from '../utils/prisma';

const DAY_MS = 24 * 60 * 60 * 1000;
const SALES_WINDOW_DAYS = 14;
const COVER_DAYS = 5;

export type SuggestionPriority = 'URGENT' | 'REAPRO' | 'OPPORTUNITE' | 'OK';

export interface DishSuggestion {
  stockId: string | null;
  dishId: string;
  dishName: string;
  category: string;
  allergens: string[];
  hasImage: boolean;
  currentStock: number;
  expiryDate: Date | null;
  daysUntilExpiry: number | null;
  priority: SuggestionPriority;
  priorityReason: string;
  recommendedQty: number;
  salesCount14d: number;
}

export async function getSuggestions(frigoId: string): Promise<DishSuggestion[]> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - SALES_WINDOW_DAYS * DAY_MS);

  const [stocks, salesRows, allActiveDishes] = await Promise.all([
    prisma.fridgeStock.findMany({
      where: { frigoId },
      include: {
        dish: {
          select: {
            id: true, name: true, category: true, allergens: true,
            isActive: true, imageData: true, imageMimeType: true,
          },
        },
      },
    }),
    prisma.purchase.groupBy({
      by: ['dishId'],
      where: { frigoId, purchasedAt: { gte: windowStart } },
      _count: { _all: true },
    }),
    prisma.dish.findMany({
      where: { isActive: true },
      select: { id: true, name: true, category: true, allergens: true, imageData: true },
    }),
  ]);

  const salesMap = new Map<string, number>();
  for (const row of salesRows) {
    salesMap.set(row.dishId, row._count._all);
  }

  const stockedDishIds = new Set(stocks.map((s) => s.dishId));
  const results: DishSuggestion[] = [];

  // Process dishes already in this fridge
  for (const s of stocks) {
    if (!s.dish.isActive) continue;

    const count = salesMap.get(s.dishId) ?? 0;
    const salesRate = count / SALES_WINDOW_DAYS;
    const recommendedQty = Math.max(0, Math.ceil(salesRate * COVER_DAYS) - s.quantity);

    let daysUntilExpiry: number | null = null;
    if (s.expiryDate) {
      daysUntilExpiry = Math.ceil((s.expiryDate.getTime() - now.getTime()) / DAY_MS);
    }

    let priority: SuggestionPriority;
    let priorityReason: string;

    if (daysUntilExpiry !== null && daysUntilExpiry <= 3) {
      priority = 'URGENT';
      priorityReason = daysUntilExpiry <= 0
        ? 'DLC dépassée — à retirer'
        : `DLC dans ${daysUntilExpiry} jour${daysUntilExpiry > 1 ? 's' : ''}`;
    } else if (s.quantity === 0 && count > 0) {
      priority = 'URGENT';
      priorityReason = 'Rupture de stock — se vendait bien';
    } else if (s.quantity <= 2 && salesRate > 0) {
      priority = 'REAPRO';
      priorityReason = `Stock faible (${s.quantity}) — ${count} vente(s) sur 14j`;
    } else {
      priority = 'OK';
      priorityReason = `Stock suffisant (${s.quantity})`;
    }

    results.push({
      stockId: s.id,
      dishId: s.dishId,
      dishName: s.dish.name,
      category: s.dish.category,
      allergens: Array.isArray(s.dish.allergens) ? (s.dish.allergens as string[]) : [],
      hasImage: !!s.dish.imageData,
      currentStock: s.quantity,
      expiryDate: s.expiryDate,
      daysUntilExpiry,
      priority,
      priorityReason,
      recommendedQty,
      salesCount14d: count,
    });
  }

  // Dishes popular elsewhere but not in this fridge
  const globalSales = await prisma.purchase.groupBy({
    by: ['dishId'],
    where: { purchasedAt: { gte: windowStart }, NOT: { frigoId } },
    _count: { _all: true },
  });

  globalSales.sort((a, b) => (b._count._all ?? 0) - (a._count._all ?? 0));
  const top20 = globalSales.slice(0, 20);

  for (const row of top20) {
    if (stockedDishIds.has(row.dishId)) continue;
    const dish = allActiveDishes.find((d) => d.id === row.dishId);
    if (!dish) continue;
    const cnt = row._count._all ?? 0;

    results.push({
      stockId: null,
      dishId: dish.id,
      dishName: dish.name,
      category: dish.category,
      allergens: Array.isArray(dish.allergens) ? (dish.allergens as string[]) : [],
      hasImage: !!dish.imageData,
      currentStock: 0,
      expiryDate: null,
      daysUntilExpiry: null,
      priority: 'OPPORTUNITE',
      priorityReason: `Populaire dans d'autres frigos (${cnt} ventes/14j)`,
      recommendedQty: Math.ceil(cnt / SALES_WINDOW_DAYS * COVER_DAYS),
      salesCount14d: 0,
    });
  }

  const order: Record<SuggestionPriority, number> = {
    URGENT: 0, REAPRO: 1, OPPORTUNITE: 2, OK: 3,
  };
  results.sort((a, b) => order[a.priority] - order[b.priority]);

  return results;
}
