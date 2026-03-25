-- CreateTable
CREATE TABLE "BarrierItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "serviceTags" TEXT[],
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarrierItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContextDimension" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "description" TEXT,
    "guideText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContextDimension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "serviceTags" TEXT[],
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowupSchedule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowupSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurricularSubjectEntry" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "goalsToAchieve" TEXT NOT NULL DEFAULT '',
    "progress" TEXT NOT NULL DEFAULT '',
    "supportNeeds" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurricularSubjectEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BarrierItem_code_key" ON "BarrierItem"("code");

-- CreateIndex
CREATE INDEX "BarrierItem_active_idx" ON "BarrierItem"("active");

-- CreateIndex
CREATE INDEX "BarrierItem_category_idx" ON "BarrierItem"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ContextDimension_code_key" ON "ContextDimension"("code");

-- CreateIndex
CREATE INDEX "ContextDimension_active_idx" ON "ContextDimension"("active");

-- CreateIndex
CREATE INDEX "ContextDimension_dimension_idx" ON "ContextDimension"("dimension");

-- CreateIndex
CREATE UNIQUE INDEX "SupportItem_code_key" ON "SupportItem"("code");

-- CreateIndex
CREATE INDEX "SupportItem_active_idx" ON "SupportItem"("active");

-- CreateIndex
CREATE INDEX "SupportItem_category_idx" ON "SupportItem"("category");

-- CreateIndex
CREATE UNIQUE INDEX "FollowupSchedule_code_key" ON "FollowupSchedule"("code");

-- CreateIndex
CREATE INDEX "FollowupSchedule_active_idx" ON "FollowupSchedule"("active");

-- CreateIndex
CREATE INDEX "FollowupSchedule_type_idx" ON "FollowupSchedule"("type");

-- CreateIndex
CREATE INDEX "CurricularSubjectEntry_assessmentId_idx" ON "CurricularSubjectEntry"("assessmentId");

-- AddForeignKey
ALTER TABLE "CurricularSubjectEntry" ADD CONSTRAINT "CurricularSubjectEntry_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "IntegralAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
