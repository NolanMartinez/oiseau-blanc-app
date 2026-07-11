import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { getFridgeMeta } from '../services/fridges';
import { getCompanyInfo, setCompanyInfo } from '../services/settings.service';
import { sendReceiptEmail } from '../services/email.service';

// ── Public / borne : envoi du reçu ───────────────────────────────────────────

const receiptSchema = z
  .object({
    email: z.string().email().optional(),
    loyaltyCode: z.string().trim().regex(/^\d{5}$/).optional(),
    soldAt: z.string().optional(),
    items: z
      .array(z.object({ name: z.string().min(1).max(120), amountCents: z.number().int().min(0) }))
      .min(1),
  })
  .refine((d) => d.email || d.loyaltyCode, { message: 'Email ou code fidélité requis' });

// POST /api/v1/public/frigos/:id/receipt — envoie le justificatif d'achat par email.
export async function sendReceipt(req: Request, res: Response): Promise<void> {
  const meta = await getFridgeMeta(req.params['id'] as string);
  if (!meta) {
    res.status(404).json({ error: 'Frigo introuvable' });
    return;
  }
  const parsed = receiptSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Requête invalide' });
    return;
  }
  const { email, loyaltyCode, items, soldAt } = parsed.data;

  // Destinataire : email du compte fidélité si code fourni, sinon l'email saisi.
  let to = email ?? null;
  if (loyaltyCode) {
    const sub = await prisma.subscriber.findUnique({
      where: { loyaltyCode },
      select: { email: true },
    });
    if (sub?.email) to = sub.email;
  }
  if (!to) {
    res.status(400).json({ error: 'Aucune adresse email (code fidélité sans email ?)' });
    return;
  }

  const company = await getCompanyInfo();
  const ok = await sendReceiptEmail(to, {
    company,
    items,
    soldAt: soldAt ? new Date(soldAt) : new Date(),
    fridgeName: meta.name,
  });
  res.json({ ok, sentTo: to });
}

// ── Admin : coordonnées de l'entreprise ──────────────────────────────────────

// GET /api/v1/admin/company/settings
export async function getCompanySettings(_req: Request, res: Response): Promise<void> {
  res.json(await getCompanyInfo());
}

const companySchema = z.object({
  name: z.string().min(1).max(120),
  address: z.string().max(300),
  siret: z.string().max(40),
  tvaNumber: z.string().max(40),
  tvaRate: z.number().min(0).max(100),
});

// PUT /api/v1/admin/company/settings
export async function updateCompanySettings(req: Request, res: Response): Promise<void> {
  const parsed = companySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  res.json(await setCompanyInfo(parsed.data));
}
