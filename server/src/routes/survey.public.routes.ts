import { Router } from 'express';
import { listActiveSurveys, respondToSurvey } from '../controllers/survey.controller';
import { requireSubscriber } from '../middleware/userAuth';

const router = Router();

router.get('/surveys', listActiveSurveys);
router.post('/surveys/:id/respond', requireSubscriber, respondToSurvey);

export default router;
