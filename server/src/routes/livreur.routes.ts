import { Router, Request, Response } from 'express';
import { requireDelivery } from '../middleware/deliveryAuth';
import { getSuggestions } from '../services/livreur.service';
import { MOCK_FRIDGES } from '../services/bicom.mock';

const router = Router();
router.use(requireDelivery);

router.get('/frigos', (_req: Request, res: Response) => {
  res.json({ fridges: MOCK_FRIDGES });
});

router.get('/frigos/:id/suggestions', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const fridge = MOCK_FRIDGES.find((f) => f.id === id);
  if (!fridge) {
    res.status(404).json({ error: 'Frigo introuvable' });
    return;
  }
  const suggestions = await getSuggestions(id);
  res.json({ fridge, suggestions });
});

export default router;
