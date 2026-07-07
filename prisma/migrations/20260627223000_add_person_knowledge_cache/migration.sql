CREATE TABLE IF NOT EXISTS "person_knowledge_cache" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "candidate_id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "url" TEXT,
  "raw_json" TEXT,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "person_knowledge_cache_name_candidate_id_key"
ON "person_knowledge_cache"("name", "candidate_id");

CREATE INDEX IF NOT EXISTS "person_knowledge_cache_name_updated_at_idx"
ON "person_knowledge_cache"("name", "updated_at");
