-- CreateTable
CREATE TABLE "entities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subtype" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "owner_user_id" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_ai_generated" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "entity_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity_id" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "summary" TEXT,
    "slogan" TEXT,
    "avatar_url" TEXT,
    "cover_url" TEXT,
    "content_json" TEXT NOT NULL,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'business_gold_dark',
    CONSTRAINT "entity_profiles_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "entity_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity_id" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content_json" TEXT NOT NULL,
    "score_json" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "entity_reports_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "entity_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "excerpt" TEXT,
    "confidence_score" REAL NOT NULL DEFAULT 0.5,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "entity_sources_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "entity_relations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "from_entity_id" TEXT NOT NULL,
    "to_entity_id" TEXT NOT NULL,
    "relation_type" TEXT NOT NULL,
    "label" TEXT,
    CONSTRAINT "entity_relations_from_entity_id_fkey" FOREIGN KEY ("from_entity_id") REFERENCES "entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "entity_relations_to_entity_id_fkey" FOREIGN KEY ("to_entity_id") REFERENCES "entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "news_articles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT,
    "published_at" TEXT,
    "excerpt" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "news_articles_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "generation_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "job_type" TEXT NOT NULL,
    "input_text" TEXT NOT NULL,
    "entity_type" TEXT,
    "generate_page" BOOLEAN NOT NULL DEFAULT true,
    "generate_report" BOOLEAN NOT NULL DEFAULT true,
    "fetch_news" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "error_log" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "generation_job_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "job_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "generation_job_items_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "generation_jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "generation_job_items_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "claim_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity_id" TEXT NOT NULL,
    "user_id" TEXT,
    "claim_type" TEXT NOT NULL,
    "proof_text" TEXT,
    "proof_files" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "review_note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "claim_requests_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "claim_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "risk_flags" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_leads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "card_id" TEXT,
    "entity_id" TEXT,
    "visitor_name" TEXT,
    "visitor_phone" TEXT,
    "visitor_wechat" TEXT,
    "message" TEXT,
    "source" TEXT NOT NULL DEFAULT 'save_card',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leads_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "leads_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_leads" ("card_id", "created_at", "id", "message", "source", "visitor_name", "visitor_phone", "visitor_wechat") SELECT "card_id", "created_at", "id", "message", "source", "visitor_name", "visitor_phone", "visitor_wechat" FROM "leads";
DROP TABLE "leads";
ALTER TABLE "new_leads" RENAME TO "leads";
CREATE TABLE "new_media_assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "card_id" TEXT,
    "entity_id" TEXT,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "media_assets_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "media_assets_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_media_assets" ("card_id", "id", "sort_order", "title", "type", "url") SELECT "card_id", "id", "sort_order", "title", "type", "url" FROM "media_assets";
DROP TABLE "media_assets";
ALTER TABLE "new_media_assets" RENAME TO "media_assets";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "entities_slug_key" ON "entities"("slug");

-- CreateIndex
CREATE INDEX "entities_type_status_idx" ON "entities"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "entity_profiles_entity_id_key" ON "entity_profiles"("entity_id");

-- CreateIndex
CREATE INDEX "entity_reports_entity_id_report_type_idx" ON "entity_reports"("entity_id", "report_type");

-- CreateIndex
CREATE UNIQUE INDEX "entity_relations_from_entity_id_to_entity_id_relation_type_key" ON "entity_relations"("from_entity_id", "to_entity_id", "relation_type");
