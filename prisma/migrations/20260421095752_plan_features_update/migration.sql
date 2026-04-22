-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "canAppearOnHomepage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canBecomeTop" BOOLEAN NOT NULL DEFAULT false;
