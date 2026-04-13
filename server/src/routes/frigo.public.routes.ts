import { Router } from 'express';
import { MOCK_FRIDGES } from '../services/bicom.mock';

const router = Router();

router.get('/frigos', (_req, res) => {
  res.json({ fridges: MOCK_FRIDGES, isMock: true });
});

router.get('/frigos/:id', (req, res) => {
  const fridge = MOCK_FRIDGES.find((f) => f.id === req.params['id']);
  if (!fridge) {
    res.status(404).json({ error: 'Frigo introuvable' });
    return;
  }
  res.json({ fridge, isMock: true });
});

export default router;
