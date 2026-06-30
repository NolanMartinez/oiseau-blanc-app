/**
 * État runtime des frigos (en mémoire) : dernière fois vue (synchro/stock poussé
 * par la borne) + dernière température connue. Sert à afficher « en ligne » et la
 * dernière synchro côté app web, sans table dédiée.
 */
interface Status {
  temperature: number | null;
  lastSeen: number;
}

const store = new Map<string, Status>();
const ONLINE_MS = 10 * 60 * 1000; // vu il y a moins de 10 min = en ligne

export function markSeen(frigoId: string, temperature?: number | null): void {
  const prev = store.get(frigoId);
  store.set(frigoId, {
    temperature: temperature !== undefined ? temperature : prev?.temperature ?? null,
    lastSeen: Date.now(),
  });
}

export function getStatus(frigoId: string): {
  online: boolean;
  temperature: number | null;
  lastSync: string;
} {
  const s = store.get(frigoId);
  if (!s) {
    return { online: false, temperature: null, lastSync: new Date(0).toISOString() };
  }
  return {
    online: Date.now() - s.lastSeen < ONLINE_MS,
    temperature: s.temperature,
    lastSync: new Date(s.lastSeen).toISOString(),
  };
}
