-- DropIndex
DROP INDEX "ServiceListing_createdAt_idx";

-- DropIndex
DROP INDEX "ServiceListing_deletedAt_idx";

-- DropIndex
DROP INDEX "ServiceListing_isActive_cityId_categoryId_idx";

-- CreateIndex
CREATE INDEX "ServiceListing_isActive_deletedAt_createdAt_idx" ON "ServiceListing"("isActive", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceListing_isActive_deletedAt_highlighted_createdAt_idx" ON "ServiceListing"("isActive", "deletedAt", "highlighted", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceListing_cityId_idx" ON "ServiceListing"("cityId");

-- CreateIndex
CREATE INDEX "ServiceListing_categoryId_idx" ON "ServiceListing"("categoryId");

-- CreateIndex
CREATE INDEX "ServiceListing_userId_idx" ON "ServiceListing"("userId");
