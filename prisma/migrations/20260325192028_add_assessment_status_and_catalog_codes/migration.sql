-- AlterTable
ALTER TABLE "IntegralAssessment" ADD COLUMN     "barrierCodes" TEXT[],
ADD COLUMN     "followupCodes" TEXT[],
ADD COLUMN     "requiresSupport" BOOLEAN,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "strengthCodes" TEXT[],
ADD COLUMN     "supportCodes" TEXT[];
