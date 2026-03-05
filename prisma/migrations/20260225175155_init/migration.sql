-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('process', 'difficulty', 'both');

-- CreateEnum
CREATE TYPE "InterventionType" AS ENUM ('aula', 'personalizada', 'ambas');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('aula', 'personalizada');

-- CreateEnum
CREATE TYPE "Attendance" AS ENUM ('present', 'absent');

-- CreateEnum
CREATE TYPE "Outcome" AS ENUM ('achieved', 'partial', 'notAchieved');

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "centerName" TEXT NOT NULL,
    "circuit" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSupportPlan" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "planType" "PlanType" NOT NULL,
    "activeDifficulties" TEXT[],
    "priorityProcesses" TEXT[],
    "annualFocusSummary" TEXT NOT NULL DEFAULT '',
    "permanentAdjustments" TEXT NOT NULL DEFAULT '',
    "annualObservations" TEXT NOT NULL DEFAULT '',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSupportPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportObjective" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentIds" TEXT[],
    "macroArea" TEXT NOT NULL,
    "subArea" TEXT NOT NULL,
    "specificGoal" TEXT NOT NULL,
    "frequencyPerWeek" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "interventionType" "InterventionType" NOT NULL,
    "linkedProcesses" TEXT[],
    "linkedDifficulties" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedSession" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "supportObjectiveId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "plannedType" "SessionType" NOT NULL,
    "duration" INTEGER NOT NULL,
    "executedDate" TIMESTAMP(3),
    "attendance" "Attendance",
    "outcome" "Outcome",
    "supportLevel" INTEGER,
    "observationTags" TEXT[],
    "freeText" TEXT,
    "isExtraordinary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_email_key" ON "Teacher"("email");

-- CreateIndex
CREATE INDEX "Student_teacherId_idx" ON "Student"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSupportPlan_studentId_key" ON "StudentSupportPlan"("studentId");

-- CreateIndex
CREATE INDEX "SupportObjective_teacherId_idx" ON "SupportObjective"("teacherId");

-- CreateIndex
CREATE INDEX "GeneratedSession_studentId_idx" ON "GeneratedSession"("studentId");

-- CreateIndex
CREATE INDEX "GeneratedSession_supportObjectiveId_idx" ON "GeneratedSession"("supportObjectiveId");

-- CreateIndex
CREATE INDEX "GeneratedSession_studentId_month_idx" ON "GeneratedSession"("studentId", "month");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSupportPlan" ADD CONSTRAINT "StudentSupportPlan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedSession" ADD CONSTRAINT "GeneratedSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedSession" ADD CONSTRAINT "GeneratedSession_supportObjectiveId_fkey" FOREIGN KEY ("supportObjectiveId") REFERENCES "SupportObjective"("id") ON DELETE CASCADE ON UPDATE CASCADE;
