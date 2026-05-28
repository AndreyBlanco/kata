-- CreateTable
CREATE TABLE "EducationalCenter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "circuit" TEXT NOT NULL DEFAULT '',
    "budgetCode" TEXT NOT NULL DEFAULT '',
    "directorName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationalCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherEducationalCenter" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "educationalCenterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherEducationalCenter_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "educationalCenterId" TEXT;

-- CreateIndex
CREATE INDEX "EducationalCenter_name_idx" ON "EducationalCenter"("name");

-- CreateIndex
CREATE INDEX "EducationalCenter_budgetCode_idx" ON "EducationalCenter"("budgetCode");

-- CreateIndex
CREATE INDEX "Student_educationalCenterId_idx" ON "Student"("educationalCenterId");

-- CreateIndex
CREATE INDEX "TeacherEducationalCenter_teacherId_idx" ON "TeacherEducationalCenter"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherEducationalCenter_educationalCenterId_idx" ON "TeacherEducationalCenter"("educationalCenterId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherEducationalCenter_teacherId_educationalCenterId_key" ON "TeacherEducationalCenter"("teacherId", "educationalCenterId");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_educationalCenterId_fkey" FOREIGN KEY ("educationalCenterId") REFERENCES "EducationalCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherEducationalCenter" ADD CONSTRAINT "TeacherEducationalCenter_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherEducationalCenter" ADD CONSTRAINT "TeacherEducationalCenter_educationalCenterId_fkey" FOREIGN KEY ("educationalCenterId") REFERENCES "EducationalCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
