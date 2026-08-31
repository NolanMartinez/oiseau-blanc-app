import { notifyFridgeSubscribers } from './push.service';
import { prisma } from '../utils/prisma';
import { logger } from './../utils/logger';

// Regroupe les notifications « nouveau plat » : pendant que le livreur garnit le
// frigo (plusieurs plats ajoutés en quelques minutes), on n'envoie PAS une notif
// par plat. On accumule les nouveautés et on programme un envoi UNIQUE, réarmé à
// chaque nouvel ajout → la notif part `DELAY_MS` après le DERNIER plat ajouté
// (le livreur a fini). Débounce en mémoire (réinitialisé si le serveur redémarre).

const DELAY_MS = 20 * 60 * 1000; // 20 minutes après le dernier ajout

// URL publique de l'API (pour les photos dans les emails). Les images sont
// servies par GET /api/v1/public/dishes/:id/image.
function dishImageUrl(dishId: string): string {
  const base = (process.env['API_PUBLIC_URL'] || 'https://164.132.96.144.sslip.io').replace(/\/$/, '');
  return `${base}/api/v1/public/dishes/${dishId}/image`;
}

interface Pending {
  dishes: Map<string, string>; // id -> nom
  fridgeName: string;
  timer: NodeJS.Timeout;
}

const pending = new Map<string, Pending>();

async function flush(frigoId: string): Promise<void> {
  const entry = pending.get(frigoId);
  if (!entry) return;
  pending.delete(frigoId);
  const ids = [...entry.dishes.keys()];
  const names = [...entry.dishes.values()];
  if (names.length === 0) return;

  // Seuls les plats AYANT une photo (source de vérité = admin) sont illustrés,
  // pour ne pas afficher d'image cassée dans l'email.
  let imageUrls: string[] = [];
  try {
    const withImage = await prisma.dish.findMany({
      where: { id: { in: ids }, imageMimeType: { not: null } },
      select: { id: true },
    });
    imageUrls = withImage.map((d) => dishImageUrl(d.id));
  } catch {
    imageUrls = [];
  }

  const noms = names.join(', ');
  logger.info({ frigoId, count: names.length, photos: imageUrls.length }, 'Notif regroupée « nouveaux plats »');
  await notifyFridgeSubscribers(frigoId, {
    title: `Nouveautés au ${entry.fridgeName}`,
    body: names.length === 1 ? `${noms} vient d'arriver !` : `Nouveaux plats : ${noms}`,
    url: '/app/mon-frigo',
    tag: `newdish-${frigoId}`,
    imageUrls,
  }).catch(() => {});
}

/**
 * Signale l'ajout de nouveaux plats dans un frigo. N'envoie rien tout de suite :
 * accumule et (re)programme l'envoi groupé 20 min après le dernier ajout.
 */
export function scheduleNewDishNotification(
  frigoId: string,
  fridgeName: string,
  dishes: { id: string; name: string }[],
): void {
  if (dishes.length === 0) return;
  let entry = pending.get(frigoId);
  if (!entry) {
    entry = { dishes: new Map(), fridgeName, timer: setTimeout(() => void flush(frigoId), DELAY_MS) };
    pending.set(frigoId, entry);
  }
  entry.fridgeName = fridgeName;
  dishes.forEach((d) => entry!.dishes.set(d.id, d.name));
  // Réarme le compte à rebours à chaque nouvel ajout.
  clearTimeout(entry.timer);
  entry.timer = setTimeout(() => void flush(frigoId), DELAY_MS);
}
