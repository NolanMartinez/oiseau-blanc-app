import type { DishCache, Dispenser, Locker, SaleLog, Settings } from "./types";

/** Mapping d'un casier (depuis l'écran admin). */
export interface LockerMapping {
  dishId: string | null;
  price: number | null;
  expiryDate: string | null;
}

/** Image d'un plat à mettre en cache (issue de la synchro). */
export interface DishImage {
  bytes: Uint8Array;
  mime: string;
}

/**
 * Contrat d'accès aux données local-first de la borne.
 * Deux implémentations : SQLite (Tauri) et mémoire/localStorage (navigateur).
 */
export interface Repo {
  init(): Promise<void>;

  // Réglages
  getSettings(): Promise<Settings>;
  setSetting(key: string, value: string): Promise<void>;

  // Dispensers
  listDispensers(): Promise<Dispenser[]>;

  // Casiers
  listLockers(board?: string): Promise<Locker[]>;
  setLockerMapping(lockerId: number, mapping: LockerMapping): Promise<void>;
  clearLocker(lockerId: number): Promise<void>;
  setLockerState(lockerId: number, state: Locker["state"]): Promise<void>;

  // Catalogue plats (cache)
  listDishes(): Promise<DishCache[]>;
  getDishImageUrl(dishId: string): Promise<string | null>;
  upsertDish(dish: Omit<DishCache, "hasImage">, image: DishImage | null): Promise<void>;

  // Ventes
  logSale(sale: SaleLog): Promise<void>;
  listUnsyncedSales(): Promise<SaleLog[]>;
}
