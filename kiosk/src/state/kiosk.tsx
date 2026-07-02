// Contexte global de la borne : charge le repo + données locales, expose les
// actions (réglages, mapping, synchro) et le menu résolu pour l'écran client.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getRepo, SETTING_KEYS, type DishCache, type Dispenser, type Locker, type Repo, type Settings } from "../db";
import { syncMenu, pushMenu, pullCommands, resyncSales, type MenuSnapshotDish } from "../sync";
import { hardware, type HwMode } from "../hardware";
import { sortCategories, byCategoryThenName } from "../utils/categories";

export interface MenuItem {
  locker: Locker;
  dish: DishCache;
  imageUrl: string | null;
  priceCents: number;
}

/** Plat regroupé : un plat = une carte, avec tous ses casiers disponibles. */
export interface GroupedDish {
  dish: DishCache;
  imageUrl: string | null;
  priceCents: number;
  quantity: number;
  lockers: Locker[];
}

interface KioskContextType {
  ready: boolean;
  repo: Repo | null;
  settings: Settings;
  dispensers: Dispenser[];
  lockers: Locker[];
  dishes: DishCache[];
  menuItems: MenuItem[];
  groupedMenu: GroupedDish[];
  categories: string[];
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

    // Pousse la config matérielle (mode + branchements + trames) vers le Device.
    const mode: HwMode = s[SETTING_KEYS.hwMode] === "real" ? "real" : "sim";
    await hardware.setHwConfig(mode, {
      boards: Object.fromEntries(
        disp.map((d) => [
          d.board,
          { comPort: d.comPort ?? "", baud: d.baud, parity: d.parity, enabled: d.enabled },
        ]),
      ),
      frameOpen: s[SETTING_KEYS.frameOpen] ?? "02 {board} {box} {xor}",
      frameCloseAll: s[SETTING_KEYS.frameCloseAll] ?? "",
      frameClear: s[SETTING_KEYS.frameClear] ?? "",
      frameDefrost: s[SETTING_KEYS.frameDefrost] ?? "",
      boxBase: parseInt(s[SETTING_KEYS.boxBase] ?? "1", 10) || 0,
      openHoldSecs: parseInt(s[SETTING_KEYS.openHoldSecs] ?? "8", 10) || 8,
      paymentCom: s[SETTING_KEYS.paymentCom] ?? "",
      paymentBaud: parseInt(s[SETTING_KEYS.paymentBaud] ?? "115200", 10) || 115200,
      paymentTest: s[SETTING_KEYS.paymentTest] === "1",
    });

