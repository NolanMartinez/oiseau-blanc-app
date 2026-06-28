import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { listFridges, getFridge, queueFridgeCommand } from '../controllers/frigo.controller';

const router = Router();
router.use(requireAuth);

router.get('/', listFridges);
router.get('/:id', getFridge);
// Ouverture/fermeture à distance d'un casier (empile une commande pour la borne).
router.post('/:id/commands', queueFridgeCommand);

export default router;
