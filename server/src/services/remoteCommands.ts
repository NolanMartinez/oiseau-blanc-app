/**
 * File de commandes « ouverture/fermeture à distance » par frigo.
 *
 * Le matériel (verrous) est sur la BORNE, pas sur le serveur. Le site admin
 * empile une commande ici ; la borne l'interroge régulièrement et l'exécute en
 * local. File en mémoire (transitoire) : une commande non récupérée est perdue
 * si le serveur redémarre — acceptable (l'opérateur relance).
 */
import { randomUUID } from 'node:crypto';

export type RemoteAction = 'open' | 'close_all';

export interface RemoteCommand {
  id: string;
  frigoId: string;
  board: string;
  boxNumber: number;
  action: RemoteAction;
  createdAt: string;
}

const queues = new Map<string, RemoteCommand[]>();

export function enqueueCommand(input: {
  frigoId: string;
  board: string;
  boxNumber: number;
  action: RemoteAction;
}): RemoteCommand {
  const cmd: RemoteCommand = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  const q = queues.get(input.frigoId) ?? [];
  q.push(cmd);
  queues.set(input.frigoId, q);
  return cmd;
}

/** Récupère ET vide les commandes en attente d'un frigo (livraison « au plus une fois »). */
export function drainCommands(frigoId: string): RemoteCommand[] {
  const q = queues.get(frigoId) ?? [];
  queues.set(frigoId, []);
  return q;
}
