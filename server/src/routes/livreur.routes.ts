import { Router, Request, Response } from 'express';
import { requireDelivery } from '../middleware/deliveryAuth';
import { getSuggestions } from '../services/livreur.service';
import { getSites, getFridgeDetail } from '../controllers/livreur.controller';
import { prisma } from '../utils/prisma';

const router = Router();
router.use(requireDelivery);

// Frigos réels (BDD), plus les mocks. Utilisé par les écrans livreur.
router.get('/frigos', async (_req: Request, res: Response) => {
  const fridges = await prisma.fridge.findMany({
    select: { id: true, name: true, location: true },
    orderBy: { name: 'asc' },
  });
  res.json({ fridges: fridges.map((f) => ({ ...f, location: f.location ?? '' })) });
});

// Vue par site : stock + ventes du jour / de la veille.
router.get('/sites', getSites);

// Détail d'un frigo : stock + ventes détaillées (horaires + casier).
router.get('/frigos/:id/detail', getFridgeDetail);

// Suggestions de réassort (stock réel).
router.get('/frigos/:id/suggestions', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const fridge = await prisma.fridge.findUnique({
    where: { id },
    select: { id: true, name: true, location: true },
  });
  if (!fridge) {
    res.status(404).json({ error: 'Frigo introuvable' });
    return;
  }
  const suggestions = await getSuggestions(id);
  res.json({ fridge: { ...fridge, location: fridge.location ?? '' }, suggestions });
});

export default router;
