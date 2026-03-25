-- CreateEnum
CREATE TYPE "AssessmentResultValue" AS ENUM ('yes', 'no', 'withSupport');

-- CreateTable
CREATE TABLE "AssessmentObjective" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "difficultyLabel" TEXT NOT NULL,
    "areaCode" TEXT NOT NULL,
    "areaLabel" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "levelLabel" TEXT NOT NULL,
    "levelType" TEXT NOT NULL,
    "levelSort" INTEGER NOT NULL DEFAULT 0,
    "itemOrder" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAssessmentResult" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "result" "AssessmentResultValue" NOT NULL,
    "scaleValue" INTEGER,
    "notes" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAssessmentResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentObjective_code_key" ON "AssessmentObjective"("code");

-- CreateIndex
CREATE INDEX "AssessmentObjective_difficulty_idx" ON "AssessmentObjective"("difficulty");

-- CreateIndex
CREATE INDEX "AssessmentObjective_difficulty_areaCode_idx" ON "AssessmentObjective"("difficulty", "areaCode");

-- CreateIndex
CREATE INDEX "AssessmentObjective_level_idx" ON "AssessmentObjective"("level");

-- CreateIndex
CREATE INDEX "AssessmentObjective_active_idx" ON "AssessmentObjective"("active");

-- CreateIndex
CREATE INDEX "StudentAssessmentResult_studentId_idx" ON "StudentAssessmentResult"("studentId");

-- CreateIndex
CREATE INDEX "StudentAssessmentResult_objectiveId_idx" ON "StudentAssessmentResult"("objectiveId");

-- CreateIndex
CREATE INDEX "StudentAssessmentResult_studentId_result_idx" ON "StudentAssessmentResult"("studentId", "result");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAssessmentResult_studentId_objectiveId_key" ON "StudentAssessmentResult"("studentId", "objectiveId");

-- AddForeignKey
ALTER TABLE "StudentAssessmentResult" ADD CONSTRAINT "StudentAssessmentResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAssessmentResult" ADD CONSTRAINT "StudentAssessmentResult_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "AssessmentObjective"("id") ON DELETE CASCADE ON UPDATE CASCADE;
