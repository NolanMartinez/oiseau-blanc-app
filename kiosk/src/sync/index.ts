// Synchro local-first : récupère le menu du frigo depuis le backend existant et
// alimente le cache local (plats + images). Aucune modif backend requise.
//   GET /api/v1/public/frigos/:id           -> menu/prix/DLC/promo
//   GET /api/v1/public/dishes/:id/image      -> image binaire (mise en cache)

import type { Repo } from "../db";
import { kioskFetch } from "../platform/http";

export interface BackendDish {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  price: number; // euros
  finalPrice: number; // euros (promo appliquée)
  allergens: string[];
  hasImage: boolean;
  dlcDays?: number | null; // DLC en jours (fiche produit)
}

export interface SyncResult {
  ok: boolean;
  dishCount: number;
  error?: string;
}

const eurosToCents = (v: number) => Math.round(v * 100);

export async function syncMenu(
  repo: Repo,
  backendUrl: string,
  frigoId: string,
): Promise<SyncResult> {
  if (!backendUrl || !frigoId) {
    return { ok: false, dishCount: 0, error: "Backend ou frigo non configuré" };
  }
  const base = backendUrl.replace(/\/$/, "");
  try {
    const res = await kioskFetch(`${base}/api/v1/public/frigos/${frigoId}`);
    if (!res.ok) return { ok: false, dishCount: 0, error: `HTTP ${res.status}` };
    const data = await res.json();
    const dishes: BackendDish[] = data?.fridge?.dishes ?? [];

    for (const d of dishes) {
      let image: { bytes: Uint8Array; mime: string } | null = null;
      if (d.hasImage) {
        try {
          const imgRes = await kioskFetch(`${base}/api/v1/public/dishes/${d.id}/image`);
          if (imgRes.ok) {
            const buf = await imgRes.arrayBuffer();
            const mime = imgRes.headers.get("content-type") ?? "image/jpeg";
            image = { bytes: new Uint8Array(buf), mime };
          }
        } catch {
          /* image facultative : on continue */
        }
      }
      await repo.upsertDish(
        {
          id: d.id,
          name: d.name,
          category: d.category,
          description: d.description,
          // On stocke le prix promo (ce que paie le client à la borne).
          price: eurosToCents(d.finalPrice ?? d.price),
          allergens: d.allergens ?? [],
          imageMime: image?.mime ?? null,
          updatedAt: new Date().toISOString(),
          dlcDays: d.dlcDays ?? null,
        },
        image,
      );
    }
    return { ok: true, dishCount: dishes.length };
  } catch (e) {
    return { ok: false, dishCount: 0, error: e instanceof Error ? e.message : "Échec réseau" };
  }
}

/**
 * Pousse l'inventaire réel de la borne vers le serveur (1 entrée par plat encore
 * présent dans un casier). Le serveur met à jour les stocks du frigo → affichage
 * du stock réel sur l'app web client. Best-effort (silencieux hors ligne).
 */
