-- CreateTable
CREATE TABLE "ParticipantRole" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantRole_code_key" ON "ParticipantRole"("code");

-- CreateIndex
CREATE INDEX "ParticipantRole_category_idx" ON "ParticipantRole"("category");

-- CreateIndex
CREATE INDEX "ParticipantRole_active_idx" ON "ParticipantRole"("active");
