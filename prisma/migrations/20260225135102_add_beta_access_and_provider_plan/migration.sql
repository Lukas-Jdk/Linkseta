-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "planId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "betaAccess" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lifetimeFree" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "ProviderProfile" ADD CONSTRAINT "ProviderProfile_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
