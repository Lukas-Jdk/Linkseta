-- CreateEnum
CREATE TYPE "PriceMode" AS ENUM ('FIXED', 'FROM');

-- AlterTable
ALTER TABLE "ServiceListing" ADD COLUMN     "priceMode" "PriceMode" NOT NULL DEFAULT 'FROM';
