-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('FAMILIA', 'ESTUDIANTE', 'DOCENTE_GRADO', 'DOCENTE_GUIA', 'OTRO_PROFESIONAL');

-- CreateEnum
CREATE TYPE "InterviewFormat" AS ENUM ('ESTRUCTURADA', 'SEMIESTRUCTURADA', 'LIBRE');

-- CreateEnum
CREATE TYPE "InterviewModality" AS ENUM ('PRESENCIAL', 'VIRTUAL');

-- CreateEnum
CREATE TYPE "ObservationContext" AS ENUM ('AULA', 'SERVICIO_APOYO', 'OTRO');

-- CreateTable
CREATE TABLE "InterviewRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "schoolPeriod" TEXT NOT NULL,
    "interviewType" "InterviewType" NOT NULL,
    "format" "InterviewFormat" NOT NULL DEFAULT 'SEMIESTRUCTURADA',
    "modality" "InterviewModality" NOT NULL DEFAULT 'PRESENCIAL',
    "conductedAt" TIMESTAMP(3) NOT NULL,
    "participantName" TEXT,
    "participantRoleCode" TEXT,
    "content" JSONB NOT NULL DEFAULT '{}',
    "consentRecorded" BOOLEAN NOT NULL DEFAULT false,
    "consentRecordedAt" TIMESTAMP(3),
    "linkedInstrumentCode" TEXT,
    "appliedToAssessment" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObservationRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "schoolPeriod" TEXT NOT NULL,
    "context" "ObservationContext" NOT NULL,
    "subjectOrSpace" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "dimensionNotes" JSONB NOT NULL DEFAULT '{}',
    "generalNotes" TEXT NOT NULL DEFAULT '',
    "linkedInstrumentCode" TEXT,
    "appliedToAssessment" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObservationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpedienteConsultation" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "schoolPeriod" TEXT NOT NULL,
    "consultedAt" TIMESTAMP(3) NOT NULL,
    "expedienteReviewed" BOOLEAN NOT NULL DEFAULT false,
    "documentsReviewed" TEXT NOT NULL DEFAULT '',
    "familyProvidedDocs" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpedienteConsultation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterviewRecord_studentId_schoolPeriod_idx" ON "InterviewRecord"("studentId", "schoolPeriod");

-- CreateIndex
CREATE INDEX "InterviewRecord_studentId_interviewType_idx" ON "InterviewRecord"("studentId", "interviewType");

-- CreateIndex
CREATE INDEX "ObservationRecord_studentId_schoolPeriod_idx" ON "ObservationRecord"("studentId", "schoolPeriod");

-- CreateIndex
CREATE INDEX "ObservationRecord_studentId_context_idx" ON "ObservationRecord"("studentId", "context");

-- CreateIndex
CREATE UNIQUE INDEX "ExpedienteConsultation_studentId_schoolPeriod_key" ON "ExpedienteConsultation"("studentId", "schoolPeriod");

-- CreateIndex
CREATE INDEX "ExpedienteConsultation_studentId_idx" ON "ExpedienteConsultation"("studentId");

-- AddForeignKey
ALTER TABLE "InterviewRecord" ADD CONSTRAINT "InterviewRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservationRecord" ADD CONSTRAINT "ObservationRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpedienteConsultation" ADD CONSTRAINT "ExpedienteConsultation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
