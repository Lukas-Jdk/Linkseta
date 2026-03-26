-- AlterTable
ALTER TABLE "ServiceListing" ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "descriptionNo" TEXT,
ADD COLUMN     "highlightsEn" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "highlightsNo" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sourceLocale" TEXT NOT NULL DEFAULT 'lt',
ADD COLUMN     "titleEn" TEXT,
ADD COLUMN     "titleNo" TEXT;
