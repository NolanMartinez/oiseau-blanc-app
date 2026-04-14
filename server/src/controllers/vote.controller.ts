import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

const createVoteSchema = z.object({
  title: z.string().min(1).max(200),
  options: z.array(z.string().min(1)).min(2),
  voteDeadline: z.coerce.date(),
});

const updateVoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  options: z.array(z.string().min(1)).min(2).optional(),
  voteDeadline: z.coerce.date().optional(),
});

// GET /api/v1/admin/votes
export async function listVotes(_req: Request, res: Response): Promise<void> {
  const votes = await prisma.menuVote.findMany({
    orderBy: { voteDeadline: 'desc' },
    include: { _count: { select: { responses: true } } },
  });
  res.json({ votes });
}

// POST /api/v1/admin/votes
export async function createVote(req: Request, res: Response): Promise<void> {
  const result = createVoteSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }
  const vote = await prisma.menuVote.create({
    data: {
      title: result.data.title,
      options: result.data.options,
      voteDeadline: result.data.voteDeadline,
    },
  });

  // Notification push automatique
  const { broadcastPush } = await import('../services/push.service');
  broadcastPush({
    title: "Nouveau vote menu",
    body: `Votez pour : ${result.data.title}`,
    url: '/app/votes',
    tag: 'vote',
  }).catch(() => {});

  res.status(201).json({ vote });
}

// PATCH /api/v1/admin/votes/:id
export async function updateVote(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const result = updateVoteSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }
  const vote = await prisma.menuVote.update({ where: { id }, data: result.data });
  res.json({ vote });
}

// DELETE /api/v1/admin/votes/:id
export async function deleteVote(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  await prisma.$transaction([
    prisma.menuVoteResponse.deleteMany({ where: { menuVoteId: id } }),
    prisma.menuVote.delete({ where: { id } }),
  ]);
  res.status(204).send();
}

// GET /api/v1/admin/votes/:id/results
export async function getVoteResults(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const vote = await prisma.menuVote.findUnique({
    where: { id },
    include: {
      responses: {
        include: { subscriber: { select: { email: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!vote) {
    res.status(404).json({ error: 'Vote introuvable' });
    return;
  }
  res.json({ vote });
}

// GET /api/v1/public/votes
export async function listOpenVotes(_req: Request, res: Response): Promise<void> {
  const votes = await prisma.menuVote.findMany({
    where: { voteDeadline: { gt: new Date() } },
    select: { id: true, title: true, options: true, voteDeadline: true },
    orderBy: { voteDeadline: 'asc' },
  });
  res.json({ votes });
}

// POST /api/v1/public/votes/:id/vote
const castVoteSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(6).optional(),
  selectedOption: z.string().min(1),
}).refine((d) => d.email || d.phone, {
  message: 'Un email ou un numéro de téléphone est requis',
});

export async function castVote(req: Request, res: Response): Promise<void> {
  const voteId = req.params['id'] as string;

  const vote = await prisma.menuVote.findUnique({ where: { id: voteId } });
  if (!vote) {
    res.status(404).json({ error: 'Vote introuvable' });
    return;
  }
  if (vote.voteDeadline <= new Date()) {
    res.status(403).json({ error: 'Ce vote est terminé' });
    return;
  }

  const result = castVoteSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { email, phone, selectedOption } = result.data;

  let subscriber = email
    ? await prisma.subscriber.findUnique({ where: { email } })
    : null;

  if (!subscriber) {
    subscriber = await prisma.subscriber.create({ data: { email, phone } });
  }

  const existing = await prisma.menuVoteResponse.findFirst({
    where: { menuVoteId: voteId, subscriberId: subscriber.id },
  });
  if (existing) {
    res.status(409).json({ error: 'Vous avez déjà voté' });
    return;
  }

  const response = await prisma.menuVoteResponse.create({
    data: { menuVoteId: voteId, subscriberId: subscriber.id, selectedOptions: [selectedOption] },
  });

  res.status(201).json({ message: 'Vote enregistré', response });
}
