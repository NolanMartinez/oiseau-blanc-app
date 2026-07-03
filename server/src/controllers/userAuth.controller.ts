import { Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import type { SubscriberRequest } from '../middleware/userAuth';
import { ensureLoyaltyCode } from '../services/loyalty.service';
import { getLoyaltyConfig } from '../services/settings.service';

const SUBSCRIBER_SELECT = {
  id: true, email: true, phone: true, favoriId: true, consentEmail: true, consentPush: true, createdAt: true,
} as const;

function makeToken(subscriberId: string) {
  return jwt.sign({ subscriberId, type: 'subscriber' }, process.env.JWT_SECRET!, { expiresIn: '30d' });
}

// POST /public/user/auth/register
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

export async function register(req: Request, res: Response): Promise<void> {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0]?.message ?? 'Données invalides' });
    return;
  }
  const { email, password } = result.data;
  const existing = await prisma.subscriber.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const subscriber = await prisma.subscriber.create({
    data: { email, passwordHash },
    select: SUBSCRIBER_SELECT,
  });
  // Attribue immédiatement un code fidélité unique (à chaque inscription).
  await ensureLoyaltyCode(subscriber.id).catch(() => {});
  logger.info({ email }, 'Nouveau compte créé');
  res.status(201).json({ token: makeToken(subscriber.id), subscriber });
}

// POST /public/user/auth/login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginWithPassword(req: Request, res: Response): Promise<void> {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Données invalides' });
    return;
  }
  const { email, password } = result.data;
  const subscriber = await prisma.subscriber.findUnique({
    where: { email },
    select: { ...SUBSCRIBER_SELECT, passwordHash: true },
  });
  if (!subscriber || !subscriber.passwordHash) {
    res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    return;
  }
  const valid = await bcrypt.compare(password, subscriber.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    return;
  }
  const { passwordHash: _, ...sub } = subscriber;
  res.json({ token: makeToken(subscriber.id), subscriber: sub });
}

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

  const fullSub = await prisma.subscriber.findUnique({ where: { id: subscriber.id }, select: SUBSCRIBER_SELECT });
  res.json({ token, subscriber: fullSub });
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

  const row = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    select: {
      ...SUBSCRIBER_SELECT,
      loyaltyPoints: true,
      loyaltyCode: true,
      _count: { select: { reviews: true, preferenceResponses: true } },
    },
  });

  if (!row) {
    res.status(404).json({ error: 'Compte introuvable' });
    return;
  }

  // Attribue un code fidélité à 6 chiffres au premier affichage du profil.
  const loyaltyCode = row.loyaltyCode ?? (await ensureLoyaltyCode(subscriberId));
  const config = await getLoyaltyConfig();

  const { _count, loyaltyCode: _lc, ...sub } = row;
  res.json({
    subscriber: {
      ...sub,
      loyaltyCode,
      reviewsCount: _count.reviews,
      surveysCount: _count.preferenceResponses,
      loyalty: {
        points: row.loyaltyPoints,
        pointsReward: config.pointsReward,
        enabled: config.enabled,
      },
    },
  });
}

// DELETE /public/user/auth/me — suppression RGPD (irréversible)
export async function deleteMe(req: Request, res: Response): Promise<void> {
  const subscriberId = (req as SubscriberRequest).subscriberId;

  await prisma.$transaction([
    prisma.review.deleteMany({ where: { subscriberId } }),
    prisma.preferenceResponse.deleteMany({ where: { subscriberId } }),
    prisma.menuVoteResponse.deleteMany({ where: { subscriberId } }),
    prisma.subscriber.delete({ where: { id: subscriberId } }),
  ]);

  res.status(204).send();
}

// GET /public/user/auth/my-data — export RGPD
export async function exportMyData(req: Request, res: Response): Promise<void> {
  const subscriberId = (req as SubscriberRequest).subscriberId;

  const [subscriber, reviews, surveyResponses, voteResponses] = await Promise.all([
    prisma.subscriber.findUnique({
      where: { id: subscriberId },
      select: { id: true, email: true, phone: true, favoriId: true, consentEmail: true, consentPush: true, createdAt: true },
    }),
    prisma.review.findMany({
      where: { subscriberId },
      select: { id: true, dishId: true, rating: true, comment: true, createdAt: true },
    }),
    prisma.preferenceResponse.findMany({
      where: { subscriberId },
      select: { id: true, surveyId: true, answers: true, createdAt: true },
    }),
    prisma.menuVoteResponse.findMany({
      where: { subscriberId },
      select: { id: true, menuVoteId: true, selectedOptions: true, createdAt: true },
    }),
  ]);

  if (!subscriber) {
    res.status(404).json({ error: 'Compte introuvable' });
    return;
  }

  res.setHeader('Content-Disposition', 'attachment; filename="mes-donnees.json"');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.json({ subscriber, reviews, surveyResponses, voteResponses });
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
