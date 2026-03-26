-- CreateTable
CREATE TABLE "AssessmentInstrument" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'otro',
    "description" TEXT,
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "suggestedBy" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentInstrument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentInstrument_code_key" ON "AssessmentInstrument"("code");

-- CreateIndex
CREATE INDEX "AssessmentInstrument_status_idx" ON "AssessmentInstrument"("status");

-- CreateIndex
CREATE INDEX "AssessmentInstrument_category_idx" ON "AssessmentInstrument"("category");

-- CreateIndex
CREATE INDEX "AssessmentInstrument_active_idx" ON "AssessmentInstrument"("active");