    // Pousse la carte (plats + catégories + prix + DLC + stock) vers le serveur.
    // Les PHOTOS sont gérées côté admin (source de vérité) : la borne ne pousse
    // plus les images. La sélection correspond à ce que voit le client :
    // casier rempli, pas en erreur, DLC non dépassée. Best-effort.
    const today = new Date().toISOString().slice(0, 10);
    const byId = new Map(ds.map((d) => [d.id, d]));
    const grouped = new Map<string, MenuSnapshotDish>();
    for (const l of lk) {
      if (!l.dishId || l.state === "error") continue;
      const dish = byId.get(l.dishId);
      if (!dish) continue;
      if (l.expiryDate && l.expiryDate.slice(0, 10) < today) continue; // DLC dépassée
      const existing = grouped.get(dish.id);
      if (existing) {
        existing.quantity += 1;
        if (l.expiryDate && (!existing.expiryDate || l.expiryDate < existing.expiryDate)) {
          existing.expiryDate = l.expiryDate;
        }
      } else {
        grouped.set(dish.id, {
          id: dish.id,
          name: dish.name,
          category: dish.category,
          description: dish.description,
          price: l.price ?? dish.price,
          allergens: dish.allergens,
          dlcDays: dish.dlcDays,
          expiryDate: l.expiryDate,
          quantity: 1,
        });
      }
    }
    const menuSnapshot = [...grouped.values()];
    void pushMenu(s[SETTING_KEYS.backendUrl] ?? "", s[SETTING_KEYS.frigoId] ?? "", menuSnapshot);
  }, []);

  useEffect(() => {
    (async () => {
      const r = await getRepo();
      setRepo(r);
      await loadAll(r);
      setReady(true);
      // Récupère depuis le serveur les images (et libellés) définis côté admin,
      // puis rafraîchit l'affichage → les photos admin apparaissent sur la borne.
      const s = await r.getSettings();
      const backend = s[SETTING_KEYS.backendUrl] ?? "";
      const frigo = s[SETTING_KEYS.frigoId] ?? "";
      if (backend && frigo) {
        const res = await syncMenu(r, backend, frigo);
        if (res.ok) await loadAll(r);
      }
    })();
  }, [loadAll]);

  // Réf vers les réglages courants pour la boucle de polling (évite de relancer
  // le minuteur à chaque changement de réglage).
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Ouverture/fermeture à distance : interroge le serveur toutes les 3 s et
  // exécute en local les commandes empilées par le site admin. La borne doit être
  // en ligne. Best-effort (silencieux hors ligne).
  useEffect(() => {
    if (!ready) return;
    let running = false;
    const tick = async () => {
      if (running) return; // évite le chevauchement (un seul port COM)
      running = true;
      try {
        const s = settingsRef.current;
        const backendUrl = s[SETTING_KEYS.backendUrl] ?? "";
        const frigoId = s[SETTING_KEYS.frigoId] ?? "";
        if (!backendUrl || !frigoId) return;
        const cmds = await pullCommands(backendUrl, frigoId);
        for (const c of cmds) {
          try {
            if (c.action === "close_all") await hardware.closeAll(c.board || "A");
            else await hardware.openLocker(c.board || "A", c.boxNumber);
          } catch {
            /* échec matériel : ignoré, l'opérateur relancera */
          }
        }
      } finally {
        running = false;
      }
    };
    const iv = window.setInterval(() => void tick(), 3000);
    return () => window.clearInterval(iv);
  }, [ready]);

  // Rafraîchissement périodique des PRODUITS : récupère les changements faits dans
  // l'admin (nom, prix, DLC, photo, disponibilité) toutes les 45 s, sans redémarrer
  // la borne → on ne vend plus un produit modifié depuis le dernier démarrage.
  useEffect(() => {
    if (!ready || !repo) return;
    let running = false;
    const tick = async () => {
      if (running) return;
      running = true;
      try {
        const s = settingsRef.current;
        const backend = s[SETTING_KEYS.backendUrl] ?? "";
        const frigo = s[SETTING_KEYS.frigoId] ?? "";
        if (backend && frigo) {
          const res = await syncMenu(repo, backend, frigo);
          if (res.ok) await loadAll(repo);
          // Mode dégradé : renvoie les ventes accumulées hors-ligne.
          await resyncSales(repo, backend, frigo);
        }
      } finally {
        running = false;
      }
    };
    const iv = window.setInterval(() => void tick(), 45000);
    return () => window.clearInterval(iv);
  }, [ready, repo, loadAll]);

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
    const today = new Date().toISOString().slice(0, 10);
    // DLC dépassée -> le plat n'est plus proposé à l'achat (casier exclu du menu).
    const notExpired = (l: Locker) => !l.expiryDate || l.expiryDate.slice(0, 10) >= today;
    return lockers
      .filter((l) => l.dishId && l.state !== "error" && byId.has(l.dishId) && notExpired(l))
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

  // Regroupement par plat : une entrée par dish.id, avec la liste des casiers.
  const groupedMenu = useMemo<GroupedDish[]>(() => {
    const map = new Map<string, GroupedDish>();
    for (const item of menuItems) {
      const existing = map.get(item.dish.id);
      if (existing) {
        existing.lockers.push(item.locker);
        existing.quantity += 1;
      } else {
        map.set(item.dish.id, {
          dish: item.dish,
          imageUrl: item.imageUrl,
          priceCents: item.priceCents,
          quantity: 1,
          lockers: [item.locker],
        });
      }
    }
    return [...map.values()].sort((a, b) =>
      byCategoryThenName(a.dish.category, a.dish.name, b.dish.category, b.dish.name),
    );
  }, [menuItems]);

  // Catégories affichées : uniquement celles qui ont au moins un plat disponible
  // (groupedMenu exclut déjà les casiers vides/périmés), dans l'ordre voulu.
  const categories = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const g of groupedMenu) if (g.dish.category) set.add(g.dish.category);
    return sortCategories([...set]);
  }, [groupedMenu]);

  const value: KioskContextType = {
    ready,
    repo,
    settings,
    dispensers,
    lockers,
    dishes,
    menuItems,
    groupedMenu,
    categories,
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
