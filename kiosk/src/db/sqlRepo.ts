// Implémentation Repo sur SQLite via tauri-plugin-sql (borne réelle).
import Database from "@tauri-apps/plugin-sql";
import type { DishImage, DispenserLink, LockerMapping, Repo } from "./repo";
import type { DishCache, Dispenser, Locker, SaleLog, Settings } from "./types";

const DB_URL = "sqlite:kiosk.db";

export class SqlRepo implements Repo {
  private db!: Database;
  private imageUrls = new Map<string, string>();

  async init(): Promise<void> {
    this.db = await Database.load(DB_URL);
  }

  async getSettings(): Promise<Settings> {
    const rows = await this.db.select<{ key: string; value: string }[]>(
      "SELECT key, value FROM settings",
    );
    const out: Settings = {};
    for (const r of rows) out[r.key] = r.value ?? "";
    return out;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.db.execute(
      "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $2",
      [key, value],
    );
  }

  async listDispensers(): Promise<Dispenser[]> {
    const rows = await this.db.select<any[]>(
      "SELECT board, com_port, box_count, enabled, baud, parity FROM dispensers ORDER BY board",
    );
    return rows.map((r) => ({
      board: r.board,
      comPort: r.com_port,
      boxCount: r.box_count,
      enabled: !!r.enabled,
      baud: r.baud ?? 9600,
      parity: r.parity ?? "none",
    }));
  }

  async setDispenserLink(board: string, link: DispenserLink): Promise<void> {
    // Crée la carte si elle n'existe pas encore (ex: carte B/C ajoutée).
    await this.db.execute(
      `INSERT INTO dispensers (board, com_port, box_count, enabled, baud, parity)
       VALUES ($1, $2, 32, $3, $4, $5)
       ON CONFLICT(board) DO UPDATE SET com_port=$2, enabled=$3, baud=$4, parity=$5`,
      [board, link.comPort, link.enabled ? 1 : 0, link.baud, link.parity],
    );
    // Garantit l'existence des 32 casiers de cette carte.
    await this.db.execute(
      `WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 32)
       INSERT OR IGNORE INTO lockers (board, box_number, state) SELECT $1, n, 'idle' FROM seq`,
      [board],
    );
  }

  async listLockers(board?: string): Promise<Locker[]> {
    const sql = board
      ? "SELECT * FROM lockers WHERE board = $1 ORDER BY box_number"
      : "SELECT * FROM lockers ORDER BY board, box_number";
    const rows = await this.db.select<any[]>(sql, board ? [board] : []);
    return rows.map(rowToLocker);
  }

  async setLockerMapping(lockerId: number, m: LockerMapping): Promise<void> {
    await this.db.execute(
      "UPDATE lockers SET dish_id = $1, price = $2, expiry_date = $3 WHERE id = $4",
      [m.dishId, m.price, m.expiryDate, lockerId],
    );
  }

  async setLockerAddress(lockerId: number, address: number | null): Promise<void> {
    await this.db.execute("UPDATE lockers SET address = $1 WHERE id = $2", [address, lockerId]);
  }

  async clearLocker(lockerId: number): Promise<void> {
    await this.db.execute(
      "UPDATE lockers SET dish_id = NULL, price = NULL, expiry_date = NULL, state = 'idle' WHERE id = $1",
      [lockerId],
    );
  }

  async setLockerState(lockerId: number, state: Locker["state"]): Promise<void> {
    await this.db.execute("UPDATE lockers SET state = $1 WHERE id = $2", [state, lockerId]);
  }

  async listDishes(): Promise<DishCache[]> {
    const rows = await this.db.select<any[]>(
      "SELECT id, name, category, description, price, allergens, image_mime, updated_at, barcode, dlc_days, (image_blob IS NOT NULL) AS has_image FROM dishes_cache ORDER BY name",
    );
    return rows.map(rowToDish);
  }

