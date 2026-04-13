import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Mot de passe minimum 8 caractères'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN']).default('ADMIN'),
});

const updateAdminSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN']).optional(),
});

export async function listAdmins(req: Request, res: Response): Promise<void> {
  const admins = await prisma.admin.findMany({
    select: { id: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json(admins);
}

export async function createAdmin(req: Request, res: Response): Promise<void> {
  const result = createAdminSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten().fieldErrors });
    return;
  }

  const { email, password, role } = result.data;

  const exists = await prisma.admin.findUnique({ where: { email } });
  if (exists) {
    res.status(409).json({ error: 'Un admin avec cet email existe déjà' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.admin.create({
    data: { email, passwordHash, role },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  res.status(201).json(admin);
}

export async function updateAdmin(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const result = updateAdminSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten().fieldErrors });
    return;
  }

  const { email, password, role } = result.data;
  const data: Record<string, unknown> = {};
  if (email) data.email = email;
  if (role) data.role = role;
  if (password) data.passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.admin.update({
    where: { id },
    data,
    select: { id: true, email: true, role: true, createdAt: true },
  });

  res.json(admin);
}

export async function deleteAdmin(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  if (req.admin?.id === id) {
    res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    return;
  }

  await prisma.admin.delete({ where: { id } });
  res.status(204).send();
}
