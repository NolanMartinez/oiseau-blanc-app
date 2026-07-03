import { Request, Response } from 'express';
import { z } from 'zod';
import { getFridgeMeta } from '../services/fridges';
import { lookupByCode, redeemRewardByCode } from '../services/loyalty.service';
import { getLoyaltyConfig, setLoyaltyConfig } from '../services/settings.service';

const codeSchema = z.object({ code: z.string().trim().regex(/^\d{5}$/) });

// ── Public / borne ──────────────────────────────────────────────────────────

// POST /api/v1/public/frigos/:id/loyalty/lookup — solde + récompense dispo (avant paiement).
export async function loyaltyLookup(req: Request, res: Response): Promise<void> {
  if (!(await getFridgeMeta(req.params['id'] as string))) {
    res.status(404).json({ error: 'Frigo introuvable' });
    return;
  }
  const parsed = codeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Code invalide' });
    return;
  }
  const status = await lookupByCode(parsed.data.code);
  if (!status) {
    res.status(404).json({ error: 'Code fidélité inconnu' });
    return;
  }
  res.json(status);
}

const redeemSchema = z.object({ code: z.string().trim().regex(/^\d{5}$/), dishId: z.string().min(1) });

// POST /api/v1/public/frigos/:id/loyalty/redeem — échange les points contre un repas offert.
export async function loyaltyRedeem(req: Request, res: Response): Promise<void> {
  const meta = await getFridgeMeta(req.params['id'] as string);
  if (!meta) {
    res.status(404).json({ error: 'Frigo introuvable' });
    return;
  }
  const parsed = redeemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Requête invalide' });
    return;
  }
  const result = await redeemRewardByCode(parsed.data.code, meta.id, parsed.data.dishId);
  if (!result) {
    res.status(404).json({ error: 'Code fidélité inconnu' });
    return;
  }
  if (!result.ok) {
    res.status(400).json({ error: 'Points insuffisants', ...result.status });
    return;
  }
  res.json(result.status);
}

// ── Admin ─────────────────────────────────────────────────────────────────

// GET /api/v1/admin/loyalty/settings
export async function getLoyaltySettings(_req: Request, res: Response): Promise<void> {
  res.json(await getLoyaltyConfig());
}

const settingsSchema = z.object({
  enabled: z.boolean(),
  eurosPerPoint: z.number().positive().max(1000),
  pointsReward: z.number().int().positive().max(100000),
});

// PUT /api/v1/admin/loyalty/settings
export async function updateLoyaltySettings(req: Request, res: Response): Promise<void> {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  res.json(await setLoyaltyConfig(parsed.data));
}
