-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "maxImagesPerListing" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "ServiceImage" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceImage_serviceId_sortOrder_idx" ON "ServiceImage"("serviceId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ServiceImage" ADD CONSTRAINT "ServiceImage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