export async function pushStock(
  backendUrl: string,
  frigoId: string,
  stocks: { dishId: string; quantity: number }[],
): Promise<boolean> {
  if (!backendUrl || !frigoId) return false;
  const base = backendUrl.replace(/\/$/, "");
  try {
    const res = await kioskFetch(`${base}/api/v1/public/frigos/${frigoId}/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stocks }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Remonte une vente vers le serveur (pour le suivi des ventes sur l'app web).
 * Best-effort (silencieux hors ligne).
 */
export async function pushSale(
  backendUrl: string,
  frigoId: string,
  sale: { dishId: string; amount: number; mode: string; soldAt: string; loyaltyCode?: string },
): Promise<boolean> {
  if (!backendUrl || !frigoId) return false;
  const base = backendUrl.replace(/\/$/, "");
  try {
    const res = await kioskFetch(`${base}/api/v1/public/frigos/${frigoId}/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sale),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Reprise des ventes hors-ligne : pousse vers le serveur toutes les ventes encore
 * non synchronisées (mode dégradé → le réseau est revenu). Idempotent, best-effort.
 */
export async function resyncSales(repo: Repo, backendUrl: string, frigoId: string): Promise<number> {
  if (!backendUrl || !frigoId) return 0;
  let sent = 0;
  const pending = await repo.listUnsyncedSales();
  for (const s of pending) {
    if (s.id == null) continue;
    const ok = await pushSale(backendUrl, frigoId, {
      dishId: s.dishId ?? "",
      amount: s.amount,
      mode: s.mode,
      soldAt: s.paidAt,
    });
    if (ok) {
      await repo.markSaleSynced(s.id);
      sent += 1;
    } else {
      break; // toujours hors-ligne : inutile d'insister, on réessaiera plus tard
    }
  }
  return sent;
}

/** Solde de fidélité renvoyé par le serveur. */
export interface LoyaltyStatus {
  subscriberId: string;
  points: number;
  pointsReward: number;
  eurosPerPoint: number;
  rewardAvailable: boolean;
  enabled: boolean;
}

/** Consulte le solde fidélité par code à 6 chiffres (avant paiement). null si code inconnu. */
export async function loyaltyLookup(
  backendUrl: string,
  frigoId: string,
  code: string,
): Promise<LoyaltyStatus | null> {
  if (!backendUrl || !frigoId) return null;
  const base = backendUrl.replace(/\/$/, "");
  try {
    const res = await kioskFetch(`${base}/api/v1/public/frigos/${frigoId}/loyalty/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) return null;
    return (await res.json()) as LoyaltyStatus;
  } catch {
    return null;
  }
}

/** Échange les points contre un repas offert. Renvoie le nouveau solde, ou null si échec. */
export async function loyaltyRedeem(
  backendUrl: string,
  frigoId: string,
  code: string,
  dishId: string,
): Promise<LoyaltyStatus | null> {
  if (!backendUrl || !frigoId) return null;
  const base = backendUrl.replace(/\/$/, "");
  try {
    const res = await kioskFetch(`${base}/api/v1/public/frigos/${frigoId}/loyalty/redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, dishId }),
    });
    if (!res.ok) return null;
    return (await res.json()) as LoyaltyStatus;
  } catch {
    return null;
  }
}

/** Un plat de la carte de la borne, tel qu'affiché au client (carte complète). */
export interface MenuSnapshotDish {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  price: number; // centimes (ce que paie le client à la borne)
  allergens: string[];
  dlcDays: number | null;
  expiryDate: string | null;
  quantity: number; // nombre de casiers disponibles
  image?: { base64: string; mime: string } | null;
}

/**
 * Pousse la CARTE COMPLÈTE de la borne vers le serveur (plats + catégories + prix
 * + DLC + stock + images). Le serveur la prend comme source de vérité → l'app web
 * affiche exactement la même carte que la borne. Best-effort (silencieux hors ligne).
 */
export async function pushMenu(
  backendUrl: string,
  frigoId: string,
  dishes: MenuSnapshotDish[],
): Promise<boolean> {
  if (!backendUrl || !frigoId) return false;
  const base = backendUrl.replace(/\/$/, "");
  try {
    const res = await kioskFetch(`${base}/api/v1/public/frigos/${frigoId}/menu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dishes }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface RemoteCommand {
  id: string;
  board: string;
  boxNumber: number;
  action: "open" | "close_all";
}

/**
 * Récupère (et vide côté serveur) les commandes d'ouverture/fermeture à distance
 * empilées par le site admin pour ce frigo. Best-effort (silencieux hors ligne).
 */
export async function pullCommands(
  backendUrl: string,
  frigoId: string,
  apiKey?: string,
): Promise<RemoteCommand[]> {
  if (!backendUrl || !frigoId) return [];
  const base = backendUrl.replace(/\/$/, "");
  try {
    const res = await kioskFetch(`${base}/api/v1/public/frigos/${frigoId}/commands`, {
      headers: apiKey ? { "x-kiosk-key": apiKey } : undefined,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.commands) ? (data.commands as RemoteCommand[]) : [];
  } catch {
    return [];
  }
}

/** Test de connectivité backend (pour l'indicateur Internet de l'écran d'état). */
export async function pingBackend(backendUrl: string): Promise<boolean> {
  if (!backendUrl) return false;
  try {
    const res = await kioskFetch(`${backendUrl.replace(/\/$/, "")}/api/v1/health`);
    return res.ok;
  } catch {
    return false;
  }
}
