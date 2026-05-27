import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import type { SubscriberRequest } from '../middleware/userAuth';

const questionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'rating', 'choice', 'multi']),
  options: z.array(z.string()).optional(),
});

const createSurveySchema = z.object({
  title: z.string().min(1).max(200),
  questions: z.array(questionSchema).min(1),
  active: z.boolean().default(false),
});

const updateSurveySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  questions: z.array(questionSchema).min(1).optional(),
  active: z.boolean().optional(),
});

// GET /api/v1/admin/surveys
export async function listSurveys(_req: Request, res: Response): Promise<void> {
  const surveys = await prisma.preferenceSurvey.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { responses: true } } },
  });
  res.json({ surveys });
}

// POST /api/v1/admin/surveys
export async function createSurvey(req: Request, res: Response): Promise<void> {
  const result = createSurveySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }
  const survey = await prisma.preferenceSurvey.create({
    data: {
      title: result.data.title,
      questions: result.data.questions,
      active: result.data.active,
    },
  });

  // Notification push si le sondage est actif dès la création
  if (result.data.active) {
    const { broadcastPush } = await import('../services/push.service');
    broadcastPush({
      title: "Nouveau sondage disponible",
      body: result.data.title,
      url: '/app/sondages',
      tag: 'sondage',
    }).catch(() => {});
  }

  res.status(201).json({ survey });
}

// PATCH /api/v1/admin/surveys/:id
export async function updateSurvey(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const result = updateSurveySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }
  const survey = await prisma.preferenceSurvey.update({
    where: { id },
    data: result.data,
  });
  res.json({ survey });
}

// DELETE /api/v1/admin/surveys/:id
export async function deleteSurvey(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  await prisma.$transaction([
    prisma.preferenceResponse.deleteMany({ where: { surveyId: id } }),
    prisma.preferenceSurvey.delete({ where: { id } }),
  ]);
  res.status(204).send();
}

// GET /api/v1/admin/surveys/:id/responses
export async function getSurveyResponses(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const survey = await prisma.preferenceSurvey.findUnique({
    where: { id },
    include: {
      responses: {
        include: { subscriber: { select: { email: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!survey) {
    res.status(404).json({ error: 'Sondage introuvable' });
    return;
  }
  res.json({ survey });
}

// GET /api/v1/public/surveys
export async function listActiveSurveys(_req: Request, res: Response): Promise<void> {
  const surveys = await prisma.preferenceSurvey.findMany({
    where: { active: true },
    select: { id: true, title: true, questions: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ surveys });
}

// POST /api/v1/public/surveys/:id/respond — requiert auth subscriber
const respondSchema = z.object({
  answers: z.record(z.unknown()),
});

export async function respondToSurvey(req: Request, res: Response): Promise<void> {
  const subscriberId = (req as SubscriberRequest).subscriberId;
  const surveyId = req.params['id'] as string;

  const survey = await prisma.preferenceSurvey.findUnique({ where: { id: surveyId } });
  if (!survey) {
    res.status(404).json({ error: 'Sondage introuvable' });
    return;
  }
  if (!survey.active) {
    res.status(403).json({ error: "Ce sondage n'est plus actif" });
    return;
  }

  const result = respondSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { answers } = result.data;

  const existing = await prisma.preferenceResponse.findFirst({
    where: { surveyId, subscriberId },
  });
  if (existing) {
    res.status(409).json({ error: 'Vous avez déjà répondu à ce sondage' });
    return;
  }

  const response = await prisma.preferenceResponse.create({
    data: { surveyId, subscriberId, answers: answers as object },
  });

  res.status(201).json({ message: 'Réponse enregistrée', response });
}
