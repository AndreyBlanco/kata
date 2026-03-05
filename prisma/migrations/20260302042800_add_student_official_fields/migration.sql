-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "cedula" TEXT,
ADD COLUMN     "classroomTeacherName" TEXT,
ADD COLUMN     "guardianName" TEXT,
ADD COLUMN     "guardianPhone" TEXT,
ADD COLUMN     "medicalDiagnosis" TEXT DEFAULT 'NO APLICA';
