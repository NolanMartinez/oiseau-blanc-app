import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response): Promise<void> {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Email ou mot de passe invalide' });
    return;
  }

  const { email, password } = result.data;

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    res.status(401).json({ error: 'Identifiants incorrects' });
    return;
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Identifiants incorrects' });
    return;
  }

  const token = jwt.sign(
    { id: admin.id, email: admin.email, role: admin.role },
    process.env.JWT_SECRET!,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    admin: { id: admin.id, email: admin.email, role: admin.role },
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  res.json(req.admin);
}
