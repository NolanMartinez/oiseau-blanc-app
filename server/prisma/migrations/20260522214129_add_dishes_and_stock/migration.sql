-- CreateTable
CREATE TABLE "dishes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "allergens" TEXT[],
    "image_data" BYTEA,
    "image_mime_type" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dishes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fridge_stocks" (
    "id" TEXT NOT NULL,
    "frigo_id" TEXT NOT NULL,
    "dish_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "expiry_date" TIMESTAMP(3),
    "promo_percent" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fridge_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fridge_stocks_dish_id_idx" ON "fridge_stocks"("dish_id");

-- CreateIndex
CREATE UNIQUE INDEX "fridge_stocks_frigo_id_dish_id_key" ON "fridge_stocks"("frigo_id", "dish_id");

-- AddForeignKey
ALTER TABLE "fridge_stocks" ADD CONSTRAINT "fridge_stocks_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "dishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed des plats existants (issus du mock Bicom) — les ids sont conservés
-- pour que les lignes reviews/purchases référençant "dish-xxx" résolvent toujours.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO "dishes" ("id", "name", "category", "price", "allergens", "is_active", "created_at", "updated_at") VALUES
  ('dish-001', 'Poulet rôti aux herbes',  'Plat chaud', 8.50,  ARRAY['gluten'],                 true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dish-002', 'Taboulé maison',          'Entrée',     4.90,  ARRAY['gluten'],                 true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dish-003', 'Lasagnes bolognaise',     'Plat chaud', 7.80,  ARRAY['gluten','lait','œuf'],     true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dish-004', 'Quiche lorraine',         'Plat froid', 6.50,  ARRAY['gluten','lait','œuf'],     true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dish-005', 'Saumon en papillote',     'Plat chaud', 9.90,  ARRAY['poisson'],                true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dish-006', 'Tarte aux pommes',        'Dessert',    3.50,  ARRAY['gluten','lait','œuf'],     true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dish-007', 'Velouté de potimarron',   'Entrée',     4.80,  ARRAY['lait'],                   true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dish-008', 'Bœuf bourguignon',        'Plat chaud', 10.50, ARRAY['gluten','céleri'],        true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dish-009', 'Poulet au citron confit', 'Plat chaud', 9.10,  ARRAY['gluten'],                 true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dish-010', 'Mousse au chocolat',      'Dessert',    2.90,  ARRAY['lait','œuf'],             true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dish-011', 'Gratin dauphinois',       'Plat chaud', 7.20,  ARRAY['lait'],                   true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dish-012', 'Crème brûlée',            'Dessert',    3.20,  ARRAY['lait','œuf'],             true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "fridge_stocks" ("id", "frigo_id", "dish_id", "quantity", "created_at", "updated_at") VALUES
  (gen_random_uuid(), 'f1', 'dish-001', 5,  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'f1', 'dish-003', 3,  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'f1', 'dish-005', 2,  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'f1', 'dish-007', 8,  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'f1', 'dish-006', 6,  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'f2', 'dish-008', 4,  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'f2', 'dish-002', 9,  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'f2', 'dish-004', 7,  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'f2', 'dish-011', 5,  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'f2', 'dish-012', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'f3', 'dish-009', 0,  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'f3', 'dish-010', 0,  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("frigo_id", "dish_id") DO NOTHING;
