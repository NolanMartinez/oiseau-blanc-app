import { Router } from 'express';
import { requireSubscriber } from '../middleware/userAuth';
import { recordPurchase, listMyPurchases } from '../controllers/purchase.controller';

const router = Router();

router.use(requireSubscriber);
router.post('/', recordPurchase);
router.get('/', listMyPurchases);

export default router;
