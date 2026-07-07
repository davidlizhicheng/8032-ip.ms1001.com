-- CreateTable
CREATE TABLE "card_exchanges" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "requester_user_id" TEXT,
    "requester_card_id" TEXT,
    "requester_entity_id" TEXT,
    "target_user_id" TEXT,
    "target_card_id" TEXT,
    "target_entity_id" TEXT,
    "visitor_name" TEXT,
    "visitor_phone" TEXT,
    "visitor_wechat" TEXT,
    "visitor_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "responded_at" DATETIME,
    CONSTRAINT "card_exchanges_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "card_exchanges_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "card_exchanges_requester_card_id_fkey" FOREIGN KEY ("requester_card_id") REFERENCES "cards" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "card_exchanges_target_card_id_fkey" FOREIGN KEY ("target_card_id") REFERENCES "cards" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "card_exchanges_requester_entity_id_fkey" FOREIGN KEY ("requester_entity_id") REFERENCES "entities" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "card_exchanges_target_entity_id_fkey" FOREIGN KEY ("target_entity_id") REFERENCES "entities" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "card_exchanges_target_user_id_status_idx" ON "card_exchanges"("target_user_id", "status");
CREATE INDEX "card_exchanges_requester_user_id_status_idx" ON "card_exchanges"("requester_user_id", "status");
