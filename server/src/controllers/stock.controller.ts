import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { getFridgeMeta } from '../services/bicom.mock';

const dateSchema = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'Date invalide' });

const upsertStockSchema = z.object({
  frigoId: z.string().min(1),
  dishId: z.string().min(1),
  quantity: z.number().int().min(0).default(0),
  expiryDate: dateSchema.nullable().optional(),
});

const updateStockSchema = z.object({
  quantity: z.number().int().min(0).optional(),
  expiryDate: dateSchema.nullable().optional(),
  promoPercent: z.number().int().min(0).max(95).nullable().optional(),
});

// POST /api/v1/admin/stock — affecte (ou met à jour) un plat dans un frigo
export async function upsertStock(req: Request, res: Response): Promise<void> {
  const result = upsertStockSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }
  const { frigoId, dishId, quantity, expiryDate } = result.data;

  if (!getFridgeMeta(frigoId)) {
    res.status(404).json({ error: 'Frigo introuvable' });
    return;
  }
  const dish = await prisma.dish.findUnique({ where: { id: dishId }, select: { isActive: true } });
  if (!dish) {
    res.status(404).json({ error: 'Plat introuvable' });
    return;
  }
  if (!dish.isActive) {
    res.status(400).json({ error: 'Ce plat est désactivé' });
    return;
  }

  const expiry = expiryDate ? new Date(expiryDate) : null;
  const stock = await prisma.fridgeStock.upsert({
    where: { frigoId_dishId: { frigoId, dishId } },
    create: { frigoId, dishId, quantity, expiryDate: expiry },
    update: { quantity, expiryDate: expiry },
  });
  res.status(201).json({ stock });
}

// PATCH /api/v1/admin/stock/:id — modifie quantité / DLC / promo (applique une promo validée)
export async function updateStock(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const result = updateStockSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const existing = await prisma.fridgeStock.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    res.status(404).json({ error: 'Entrée de stock introuvable' });
    return;
  }

  const { quantity, expiryDate, promoPercent } = result.data;
  const data: { quantity?: number; expiryDate?: Date | null; promoPercent?: number | null } = {};
  if (quantity !== undefined) data.quantity = quantity;
  if (expiryDate !== undefined) data.expiryDate = expiryDate ? new Date(expiryDate) : null;
  // promoPercent à 0 = pas de promo → on stocke null
  if (promoPercent !== undefined) data.promoPercent = promoPercent ? promoPercent : null;

  const stock = await prisma.fridgeStock.update({ where: { id }, data });
  res.json({ stock });
}

// DELETE /api/v1/admin/stock/:id — retire un plat d'un frigo
export async function deleteStock(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const existing = await prisma.fridgeStock.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    res.status(404).json({ error: 'Entrée de stock introuvable' });
    return;
  }
  await prisma.fridgeStock.delete({ where: { id } });
  res.status(204).send();
}
