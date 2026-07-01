import { prisma } from '../utils/prisma';

/**
 * Récupère un frigo par son id OU par son numéro de série (table `frigos`).
 * Permet à la borne de s'identifier avec le numéro de série saisi côté admin :
 * dès qu'elle se synchronise, le frigo correspondant passe « en ligne ».
 * Retourne null s'il n'existe pas.
 */
export async function getFridgeMeta(idOrSerial: string) {
  const byId = await prisma.fridge.findUnique({ where: { id: idOrSerial } });
  if (byId) return byId;
  return prisma.fridge.findFirst({ where: { serialNumber: idOrSerial } });
}
