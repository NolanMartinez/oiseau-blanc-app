import { Router } from 'express';
import {
  listSurveys,
  createSurvey,
  updateSurvey,
  deleteSurvey,
  getSurveyResponses,
} from '../controllers/survey.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', listSurveys);
router.post('/', createSurvey);
router.patch('/:id', updateSurvey);
router.delete('/:id', deleteSurvey);
router.get('/:id/responses', getSurveyResponses);

export default router;
