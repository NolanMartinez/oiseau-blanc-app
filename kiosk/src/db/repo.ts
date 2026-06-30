import type { DishCache, Dispenser, Locker, SaleLog, Settings } from "./types";

/** Mapping d'un casier (depuis l'écran admin). */
export interface LockerMapping {
  dishId: string | null;
  price: number | null;
  expiryDate: string | null;
}

/** Branchement d'une carte (page Liaisons). */
export interface DispenserLink {
  comPort: string | null;
  baud: number;
  parity: string;
  enabled: boolean;
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
  setDispenserLink(board: string, link: DispenserLink): Promise<void>;

  // Casiers
  listLockers(board?: string): Promise<Locker[]>;
  setLockerMapping(lockerId: number, mapping: LockerMapping): Promise<void>;
  setLockerAddress(lockerId: number, address: number | null): Promise<void>;
  clearLocker(lockerId: number): Promise<void>;
  setLockerState(lockerId: number, state: Locker["state"]): Promise<void>;

  // Catalogue plats (cache)
  listDishes(): Promise<DishCache[]>;
  getDishImageUrl(dishId: string): Promise<string | null>;
  // Image brute en base64 (pour remonter la carte complète au serveur).
  getDishImageBase64(dishId: string): Promise<{ base64: string; mime: string } | null>;
  // La synchro ne touche pas au code-barres (géré localement par l'opérateur).
  upsertDish(dish: Omit<DishCache, "hasImage" | "barcode">, image: DishImage | null): Promise<void>;
  getDishByBarcode(barcode: string): Promise<DishCache | null>;
  setDishBarcode(dishId: string, barcode: string | null): Promise<void>;

  // Ventes
  logSale(sale: SaleLog): Promise<void>;
  listUnsyncedSales(): Promise<SaleLog[]>;
}
