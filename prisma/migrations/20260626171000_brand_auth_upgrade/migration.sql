-- AlterTable
ALTER TABLE "users" ADD COLUMN "unified_username" TEXT;
ALTER TABLE "users" ADD COLUMN "display_name" TEXT;
ALTER TABLE "users" ADD COLUMN "brand_upgrade_at" DATETIME;

-- CreateTable
CREATE TABLE "brand_upgrade_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "entity_id" TEXT,
    "card_id" TEXT,
    "plan_id" TEXT NOT NULL DEFAULT 'brand_upgrade_500',
    "amount_yuan" INTEGER NOT NULL DEFAULT 500,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "external_ref" TEXT,
    "paid_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brand_upgrade_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "brand_upgrade_orders_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "brand_upgrade_orders_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_unified_username_key" ON "users"("unified_username");

-- CreateIndex
CREATE INDEX "brand_upgrade_orders_user_id_status_idx" ON "brand_upgrade_orders"("user_id", "status");
