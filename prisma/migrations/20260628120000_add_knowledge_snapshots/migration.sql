-- CreateTable
CREATE TABLE "knowledge_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity_id" TEXT,
    "entity_name" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "raw_text" TEXT,
    "clean_text" TEXT NOT NULL,
    "char_count" INTEGER NOT NULL DEFAULT 0,
    "fetch_status" TEXT NOT NULL DEFAULT 'ok',
    "fetched_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_snapshots_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "knowledge_snapshots_entity_name_entity_type_idx" ON "knowledge_snapshots"("entity_name", "entity_type");

-- CreateIndex
CREATE INDEX "knowledge_snapshots_entity_id_idx" ON "knowledge_snapshots"("entity_id");
