// Types métier de la borne (miroir du schéma SQLite, prix en centimes).

export interface Dispenser {
  board: string; // 'A'..'E'
  comPort: string | null;
  boxCount: number;
  enabled: boolean;
  baud: number;
  parity: string; // 'none' | 'even' | 'odd'
}

export interface Locker {
  id: number;
  board: string;
  boxNumber: number; // 1..32
  dishId: string | null;
  price: number | null; // centimes — surcharge éventuelle du prix du plat
  expiryDate: string | null;
  state: "idle" | "open" | "error";
  address: number | null; // adresse physique de la porte (défaut = boxNumber)
}

export interface DishCache {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  price: number; // centimes
  allergens: string[];
  hasImage: boolean;
  imageMime: string | null;
  updatedAt: string | null;
  barcode: string | null; // code-barres produit (douchette)
}

export interface SaleLog {
  id?: number;
  lockerId: number;
  dishId: string | null;
  amount: number; // centimes
  mode: "paid" | "free";
  paidAt: string;
  synced: boolean;
}

export type Settings = Record<string, string>;

/** Réglages reconnus (clés). */
export const SETTING_KEYS = {
  frigoId: "frigo_id",
  backendUrl: "backend_url",
  mainboardA: "mainboard_a",
  mainboardB: "mainboard_b",
  mainboardC: "mainboard_c",
  mainboardD: "mainboard_d",
  mainboardE: "mainboard_e",
  paymentCom: "payment_com",
  mdbEnabled: "mdb_enabled",
  venteLibre: "vente_libre",
  tempThresholdF: "temp_threshold_f",
  tempThresholdC: "temp_threshold_c",
  alarmDelay: "alarm_delay",
  currency: "currency",
  adminPin: "admin_pin",
  langDefault: "lang_default",
  hwMode: "hw_mode",
  frameOpen: "frame_open",
  frameCloseAll: "frame_close_all",
  frameClear: "frame_clear",
  frameDefrost: "frame_defrost",
  boxBase: "box_base",
  machineName: "machine_name",
  coldType: "cold_type",
} as const;
