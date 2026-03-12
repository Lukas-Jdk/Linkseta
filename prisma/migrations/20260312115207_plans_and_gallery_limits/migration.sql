/*
  Warnings:

  - You are about to drop the `ServiceImage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ServiceImage" DROP CONSTRAINT "ServiceImage_serviceId_fkey";

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "isTrial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trialDays" INTEGER;

-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ServiceListing" ADD COLUMN     "galleryImagePaths" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "galleryImageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropTable
DROP TABLE "ServiceImage";
