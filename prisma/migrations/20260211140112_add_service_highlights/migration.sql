-- AlterTable
ALTER TABLE "ServiceListing" ADD COLUMN     "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[];
