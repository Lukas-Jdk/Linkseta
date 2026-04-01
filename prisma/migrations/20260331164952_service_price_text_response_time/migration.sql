/*
  Warnings:

  - You are about to drop the column `priceFrom` on the `ServicePriceItem` table. All the data in the column will be lost.
  - You are about to drop the column `priceTo` on the `ServicePriceItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ServiceListing" ADD COLUMN     "responseTime" TEXT DEFAULT '1h';

-- AlterTable
ALTER TABLE "ServicePriceItem" DROP COLUMN "priceFrom",
DROP COLUMN "priceTo",
ADD COLUMN     "priceText" TEXT,
ADD COLUMN     "priceTextEn" TEXT,
ADD COLUMN     "priceTextNo" TEXT;
