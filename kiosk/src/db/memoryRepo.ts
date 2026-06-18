// Implémentation Repo en mémoire + localStorage — repli navigateur (dev/preview
// UI sans Tauri/SQLite). Reproduit le seed de la migration SQL.
import type { DishImage, DispenserLink, LockerMapping, Repo } from "./repo";
import type { DishCache, Dispenser, Locker, SaleLog, Settings } from "./types";
import { SETTING_KEYS } from "./types";

interface Store {
  settings: Settings;
  dispensers: Dispenser[];
  lockers: Locker[];
  dishes: (Omit<DishCache, "hasImage"> & { imageUrl: string | null })[];
  sales: SaleLog[];
}

const LS_KEY = "friggo_kiosk_store";

function defaultStore(): Store {
  const settings: Settings = {
    [SETTING_KEYS.frigoId]: "",
    [SETTING_KEYS.backendUrl]: "http://localhost:3001",
    [SETTING_KEYS.mainboardA]: "COM1",
    [SETTING_KEYS.mainboardB]: "",
    [SETTING_KEYS.mainboardC]: "",
    [SETTING_KEYS.mainboardD]: "",
    [SETTING_KEYS.mainboardE]: "",
    [SETTING_KEYS.paymentCom]: "COM2",
    [SETTING_KEYS.mdbEnabled]: "0",
    [SETTING_KEYS.venteLibre]: "1",
    [SETTING_KEYS.tempThresholdF]: "-15",
    [SETTING_KEYS.tempThresholdC]: "10",
    [SETTING_KEYS.alarmDelay]: "180",
    [SETTING_KEYS.currency]: "EUR",
    [SETTING_KEYS.adminPin]: "1234",
    [SETTING_KEYS.langDefault]: "fr",
    [SETTING_KEYS.hwMode]: "sim",
    [SETTING_KEYS.frameOpen]: "02 {board} {box} {xor}",
    [SETTING_KEYS.frameCloseAll]: "",
    [SETTING_KEYS.frameClear]: "",
    [SETTING_KEYS.frameDefrost]: "",
    [SETTING_KEYS.boxBase]: "1",
    [SETTING_KEYS.machineName]: "Frigo 1",
    [SETTING_KEYS.coldType]: "frozen",
  };
  const lockers: Locker[] = Array.from({ length: 32 }, (_, i) => ({
    id: i + 1,
    board: "A",
    boxNumber: i + 1,
    dishId: null,
    price: null,
    expiryDate: null,
    state: "idle" as const,
    address: null,
  }));
  return {
    settings,
    dispensers: [{ board: "A", comPort: "COM1", boxCount: 32, enabled: true, baud: 9600, parity: "none" }],
    lockers,
    dishes: [],
    sales: [],
  };
}

export class MemoryRepo implements Repo {
  private store: Store = defaultStore();

  async init(): Promise<void> {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) this.store = { ...defaultStore(), ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
  }

  private persist() {
    try {
      // On ne sérialise pas les object URLs (non réutilisables après reload).
      const { dishes, ...rest } = this.store;
      const dishesNoUrl = dishes.map((d) => ({ ...d, imageUrl: null }));
      localStorage.setItem(LS_KEY, JSON.stringify({ ...rest, dishes: dishesNoUrl }));
    } catch {
      /* quota / private mode */
    }
  }

  async getSettings(): Promise<Settings> {
    return { ...this.store.settings };
  }

  async setSetting(key: string, value: string): Promise<void> {
    this.store.settings[key] = value;
    this.persist();
  }

  async listDispensers(): Promise<Dispenser[]> {
    return [...this.store.dispensers];
  }