  async getDishByBarcode(barcode: string): Promise<DishCache | null> {
    const rows = await this.db.select<any[]>(
      "SELECT id, name, category, description, price, allergens, image_mime, updated_at, barcode, dlc_days, (image_blob IS NOT NULL) AS has_image FROM dishes_cache WHERE barcode = $1 LIMIT 1",
      [barcode],
    );
    return rows[0] ? rowToDish(rows[0]) : null;
  }

  async setDishBarcode(dishId: string, barcode: string | null): Promise<void> {
    await this.db.execute("UPDATE dishes_cache SET barcode = $1 WHERE id = $2", [barcode, dishId]);
  }

  async getDishImageUrl(dishId: string): Promise<string | null> {
    if (this.imageUrls.has(dishId)) return this.imageUrls.get(dishId)!;
    const rows = await this.db.select<any[]>(
      "SELECT image_blob, image_mime FROM dishes_cache WHERE id = $1",
      [dishId],
    );
    const row = rows[0];
    if (!row || !row.image_blob) return null;
    const bytes = Uint8Array.from(row.image_blob as number[]);
    const url = URL.createObjectURL(new Blob([bytes], { type: row.image_mime ?? "image/jpeg" }));
    this.imageUrls.set(dishId, url);
    return url;
  }

  async upsertDish(dish: Omit<DishCache, "hasImage" | "barcode">, image: DishImage | null): Promise<void> {
    this.imageUrls.delete(dish.id);
    if (image) {
      await this.db.execute(
        `INSERT INTO dishes_cache (id, name, category, description, price, allergens, image_blob, image_mime, updated_at, dlc_days)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT(id) DO UPDATE SET name=$2, category=$3, description=$4, price=$5, allergens=$6, image_blob=$7, image_mime=$8, updated_at=$9, dlc_days=$10`,
        [
          dish.id, dish.name, dish.category, dish.description, dish.price,
          JSON.stringify(dish.allergens), Array.from(image.bytes), image.mime, dish.updatedAt, dish.dlcDays,
        ],
      );
    } else {
      await this.db.execute(
        `INSERT INTO dishes_cache (id, name, category, description, price, allergens, image_mime, updated_at, dlc_days)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT(id) DO UPDATE SET name=$2, category=$3, description=$4, price=$5, allergens=$6, image_mime=$7, updated_at=$8, dlc_days=$9`,
        [
          dish.id, dish.name, dish.category, dish.description, dish.price,
          JSON.stringify(dish.allergens), dish.imageMime, dish.updatedAt, dish.dlcDays,
        ],
      );
    }
  }

  async logSale(sale: SaleLog): Promise<void> {
    await this.db.execute(
      "INSERT INTO sales_log (locker_id, dish_id, amount, mode, paid_at, synced) VALUES ($1,$2,$3,$4,$5,$6)",
      [sale.lockerId, sale.dishId, sale.amount, sale.mode, sale.paidAt, sale.synced ? 1 : 0],
    );
  }

  async listUnsyncedSales(): Promise<SaleLog[]> {
    const rows = await this.db.select<any[]>("SELECT * FROM sales_log WHERE synced = 0");
    return rows.map((r) => ({
      id: r.id,
      lockerId: r.locker_id,
      dishId: r.dish_id,
      amount: r.amount,
      mode: r.mode,
      paidAt: r.paid_at,
      synced: !!r.synced,
    }));
  }
}

function rowToDish(r: any): DishCache {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    description: r.description,
    price: r.price,
    allergens: safeJson(r.allergens),
    hasImage: !!r.has_image,
    imageMime: r.image_mime,
    updatedAt: r.updated_at,
    barcode: r.barcode ?? null,
    dlcDays: r.dlc_days ?? null,
  };
}

function rowToLocker(r: any): Locker {
  return {
    id: r.id,
    board: r.board,
    boxNumber: r.box_number,
    dishId: r.dish_id,
    price: r.price,
    expiryDate: r.expiry_date,
    state: r.state,
    address: r.address ?? null,
  };
}

function safeJson(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
