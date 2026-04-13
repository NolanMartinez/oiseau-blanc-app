import { Router } from 'express';
import { listActiveSurveys, respondToSurvey } from '../controllers/survey.controller';

const router = Router();

router.get('/surveys', listActiveSurveys);
router.post('/surveys/:id/respond', respondToSurvey);

export default router;
