ALTER TABLE "cards" ADD COLUMN "manual_rank_order" INTEGER;
ALTER TABLE "entities" ADD COLUMN "manual_rank_order" INTEGER;

CREATE INDEX "cards_manual_rank_order_idx" ON "cards"("manual_rank_order");
CREATE INDEX "entities_manual_rank_order_idx" ON "entities"("manual_rank_order");
