CREATE TABLE IF NOT EXISTS "entity_editors" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "entity_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'editor',
  "granted_by" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "entity_editors_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "entity_editors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "entity_editors_entity_id_user_id_key" ON "entity_editors"("entity_id", "user_id");
CREATE INDEX IF NOT EXISTS "entity_editors_user_id_idx" ON "entity_editors"("user_id");

CREATE TABLE IF NOT EXISTS "content_revisions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "entity_id" TEXT NOT NULL,
  "user_id" TEXT,
  "action" TEXT NOT NULL,
  "before_json" TEXT,
  "after_json" TEXT,
  "note" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "content_revisions_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "content_revisions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "content_revisions_entity_id_created_at_idx" ON "content_revisions"("entity_id", "created_at");
