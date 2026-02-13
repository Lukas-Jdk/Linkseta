-- AlterTable
ALTER TABLE "ServiceListing" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ServiceListing_deletedAt_idx" ON "ServiceListing"("deletedAt");
