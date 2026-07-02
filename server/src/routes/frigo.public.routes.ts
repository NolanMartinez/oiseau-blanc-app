import { Router } from 'express';
import {
  listFridges,
  getFridge,
  syncFridgeStock,
  syncFridgeMenu,
  recordSale,
  pullFridgeCommands,
} from '../controllers/frigo.controller';
import { loyaltyLookup, loyaltyRedeem } from '../controllers/loyalty.controller';

const router = Router();

router.get('/frigos', listFridges);
router.get('/frigos/:id', getFridge);
// La borne pousse son inventaire réel (stock par plat) ici.
router.post('/frigos/:id/stock', syncFridgeStock);
// La borne pousse sa carte complète (plats + prix + DLC + stock + images).
router.post('/frigos/:id/menu', syncFridgeMenu);
// La borne remonte une vente.
router.post('/frigos/:id/sales', recordSale);
// La borne récupère ses commandes d'ouverture/fermeture à distance.
router.get('/frigos/:id/commands', pullFridgeCommands);
// Fidélité : consultation du solde (avant paiement) et échange d'un repas offert.
router.post('/frigos/:id/loyalty/lookup', loyaltyLookup);
router.post('/frigos/:id/loyalty/redeem', loyaltyRedeem);

export default router;
