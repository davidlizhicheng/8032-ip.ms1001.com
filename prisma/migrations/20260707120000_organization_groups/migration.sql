-- CreateTable
CREATE TABLE "organization_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "subtitle" TEXT,
    "description" TEXT,
    "cover_url" TEXT,
    "category" TEXT NOT NULL DEFAULT 'association',
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "manual_rank_order" INTEGER,
    "owner_user_id" TEXT,
    "host_entity_id" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "organization_groups_host_entity_id_fkey" FOREIGN KEY ("host_entity_id") REFERENCES "entities" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "group_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "member_role" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "organization_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "group_members_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_groups_slug_key" ON "organization_groups"("slug");

-- CreateIndex
CREATE INDEX "organization_groups_visibility_is_featured_idx" ON "organization_groups"("visibility", "is_featured");

-- CreateIndex
CREATE INDEX "organization_groups_manual_rank_order_idx" ON "organization_groups"("manual_rank_order");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_group_id_entity_id_key" ON "group_members"("group_id", "entity_id");

-- CreateIndex
CREATE INDEX "group_members_group_id_sort_order_idx" ON "group_members"("group_id", "sort_order");
