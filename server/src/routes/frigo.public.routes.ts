import { Router } from 'express';
import {
  listFridges,
  getFridge,
  syncFridgeStock,
  pullFridgeCommands,
} from '../controllers/frigo.controller';

const router = Router();

router.get('/frigos', listFridges);
router.get('/frigos/:id', getFridge);
// La borne pousse son inventaire réel (stock par plat) ici.
router.post('/frigos/:id/stock', syncFridgeStock);
// La borne récupère ses commandes d'ouverture/fermeture à distance.
router.get('/frigos/:id/commands', pullFridgeCommands);

export default router;
