-- CreateTable
CREATE TABLE "ServicePriceItem" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelEn" TEXT,
    "labelNo" TEXT,
    "priceFrom" INTEGER,
    "priceTo" INTEGER,
    "note" TEXT,
    "noteEn" TEXT,
    "noteNo" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePriceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServicePriceItem_serviceId_sortOrder_idx" ON "ServicePriceItem"("serviceId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ServicePriceItem" ADD CONSTRAINT "ServicePriceItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
