/*
  Warnings:

  - You are about to drop the column `priceMode` on the `ServiceListing` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "lifetimeFree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lifetimeFreeGrantedAt" TIMESTAMP(3),
ADD COLUMN     "lifetimeFreeGrantedBy" TEXT;

-- AlterTable
ALTER TABLE "ServiceListing" DROP COLUMN "priceMode";

-- DropEnum
DROP TYPE "PriceMode";
