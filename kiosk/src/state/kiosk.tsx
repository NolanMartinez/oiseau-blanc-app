// Contexte global de la borne : charge le repo + données locales, expose les
// actions (réglages, mapping, synchro) et le menu résolu pour l'écran client.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getRepo, SETTING_KEYS, type DishCache, type Dispenser, type Locker, type Repo, type Settings } from "../db";
import { syncMenu } from "../sync";

export interface MenuItem {
  locker: Locker;
  dish: DishCache;
  imageUrl: string | null;
  priceCents: number;
}

interface KioskContextType {
  ready: boolean;
  repo: Repo | null;
  settings: Settings;
  dispensers: Dispenser[];
  lockers: Locker[];
  dishes: DishCache[];
  menuItems: MenuItem[];
  imageUrls: Record<string, string | null>;
  reload: () => Promise<void>;
  setSetting: (key: string, value: string) => Promise<void>;
  runSync: () => Promise<{ ok: boolean; dishCount: number; error?: string }>;
  setting: (key: string, fallback?: string) => string;
}

const KioskContext = createContext<KioskContextType | null>(null);

export function KioskProvider({ children }: { children: ReactNode }) {
  const [repo, setRepo] = useState<Repo | null>(null);
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>({});
  const [dispensers, setDispensers] = useState<Dispenser[]>([]);
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [dishes, setDishes] = useState<DishCache[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string | null>>({});

  const loadAll = useCallback(async (r: Repo) => {
    const [s, disp, lk, ds] = await Promise.all([
      r.getSettings(),
      r.listDispensers(),
      r.listLockers(),
      r.listDishes(),
    ]);
    setSettings(s);
    setDispensers(disp);
    setLockers(lk);
    setDishes(ds);
    // Résout les URLs d'images des plats qui en ont une.
    const urls: Record<string, string | null> = {};
    await Promise.all(
      ds.filter((d) => d.hasImage).map(async (d) => {
        urls[d.id] = await r.getDishImageUrl(d.id);
      }),
    );
    setImageUrls(urls);
  }, []);

  useEffect(() => {
    (async () => {
      const r = await getRepo();
      setRepo(r);
      await loadAll(r);
      setReady(true);
    })();
  }, [loadAll]);

  const reload = useCallback(async () => {
    if (repo) await loadAll(repo);
  }, [repo, loadAll]);

  const setSetting = useCallback(
    async (key: string, value: string) => {
      if (!repo) return;
      await repo.setSetting(key, value);
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [repo],
  );

  const runSync = useCallback(async () => {
    if (!repo) return { ok: false, dishCount: 0, error: "Repo non prêt" };
    const res = await syncMenu(
      repo,
      settings[SETTING_KEYS.backendUrl] ?? "",
      settings[SETTING_KEYS.frigoId] ?? "",
    );
    if (res.ok) await loadAll(repo);
    return res;
  }, [repo, settings, loadAll]);

  const setting = useCallback(
    (key: string, fallback = "") => settings[key] ?? fallback,
    [settings],
  );

  const menuItems = useMemo<MenuItem[]>(() => {
    const byId = new Map(dishes.map((d) => [d.id, d]));
    return lockers
      .filter((l) => l.dishId && l.state !== "error" && byId.has(l.dishId))
      .map((l) => {
        const dish = byId.get(l.dishId!)!;
        return {
          locker: l,
          dish,
          imageUrl: imageUrls[dish.id] ?? null,
          priceCents: l.price ?? dish.price,
        };
      });
  }, [lockers, dishes, imageUrls]);

  const value: KioskContextType = {
    ready,
    repo,
    settings,
    dispensers,
    lockers,
    dishes,
    menuItems,
    imageUrls,
    reload,
    setSetting,
    runSync,
    setting,
  };

  return <KioskContext.Provider value={value}>{children}</KioskContext.Provider>;
}

export function useKiosk(): KioskContextType {
  const ctx = useContext(KioskContext);
  if (!ctx) throw new Error("useKiosk must be used within KioskProvider");
  return ctx;
}
