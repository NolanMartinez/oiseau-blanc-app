-- Schéma initial de la borne (SQLite). Local-first : tout vit ici.

-- Cartes / dispensers physiques (A–E), chacune reliée à un port COM.
CREATE TABLE IF NOT EXISTS dispensers (
  board      TEXT PRIMARY KEY,            -- 'A'..'E'
  com_port   TEXT,                        -- ex. 'COM1'
  box_count  INTEGER NOT NULL DEFAULT 32,
  enabled    INTEGER NOT NULL DEFAULT 1
);

-- Casiers : mapping casier -> plat + prix + DLC. Cœur de l'admin.
CREATE TABLE IF NOT EXISTS lockers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  board       TEXT NOT NULL,
  box_number  INTEGER NOT NULL,           -- 1..32
  dish_id     TEXT,                        -- réf. dishes_cache.id (nullable = vide)
  price       INTEGER,                     -- en centimes (surcharge éventuelle)
  expiry_date TEXT,                        -- ISO date (nullable)
  state       TEXT NOT NULL DEFAULT 'idle',-- 'idle' | 'open' | 'error'
  UNIQUE (board, box_number),
  FOREIGN KEY (board) REFERENCES dispensers(board)
);

-- Cache du catalogue plats, rempli par la synchro depuis le backend.
CREATE TABLE IF NOT EXISTS dishes_cache (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT,
  description TEXT,
  price       INTEGER NOT NULL DEFAULT 0,  -- en centimes
  allergens   TEXT NOT NULL DEFAULT '[]',  -- JSON array
  image_blob  BLOB,
  image_mime  TEXT,
  updated_at  TEXT
);

-- Réglages clé/valeur de la borne.
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Journal local des ventes (remontée backend = phase ultérieure).
CREATE TABLE IF NOT EXISTS sales_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  locker_id  INTEGER,
  dish_id    TEXT,
  amount     INTEGER NOT NULL DEFAULT 0,   -- en centimes
  mode       TEXT NOT NULL DEFAULT 'paid', -- 'paid' | 'free'
  paid_at    TEXT NOT NULL,
  synced     INTEGER NOT NULL DEFAULT 0
);

-- ── Seed ────────────────────────────────────────────────────────────────────

-- Dispenser A par défaut sur COM1.
INSERT OR IGNORE INTO dispensers (board, com_port, box_count, enabled)
VALUES ('A', 'COM1', 32, 1);

-- 32 casiers vides pour le dispenser A.
WITH RECURSIVE seq(n) AS (
  SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 32
)
INSERT OR IGNORE INTO lockers (board, box_number, state)
SELECT 'A', n, 'idle' FROM seq;

-- Réglages par défaut (calqués sur les captures de l'ancien logiciel).
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('frigo_id',        ''),
  ('backend_url',     'http://localhost:3001'),
  ('mainboard_a',     'COM1'),
  ('mainboard_b',     ''),
  ('mainboard_c',     ''),
  ('mainboard_d',     ''),
  ('mainboard_e',     ''),
  ('payment_com',     'COM2'),
  ('mdb_enabled',     '0'),
  ('vente_libre',     '1'),
  ('temp_threshold_f','-15'),
  ('temp_threshold_c','10'),
  ('alarm_delay',     '180'),
  ('currency',        'EUR'),
  ('admin_pin',       '1234'),
  ('lang_default',    'fr');
