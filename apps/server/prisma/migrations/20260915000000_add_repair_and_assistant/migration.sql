-- CreateTable
CREATE TABLE "RepairProposalRecord" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "faultCategory" TEXT NOT NULL,
    "sourceSchemaHash" TEXT NOT NULL,
    "sourceMigrationHash" TEXT NOT NULL,
    "beforeSchema" TEXT NOT NULL,
    "proposedSchema" TEXT NOT NULL,
    "proposalData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VALIDATED',
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairProposalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantDocument" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssistantDocument_topic_key" ON "AssistantDocument"("topic");

-- AddForeignKey
ALTER TABLE "RepairProposalRecord" ADD CONSTRAINT "RepairProposalRecord_runId_fkey" FOREIGN KEY ("runId") REFERENCES "VerificationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
