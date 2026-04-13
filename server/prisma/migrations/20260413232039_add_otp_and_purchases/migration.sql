-- CreateTable
CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "subscriber_id" TEXT NOT NULL,
    "dish_id" TEXT NOT NULL,
    "frigo_id" TEXT NOT NULL,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otp_codes_contact_idx" ON "otp_codes"("contact");

-- CreateIndex
CREATE INDEX "purchases_subscriber_id_idx" ON "purchases"("subscriber_id");

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
