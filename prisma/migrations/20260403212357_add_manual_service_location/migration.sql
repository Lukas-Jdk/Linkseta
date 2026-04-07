-- AlterTable
ALTER TABLE "ServiceListing" ADD COLUMN     "locationCity" TEXT,
ADD COLUMN     "locationPostcode" TEXT,
ADD COLUMN     "locationRegion" TEXT;

-- CreateIndex
CREATE INDEX "ServiceListing_locationPostcode_idx" ON "ServiceListing"("locationPostcode");

-- CreateIndex
CREATE INDEX "ServiceListing_locationCity_idx" ON "ServiceListing"("locationCity");