  async setDispenserLink(board: string, link: DispenserLink): Promise<void> {
    let d = this.store.dispensers.find((x) => x.board === board);
    if (!d) {
      d = { board, comPort: link.comPort, boxCount: 32, enabled: link.enabled, baud: link.baud, parity: link.parity };
      this.store.dispensers.push(d);
      // Crée les 32 casiers de la nouvelle carte.
      const startId = this.store.lockers.length;
      for (let i = 1; i <= 32; i++) {
        this.store.lockers.push({
          id: startId + i,
          board,
          boxNumber: i,
          dishId: null,
          price: null,
          expiryDate: null,
          state: "idle",
          address: null,
        });
      }
    } else {
      d.comPort = link.comPort;
      d.enabled = link.enabled;
      d.baud = link.baud;
      d.parity = link.parity;
    }
    this.persist();
  }

  async listLockers(board?: string): Promise<Locker[]> {
    const all = [...this.store.lockers].sort(
      (a, b) => a.board.localeCompare(b.board) || a.boxNumber - b.boxNumber,
    );
    return board ? all.filter((l) => l.board === board) : all;
  }

  async setLockerMapping(lockerId: number, m: LockerMapping): Promise<void> {
    const l = this.store.lockers.find((x) => x.id === lockerId);
    if (l) {
      l.dishId = m.dishId;
      l.price = m.price;
      l.expiryDate = m.expiryDate;
      this.persist();
    }
  }

  async setLockerAddress(lockerId: number, address: number | null): Promise<void> {
    const l = this.store.lockers.find((x) => x.id === lockerId);
    if (l) {
      l.address = address;
      this.persist();
    }
  }

  async clearLocker(lockerId: number): Promise<void> {
    const l = this.store.lockers.find((x) => x.id === lockerId);
    if (l) {
      l.dishId = null;
      l.price = null;
      l.expiryDate = null;
      l.state = "idle";
      this.persist();
    }
  }

  async setLockerState(lockerId: number, state: Locker["state"]): Promise<void> {
    const l = this.store.lockers.find((x) => x.id === lockerId);
    if (l) {
      l.state = state;
      this.persist();
    }
  }

  async listDishes(): Promise<DishCache[]> {
    return this.store.dishes.map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      description: d.description,
      price: d.price,
      allergens: d.allergens,
      hasImage: !!d.imageUrl,
      imageMime: d.imageMime,
      updatedAt: d.updatedAt,
      barcode: d.barcode ?? null,
    }));
  }

  async getDishImageUrl(dishId: string): Promise<string | null> {
    return this.store.dishes.find((d) => d.id === dishId)?.imageUrl ?? null;
  }

  async upsertDish(
    dish: Omit<DishCache, "hasImage" | "barcode">,
    image: DishImage | null,
  ): Promise<void> {
    const url = image
      ? URL.createObjectURL(new Blob([image.bytes], { type: image.mime }))
      : null;
    const existing = this.store.dishes.find((d) => d.id === dish.id);
    if (existing) {
      // On préserve le code-barres (géré localement, hors synchro).
      Object.assign(existing, dish, { imageUrl: url ?? existing.imageUrl });
    } else {
      this.store.dishes.push({ ...dish, barcode: null, imageUrl: url });
    }
    this.persist();
  }

  async getDishByBarcode(barcode: string): Promise<DishCache | null> {
    const d = this.store.dishes.find((x) => x.barcode === barcode);
    if (!d) return null;
    return {
      id: d.id,
      name: d.name,
      category: d.category,
      description: d.description,
      price: d.price,
      allergens: d.allergens,
      hasImage: !!d.imageUrl,
      imageMime: d.imageMime,
      updatedAt: d.updatedAt,
      barcode: d.barcode ?? null,
    };
  }

  async setDishBarcode(dishId: string, barcode: string | null): Promise<void> {
    const d = this.store.dishes.find((x) => x.id === dishId);
    if (d) {
      d.barcode = barcode;
      this.persist();
    }
  }

  async logSale(sale: SaleLog): Promise<void> {
    this.store.sales.push({ ...sale, id: this.store.sales.length + 1 });
    this.persist();
  }

  async listUnsyncedSales(): Promise<SaleLog[]> {
    return this.store.sales.filter((s) => !s.synced);
  }
}
