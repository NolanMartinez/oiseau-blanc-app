// Implémentation Repo sur SQLite via tauri-plugin-sql (borne réelle).
import Database from "@tauri-apps/plugin-sql";
import type { DishImage, LockerMapping, Repo } from "./repo";
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
      "SELECT board, com_port, box_count, enabled FROM dispensers ORDER BY board",
    );
    return rows.map((r) => ({
      board: r.board,
      comPort: r.com_port,
      boxCount: r.box_count,
      enabled: !!r.enabled,
    }));
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
      "SELECT id, name, category, description, price, allergens, image_mime, updated_at, (image_blob IS NOT NULL) AS has_image FROM dishes_cache ORDER BY name",
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      description: r.description,
      price: r.price,
      allergens: safeJson(r.allergens),
      hasImage: !!r.has_image,
      imageMime: r.image_mime,
      updatedAt: r.updated_at,
    }));
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

  async upsertDish(dish: Omit<DishCache, "hasImage">, image: DishImage | null): Promise<void> {
    this.imageUrls.delete(dish.id);
    if (image) {
      await this.db.execute(
        `INSERT INTO dishes_cache (id, name, category, description, price, allergens, image_blob, image_mime, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT(id) DO UPDATE SET name=$2, category=$3, description=$4, price=$5, allergens=$6, image_blob=$7, image_mime=$8, updated_at=$9`,
        [
          dish.id, dish.name, dish.category, dish.description, dish.price,
          JSON.stringify(dish.allergens), Array.from(image.bytes), image.mime, dish.updatedAt,
        ],
      );
    } else {
      await this.db.execute(
        `INSERT INTO dishes_cache (id, name, category, description, price, allergens, image_mime, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT(id) DO UPDATE SET name=$2, category=$3, description=$4, price=$5, allergens=$6, image_mime=$7, updated_at=$8`,
        [
          dish.id, dish.name, dish.category, dish.description, dish.price,
          JSON.stringify(dish.allergens), dish.imageMime, dish.updatedAt,
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

function rowToLocker(r: any): Locker {
  return {
    id: r.id,
    board: r.board,
    boxNumber: r.box_number,
    dishId: r.dish_id,
    price: r.price,
    expiryDate: r.expiry_date,
    state: r.state,
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
