import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { translateDish, translateAllDishes } from '../services/translation.service';

const dishSelect = {
  id: true,
  name: true,
  category: true,
  description: true,
  price: true,
  allergens: true,
  imageMimeType: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

// Transforme une ligne Dish en DTO : jamais d'imageData, un booléen hasImage à la place.
function toDishDTO<T extends { imageMimeType: string | null }>(d: T) {
  const { imageMimeType, ...rest } = d;
  return { ...rest, hasImage: imageMimeType != null };
}

const imageSchema = z.object({
  imageBase64: z.string().min(1),
  imageMimeType: z.string().regex(/^image\//, 'Type d\'image invalide'),
});

const createDishSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(60),
  description: z.string().max(1000).nullable().optional(),
  price: z.number().nonnegative(),
  allergens: z.array(z.string().min(1).max(40)).default([]),
  isActive: z.boolean().default(true),
  image: imageSchema.nullable().optional(),
});

const updateDishSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  category: z.string().min(1).max(60).optional(),
  description: z.string().max(1000).nullable().optional(),
  price: z.number().nonnegative().optional(),
  allergens: z.array(z.string().min(1).max(40)).optional(),
  isActive: z.boolean().optional(),
  image: imageSchema.nullable().optional(),
});

// GET /api/v1/admin/dishes
export async function listDishes(_req: Request, res: Response): Promise<void> {
  const dishes = await prisma.dish.findMany({
    select: { ...dishSelect, _count: { select: { fridgeStocks: true } } },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  });
  res.json({ dishes: dishes.map(toDishDTO) });
}

// POST /api/v1/admin/dishes
export async function createDish(req: Request, res: Response): Promise<void> {
  const result = createDishSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }
  const { image, ...fields } = result.data;
  const dish = await prisma.dish.create({
    data: {
      ...fields,
      ...(image
        ? { imageData: Buffer.from(image.imageBase64, 'base64'), imageMimeType: image.imageMimeType }
        : {}),
    },
    select: dishSelect,
  });
  translateDish(dish.id, dish.name, dish.description).catch(() => {});
  res.status(201).json({ dish: toDishDTO(dish) });
}

// PATCH /api/v1/admin/dishes/:id
export async function updateDish(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const result = updateDishSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const existing = await prisma.dish.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    res.status(404).json({ error: 'Plat introuvable' });
    return;
  }

  const { image, ...fields } = result.data;
  // image absent → on n'y touche pas ; image null → on l'efface ; objet → on la remplace
  const imageData =
    image === undefined
      ? {}
      : image === null
        ? { imageData: null, imageMimeType: null }
        : { imageData: Buffer.from(image.imageBase64, 'base64'), imageMimeType: image.imageMimeType };

  const dish = await prisma.dish.update({
    where: { id },
    data: { ...fields, ...imageData },
    select: dishSelect,
  });
  translateDish(dish.id, dish.name, dish.description).catch(() => {});
  res.json({ dish: toDishDTO(dish) });
}

// DELETE /api/v1/admin/dishes/:id — soft delete (le plat reste référencé par l'historique)
export async function deleteDish(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const existing = await prisma.dish.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    res.status(404).json({ error: 'Plat introuvable' });
    return;
  }
  await prisma.dish.update({ where: { id }, data: { isActive: false } });
  res.status(204).send();
}

// POST /api/v1/admin/dishes/suggest-description — génère une description via Groq (Llama, gratuit)
export async function suggestDescription(req: Request, res: Response): Promise<void> {
  const { name, category } = req.body as { name?: string; category?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: 'Le nom du plat est requis.' });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'GROQ_API_KEY non configurée.' });
    return;
  }

  const prompt = `Tu es rédacteur pour un traiteur français haut de gamme.
Écris une description gourmande et élégante pour un plat nommé « ${name.trim()} »${category?.trim() ? ` (catégorie : ${category.trim()})` : ''}.
Contraintes : 1 à 2 phrases, 80-150 caractères maximum, en français, sans guillemets ni ponctuation finale.
Réponds uniquement avec la description, rien d'autre.`;

  const apiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!apiRes.ok) {
    res.status(502).json({ error: 'Erreur API Groq.' });
    return;
  }

  const data = (await apiRes.json()) as { choices: { message: { content: string } }[] };
  const description = data.choices[0]?.message?.content?.trim() ?? '';
  res.json({ description });
}

// POST /api/v1/admin/dishes/translate-all — (re)génère toutes les traductions
export async function translateAllDishesHandler(_req: Request, res: Response): Promise<void> {
  const result = await translateAllDishes();
  res.json(result);
}

// GET /api/v1/public/dishes — liste publique des plats actifs (sans images)
export async function listPublicDishes(_req: Request, res: Response): Promise<void> {
  const dishes = await prisma.dish.findMany({
    where: { isActive: true },
    select: { id: true, name: true, category: true, allergens: true, imageMimeType: true },
    orderBy: { name: 'asc' },
  });
  res.json({ dishes: dishes.map(toDishDTO) });
}

// GET /api/v1/public/dishes/:id/image — route publique (chargée dans des <img>)
export async function getDishImage(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const dish = await prisma.dish.findUnique({
    where: { id },
    select: { imageData: true, imageMimeType: true },
  });
  if (!dish || !dish.imageData || !dish.imageMimeType) {
    res.status(404).json({ error: 'Image introuvable' });
    return;
  }
  res.setHeader('Content-Type', dish.imageMimeType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(Buffer.from(dish.imageData));
}
