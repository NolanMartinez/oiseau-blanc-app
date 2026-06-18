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
        },
        image,
      );
    }
    return { ok: true, dishCount: dishes.length };
  } catch (e) {
    return { ok: false, dishCount: 0, error: e instanceof Error ? e.message : "Échec réseau" };
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
