import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

// GET /api/v1/admin/categories
export async function listCategories(_req: Request, res: Response): Promise<void> {
  const categories = await prisma.category.findMany({ orderBy: [{ position: 'asc' }, { name: 'asc' }] });
  res.json({ categories });
}

const nameSchema = z.object({ name: z.string().min(1).max(60) });

// POST /api/v1/admin/categories
export async function createCategory(req: Request, res: Response): Promise<void> {
  const parsed = nameSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const name = parsed.data.name.trim();
  const existing = await prisma.category.findUnique({ where: { name } });
  if (existing) {
    res.status(409).json({ error: 'Cette catégorie existe déjà.' });
    return;
  }
  const last = await prisma.category.findFirst({ orderBy: { position: 'desc' } });
  const category = await prisma.category.create({ data: { name, position: (last?.position ?? -1) + 1 } });
  res.status(201).json({ category });
}

const updateSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  position: z.number().int().min(0).optional(),
});

// PATCH /api/v1/admin/categories/:id — renomme et/ou réordonne.
// Renommer répercute le nouveau nom sur les plats qui portaient l'ancien.
export async function updateCategory(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) {
    res.status(404).json({ error: 'Catégorie introuvable' });
    return;
  }
  const data = parsed.data;
  if (data.name && data.name.trim() !== current.name) {
    const newName = data.name.trim();
    const clash = await prisma.category.findUnique({ where: { name: newName } });
    if (clash) {
      res.status(409).json({ error: 'Cette catégorie existe déjà.' });
      return;
    }
    // Répercute le renommage sur les plats existants.
    await prisma.dish.updateMany({ where: { category: current.name }, data: { category: newName } });
  }
  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.position !== undefined ? { position: data.position } : {}),
    },
  });
  res.json({ category });
}

// PUT /api/v1/admin/categories/reorder — réordonne en bloc { ids: [...] }
export async function reorderCategories(req: Request, res: Response): Promise<void> {
  const parsed = z.object({ ids: z.array(z.string().min(1)) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  await prisma.$transaction(
    parsed.data.ids.map((id, position) =>
      prisma.category.update({ where: { id }, data: { position } }),
    ),
  );
  res.json({ ok: true });
}

// DELETE /api/v1/admin/categories/:id (les plats gardent le libellé textuel)
export async function deleteCategory(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) {
    res.status(404).json({ error: 'Catégorie introuvable' });
    return;
  }
  await prisma.category.delete({ where: { id } });
  res.status(204).send();
}
