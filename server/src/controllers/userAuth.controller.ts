import { Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import type { SubscriberRequest } from '../middleware/userAuth';

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const requestOtpSchema = z.object({
  contact: z.string().min(3),
});

// POST /public/user/auth/request-otp
export async function requestOtp(req: Request, res: Response): Promise<void> {
  const result = requestOtpSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Contact invalide' });
    return;
  }

  const { contact } = result.data;
  const isEmail = contact.includes('@');

  // Trouve ou crée le subscriber
  let subscriber = isEmail
    ? await prisma.subscriber.findUnique({ where: { email: contact } })
    : await prisma.subscriber.findFirst({ where: { phone: contact } });

  if (!subscriber) {
    subscriber = await prisma.subscriber.create({
      data: isEmail ? { email: contact } : { phone: contact },
    });
  }

  // Invalide les anciens OTPs
  await prisma.otpCode.updateMany({
    where: { contact, used: false },
    data: { used: true },
  });

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await prisma.otpCode.create({ data: { contact, code, expiresAt } });

  logger.info({ contact }, `OTP généré : ${code}`);

  // TODO (production) : envoyer le code par email via Mailchimp ou par SMS
  const response: Record<string, unknown> = { message: 'Code envoyé' };
  if (process.env.NODE_ENV !== 'production') {
    response._devCode = code;
  }

  res.json(response);
}

const verifyOtpSchema = z.object({
  contact: z.string().min(3),
  code: z.string().length(6),
});

// POST /public/user/auth/verify-otp
export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const result = verifyOtpSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Données invalides' });
    return;
  }

  const { contact, code } = result.data;

  const otp = await prisma.otpCode.findFirst({
    where: { contact, code, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) {
    res.status(401).json({ error: 'Code invalide ou expiré' });
    return;
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });

  const isEmail = contact.includes('@');
  const subscriber = isEmail
    ? await prisma.subscriber.findUnique({ where: { email: contact } })
    : await prisma.subscriber.findFirst({ where: { phone: contact } });

  if (!subscriber) {
    res.status(404).json({ error: 'Compte introuvable' });
    return;
  }

  const token = jwt.sign(
    { subscriberId: subscriber.id, type: 'subscriber' },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' },
  );

  res.json({
    token,
    subscriber: { id: subscriber.id, email: subscriber.email, phone: subscriber.phone, favoriId: subscriber.favoriId },
  });
}

const updateMeSchema = z.object({
  consentEmail: z.boolean().optional(),
  consentPush: z.boolean().optional(),
  phone: z.string().min(6).optional().nullable(),
});

// PATCH /public/user/me
export async function updateMe(req: Request, res: Response): Promise<void> {
  const subscriberId = (req as SubscriberRequest).subscriberId;

  const result = updateMeSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const subscriber = await prisma.subscriber.update({
    where: { id: subscriberId },
    data: result.data,
    select: { id: true, email: true, phone: true, consentEmail: true, consentPush: true },
  });

  res.json({ subscriber });
}

// GET /public/user/me
export async function getMe(req: Request, res: Response): Promise<void> {
  const subscriberId = (req as SubscriberRequest).subscriberId;

  const subscriber = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    select: { id: true, email: true, phone: true, favoriId: true, consentEmail: true, consentPush: true },
  });

  if (!subscriber) {
    res.status(404).json({ error: 'Compte introuvable' });
    return;
  }

  res.json({ subscriber });
}

const setFavoriSchema = z.object({ frigoId: z.string().min(1) });

// PATCH /public/user/auth/frigo-favori
export async function setFavori(req: Request, res: Response): Promise<void> {
  const subscriberId = (req as SubscriberRequest).subscriberId;

  const result = setFavoriSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'frigoId invalide' });
    return;
  }

  const subscriber = await prisma.subscriber.update({
    where: { id: subscriberId },
    data: { favoriId: result.data.frigoId },
    select: { id: true, email: true, phone: true, favoriId: true, consentEmail: true, consentPush: true },
  });

  res.json({ subscriber });
}
