import { notifyFridgeSubscribers } from './push.service';
import { logger } from './../utils/logger';

// Regroupe les notifications « nouveau plat » : pendant que le livreur garnit le
// frigo (plusieurs plats ajoutés en quelques minutes), on n'envoie PAS une notif
// par plat. On accumule les nouveautés et on programme un envoi UNIQUE, réarmé à
// chaque nouvel ajout → la notif part `DELAY_MS` après le DERNIER plat ajouté
// (le livreur a fini). Débounce en mémoire (réinitialisé si le serveur redémarre).

const DELAY_MS = 20 * 60 * 1000; // 20 minutes après le dernier ajout

interface Pending {
  names: Set<string>;
  fridgeName: string;
  timer: NodeJS.Timeout;
}

const pending = new Map<string, Pending>();

async function flush(frigoId: string): Promise<void> {
  const entry = pending.get(frigoId);
  if (!entry) return;
  pending.delete(frigoId);
  const names = [...entry.names];
  if (names.length === 0) return;

  const noms = names.join(', ');
  logger.info({ frigoId, count: names.length }, 'Notif regroupée « nouveaux plats »');
  await notifyFridgeSubscribers(frigoId, {
    title: `Nouveautés au ${entry.fridgeName}`,
    body: names.length === 1 ? `${noms} vient d'arriver !` : `Nouveaux plats : ${noms}`,
    url: '/app/mon-frigo',
    tag: `newdish-${frigoId}`,
  }).catch(() => {});
}

/**
 * Signale l'ajout de nouveaux plats dans un frigo. N'envoie rien tout de suite :
 * accumule et (re)programme l'envoi groupé 20 min après le dernier ajout.
 */
export function scheduleNewDishNotification(
  frigoId: string,
  fridgeName: string,
  dishNames: string[],
): void {
  if (dishNames.length === 0) return;
  let entry = pending.get(frigoId);
  if (!entry) {
    entry = { names: new Set(), fridgeName, timer: setTimeout(() => void flush(frigoId), DELAY_MS) };
    pending.set(frigoId, entry);
  }
  entry.fridgeName = fridgeName;
  dishNames.forEach((n) => entry!.names.add(n));
  // Réarme le compte à rebours à chaque nouvel ajout.
  clearTimeout(entry.timer);
  entry.timer = setTimeout(() => void flush(frigoId), DELAY_MS);
}
