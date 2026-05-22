import { Router } from 'express';
import { listFridges, getFridge } from '../controllers/frigo.controller';

const router = Router();

router.get('/frigos', listFridges);
router.get('/frigos/:id', getFridge);

export default router;
