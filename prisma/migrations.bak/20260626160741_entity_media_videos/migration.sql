-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_video_links" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "card_id" TEXT,
    "entity_id" TEXT,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "cover_url" TEXT,
    "embed_url" TEXT,
    "description" TEXT,
    "can_embed" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "video_links_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "video_links_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_video_links" ("can_embed", "card_id", "cover_url", "description", "embed_url", "id", "platform", "sort_order", "title", "url") SELECT "can_embed", "card_id", "cover_url", "description", "embed_url", "id", "platform", "sort_order", "title", "url" FROM "video_links";
DROP TABLE "video_links";
ALTER TABLE "new_video_links" RENAME TO "video_links";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
