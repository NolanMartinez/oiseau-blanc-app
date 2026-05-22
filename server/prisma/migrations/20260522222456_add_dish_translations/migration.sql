-- CreateTable
CREATE TABLE "dish_translations" (
    "id" TEXT NOT NULL,
    "dish_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dish_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dish_translations_dish_id_idx" ON "dish_translations"("dish_id");

-- CreateIndex
CREATE UNIQUE INDEX "dish_translations_dish_id_language_key" ON "dish_translations"("dish_id", "language");

-- AddForeignKey
ALTER TABLE "dish_translations" ADD CONSTRAINT "dish_translations_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "dishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
