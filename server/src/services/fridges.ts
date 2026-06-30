import { prisma } from '../utils/prisma';

/** Récupère un frigo par son id (table `frigos`), ou null s'il n'existe pas. */
export async function getFridgeMeta(id: string) {
  return prisma.fridge.findUnique({ where: { id } });
}
