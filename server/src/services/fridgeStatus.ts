/**
 * État runtime des frigos (en mémoire) : dernière fois vue (synchro/stock poussé
 * par la borne) + dernière température connue. Sert à afficher « en ligne » et la
 * dernière synchro côté app web, sans table dédiée.
 */
interface Status {
  temperature: number | null;
  lastSeen: number;
  tpeOk: boolean | null; // état du terminal de paiement remonté par la borne
  tpeDetail: string | null;
  tpeAt: number | null; // horodatage du dernier diagnostic TPE
}

const store = new Map<string, Status>();
const ONLINE_MS = 10 * 60 * 1000; // vu il y a moins de 10 min = en ligne

export function markSeen(frigoId: string, temperature?: number | null): void {
  const prev = store.get(frigoId);
  store.set(frigoId, {
    temperature: temperature !== undefined ? temperature : prev?.temperature ?? null,
    lastSeen: Date.now(),
    tpeOk: prev?.tpeOk ?? null,
    tpeDetail: prev?.tpeDetail ?? null,
    tpeAt: prev?.tpeAt ?? null,
  });
}

/** Remonte l'état du TPE (terminal de paiement) diagnostiqué par la borne. */
export function markTpe(frigoId: string, ok: boolean, detail?: string | null): void {
  const prev = store.get(frigoId);
  store.set(frigoId, {
    temperature: prev?.temperature ?? null,
    lastSeen: Date.now(), // une remontée TPE prouve aussi que la borne est en ligne
    tpeOk: ok,
    tpeDetail: detail ?? null,
    tpeAt: Date.now(),
  });
}

export function getStatus(frigoId: string): {
  online: boolean;
  temperature: number | null;
  lastSync: string;
  tpeOk: boolean | null;
  tpeDetail: string | null;
  tpeAt: string | null;
} {
  const s = store.get(frigoId);
  if (!s) {
    return { online: false, temperature: null, lastSync: new Date(0).toISOString(), tpeOk: null, tpeDetail: null, tpeAt: null };
  }
  return {
    online: Date.now() - s.lastSeen < ONLINE_MS,
    temperature: s.temperature,
    lastSync: new Date(s.lastSeen).toISOString(),
    tpeOk: s.tpeOk,
    tpeDetail: s.tpeDetail,
    tpeAt: s.tpeAt ? new Date(s.tpeAt).toISOString() : null,
  };
}
