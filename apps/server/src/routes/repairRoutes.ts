import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { RepairPlanner } from '@migrationguard/repair-planner';
import { CompatibilityExplanationContext } from '@migrationguard/core';

const proposalCreateSchema = z.object({
  runId: z.string().min(1),
  schemaContent: z.string().optional(),
  migrationSql: z.string().optional(),
});

const paramIdSchema = z.object({
  id: z.string(),
});

export async function setupRepairRoutes(app: FastifyInstance) {
  // Create / Generate Repair Proposal
  app.post('/proposals', { preValidation: [(app as any).authenticate] }, async (request, reply) => {
    let body;
    try {
      body = proposalCreateSchema.parse(request.body);
    } catch (e: any) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid proposal payload', details: e.errors },
      });
    }

    const run = await prisma.verificationRun.findUnique({
      where: { id: body.runId },
      include: { compatibility: true, evidence: true },
    });

    if (!run) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: `Verification run [${body.runId}] not found.` },
      });
    }

    // Synthesize context
    const failedRuns = run.compatibility.filter((c) => c.status !== 'PASS');
    const failedStates = failedRuns.map((c) => `${c.appVersion}_APP_${c.dbVersion}_DB`);
    const primaryEvidence = run.evidence[0];

    const context: CompatibilityExplanationContext = {
      verificationId: run.id,
      verdict: run.status === 'PASS' ? 'PASS' : 'FAIL',
      faultCategory: primaryEvidence?.faultType || 'COMPATIBILITY_FAILURE',
      confidence: primaryEvidence?.confidence || 'CONFIRMED',
      failedStates,
      migrationChanges: [],
      observations: run.compatibility.map((c) => ({
        state: `${c.appVersion}_APP_${c.dbVersion}_DB`,
        result: c.status,
        databaseError: c.error || undefined,
      })),
      evidence: run.evidence.map((e) => ({
        id: e.id,
        faultType: e.faultType,
        confidence: e.confidence,
        operation: e.operation || undefined,
        observedError: e.observedError || undefined,
      })),
    };

    const schemaContent =
      body.schemaContent ||
      `datasource db {\n  provider = "postgresql"\n  url = env("DATABASE_URL")\n}\n\nmodel users {\n  id Int @id @default(autoincrement())\n  name String\n}\n`;
    const migrationSql =
      body.migrationSql ||
      `ALTER TABLE "users" DROP COLUMN "name";\nALTER TABLE "users" ADD COLUMN "full_name" TEXT NOT NULL;\n`;

    const proposal = RepairPlanner.plan(context, schemaContent, migrationSql);

    // Persist proposal
    const saved = await prisma.repairProposalRecord.upsert({
      where: { id: proposal.proposalId },
      create: {
        id: proposal.proposalId,
        runId: run.id,
        strategy: proposal.strategy,
        faultCategory: proposal.faultCategory,
        sourceSchemaHash: proposal.sourceSchemaHash,
        sourceMigrationHash: proposal.sourceMigrationHash,
        beforeSchema: proposal.beforeSchema,
        proposedSchema: proposal.proposedSchema,
        proposalData: proposal as any,
        status: 'VALIDATED',
      },
      update: {
        proposalData: proposal as any,
        status: 'VALIDATED',
      },
    });

    return reply.send({ success: true, proposal: saved.proposalData });
  });

  // Get Proposal by ID
  app.get(
    '/proposals/:id',
    { preValidation: [(app as any).authenticate] },
    async (request, reply) => {
      const { id } = paramIdSchema.parse(request.params);
      const record = await prisma.repairProposalRecord.findUnique({
        where: { id },
      });

      if (!record) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: `Proposal [${id}] not found.` },
        });
      }

      return reply.send({ success: true, proposal: record.proposalData });
    },
  );

  // Explicit Authority Approval
  app.post(
    '/proposals/:id/approve',
    { preValidation: [(app as any).authenticate] },
    async (request, reply) => {
      const user = (request as any).user;
      if (user.role !== 'REVIEWER' && user.role !== 'ADMIN') {
        return reply.status(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'Reviewer or Admin authority required to approve repairs.',
          },
        });
      }

      const { id } = paramIdSchema.parse(request.params);
      const record = await prisma.repairProposalRecord.findUnique({ where: { id } });

      if (!record) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: `Proposal [${id}] not found.` },
        });
      }

      const updatedData = {
        ...(record.proposalData as any),
        status: 'APPROVED',
      };

      const updated = await prisma.repairProposalRecord.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedBy: user.email,
          proposalData: updatedData,
        },
      });

      return reply.send({ success: true, proposal: updated.proposalData });
    },
  );

  // Reject Proposal
  app.post(
    '/proposals/:id/reject',
    { preValidation: [(app as any).authenticate] },
    async (request, reply) => {
      const user = (request as any).user;
      if (user.role !== 'REVIEWER' && user.role !== 'ADMIN') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Reviewer or Admin authority required.' },
        });
      }

      const { id } = paramIdSchema.parse(request.params);
      const record = await prisma.repairProposalRecord.findUnique({ where: { id } });

      if (!record) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: `Proposal [${id}] not found.` },
        });
      }

      const updatedData = {
        ...(record.proposalData as any),
        status: 'REJECTED',
      };

      const updated = await prisma.repairProposalRecord.update({
        where: { id },
        data: {
          status: 'REJECTED',
          proposalData: updatedData,
        },
      });

      return reply.send({ success: true, proposal: updated.proposalData });
    },
  );
}
