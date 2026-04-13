import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { MOCK_FRIDGES } from '../services/bicom.mock';

const router = Router();
router.use(requireAuth);

router.get('/', (_req, res) => {
  res.json({ fridges: MOCK_FRIDGES, isMock: true });
});

router.get('/:id', (req, res) => {
  const fridge = MOCK_FRIDGES.find((f) => f.id === req.params['id']);
  if (!fridge) {
    res.status(404).json({ error: 'Frigo introuvable' });
    return;
  }
  res.json({ fridge, isMock: true });
});

export default router;
