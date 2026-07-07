-- AlterTable
ALTER TABLE "claim_requests" ADD COLUMN "company_size" TEXT;
ALTER TABLE "claim_requests" ADD COLUMN "verification_method" TEXT;
ALTER TABLE "claim_requests" ADD COLUMN "contact_name" TEXT;
ALTER TABLE "claim_requests" ADD COLUMN "contact_phone" TEXT;
ALTER TABLE "claim_requests" ADD COLUMN "contact_email" TEXT;
ALTER TABLE "claim_requests" ADD COLUMN "personal_commitment" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "claim_requests" ADD COLUMN "disclaimer_accepted" BOOLEAN NOT NULL DEFAULT false;
