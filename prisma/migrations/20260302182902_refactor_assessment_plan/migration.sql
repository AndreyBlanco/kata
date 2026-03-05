/*
  Warnings:

  - You are about to drop the column `annualFocusSummary` on the `StudentSupportPlan` table. All the data in the column will be lost.
  - You are about to drop the column `annualObservations` on the `StudentSupportPlan` table. All the data in the column will be lost.
  - You are about to drop the column `permanentAdjustments` on the `StudentSupportPlan` table. All the data in the column will be lost.
  - You are about to drop the column `planType` on the `StudentSupportPlan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StudentSupportPlan" DROP COLUMN "annualFocusSummary",
DROP COLUMN "annualObservations",
DROP COLUMN "permanentAdjustments",
DROP COLUMN "planType",
ADD COLUMN     "elaborationDate" TIMESTAMP(3),
ADD COLUMN     "executiveSubprocesses" TEXT[],
ADD COLUMN     "homeStrategies" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "mediationStrategies" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "specificStrategies" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "strengths" TEXT NOT NULL DEFAULT '';

-- DropEnum
DROP TYPE "PlanType";

-- CreateTable
CREATE TABLE "IntegralAssessment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "elaborationDate" TIMESTAMP(3),
    "bsaReceivedDate" TIMESTAMP(3),
    "participants" TEXT[],
    "classroomContext" TEXT NOT NULL DEFAULT '',
    "institutionalContext" TEXT NOT NULL DEFAULT '',
    "familyContext" TEXT NOT NULL DEFAULT '',
    "strengths" TEXT NOT NULL DEFAULT '',
    "barriers" TEXT NOT NULL DEFAULT '',
    "curricularPerformance" TEXT NOT NULL DEFAULT '',
    "instruments" TEXT[],
    "integralAnalysis" TEXT NOT NULL DEFAULT '',
    "requiredSupports" TEXT NOT NULL DEFAULT '',
    "agreements" TEXT NOT NULL DEFAULT '',
    "followUp" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegralAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegralAssessment_studentId_key" ON "IntegralAssessment"("studentId");

-- AddForeignKey
ALTER TABLE "IntegralAssessment" ADD CONSTRAINT "IntegralAssessment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
