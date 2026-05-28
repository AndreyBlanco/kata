-- CreateTable
CREATE TABLE "StudentBsaForm" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "templateVersion" TEXT NOT NULL DEFAULT '2026',
    "fields" JSONB NOT NULL DEFAULT '{}',
    "sourceFileName" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentBsaForm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentBsaForm_studentId_key" ON "StudentBsaForm"("studentId");

-- AddForeignKey
ALTER TABLE "StudentBsaForm" ADD CONSTRAINT "StudentBsaForm_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
