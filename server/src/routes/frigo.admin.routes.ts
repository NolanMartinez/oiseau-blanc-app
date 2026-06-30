import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  listFridges,
  getFridge,
  createFridge,
  updateFridge,
  deleteFridge,
  queueFridgeCommand,
} from '../controllers/frigo.controller';

const router = Router();
router.use(requireAuth);

router.get('/', listFridges);
router.get('/:id', getFridge);
// CRUD frigo (ajout / modification / suppression).
router.post('/', createFridge);
router.patch('/:id', updateFridge);
router.delete('/:id', deleteFridge);
// Ouverture/fermeture à distance d'un casier (empile une commande pour la borne).
router.post('/:id/commands', queueFridgeCommand);

export default router;
