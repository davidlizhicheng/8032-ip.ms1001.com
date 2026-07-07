-- AlterTable
ALTER TABLE "entities" ADD COLUMN "like_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "entity_likes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity_id" TEXT NOT NULL,
    "visitor_key" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "entity_likes_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "entity_likes_entity_id_idx" ON "entity_likes"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "entity_likes_entity_id_visitor_key_key" ON "entity_likes"("entity_id", "visitor_key");
