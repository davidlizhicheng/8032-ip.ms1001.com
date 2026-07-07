-- visibility / featured / official columns (schema had them but migration was missing)

-- entities
ALTER TABLE "entities" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'private';
ALTER TABLE "entities" ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "entities" ADD COLUMN "is_official" BOOLEAN NOT NULL DEFAULT false;

-- cards
ALTER TABLE "cards" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'private';
ALTER TABLE "cards" ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false;

-- generation job research log
ALTER TABLE "generation_job_items" ADD COLUMN "research_log" TEXT;

-- indexes
CREATE INDEX "entities_type_visibility_idx" ON "entities"("type", "visibility");
CREATE INDEX "entities_is_featured_idx" ON "entities"("is_featured");
CREATE INDEX "cards_visibility_idx" ON "cards"("visibility");

-- published entities default to public
UPDATE "entities" SET "visibility" = 'public' WHERE "status" = 'published';
