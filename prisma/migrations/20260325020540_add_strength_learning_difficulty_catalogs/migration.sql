-- CreateTable
CREATE TABLE "StrengthItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "examples" TEXT,
    "serviceTags" TEXT[],
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrengthItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningProcessItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "parentCode" TEXT,
    "description" TEXT,
    "examples" TEXT,
    "serviceTags" TEXT[],
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningProcessItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecificLearningDifficulty" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "examples" TEXT,
    "serviceTags" TEXT[],
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecificLearningDifficulty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StrengthItem_code_key" ON "StrengthItem"("code");

-- CreateIndex
CREATE INDEX "StrengthItem_active_idx" ON "StrengthItem"("active");

-- CreateIndex
CREATE INDEX "StrengthItem_category_idx" ON "StrengthItem"("category");

-- CreateIndex
CREATE UNIQUE INDEX "LearningProcessItem_code_key" ON "LearningProcessItem"("code");

-- CreateIndex
CREATE INDEX "LearningProcessItem_active_idx" ON "LearningProcessItem"("active");

-- CreateIndex
CREATE INDEX "LearningProcessItem_category_idx" ON "LearningProcessItem"("category");

-- CreateIndex
CREATE INDEX "LearningProcessItem_parentCode_idx" ON "LearningProcessItem"("parentCode");

-- CreateIndex
CREATE UNIQUE INDEX "SpecificLearningDifficulty_code_key" ON "SpecificLearningDifficulty"("code");

-- CreateIndex
CREATE INDEX "SpecificLearningDifficulty_active_idx" ON "SpecificLearningDifficulty"("active");

-- CreateIndex
CREATE INDEX "SpecificLearningDifficulty_category_idx" ON "SpecificLearningDifficulty"("category");
