import { FastifyInstance } from 'fastify';
import { prisma } from '../config/prisma.js';
import { uploadFile, getFileStream } from '../services/storageService.js';
import * as crypto from 'crypto';
import { z } from 'zod';

const paramIdSchema = z.object({ id: z.string() });
const runDecisionSchema = z.object({
  decision: z.enum(['ACCEPTED', 'REJECTED']),
  comment: z.string().optional(),
});

const runCreateSchema = z.object({
  runId: z.string().min(1),
  migrationName: z.string().min(1),
  status: z.string().min(1),
  durationMs: z.number(),
  artifactKey: z.string().nullable().optional(),
  artifactHash: z.string().nullable().optional(),
  compatibility: z.array(
    z.object({
      appVersion: z.string(),
      dbVersion: z.string(),
      status: z.string(),
      durationMs: z.number(),
      error: z.string().nullable().optional(),
    }),
  ),
  evidence: z.array(
    z.object({
      faultType: z.string(),
      confidence: z.string(),
      operation: z.string().optional(),
      observedError: z.string().optional(),
    }),
  ),
});

export async function setupRunRoutes(app: FastifyInstance) {
  // Submit a Verification Run
  app.post('/', { preValidation: [(app as any).authenticate] }, async (request, reply) => {
    let body;
    try {
      body = runCreateSchema.parse(request.body);
    } catch (e: any) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid run payload' } });
    }
    try {
      const run = await prisma.verificationRun.create({
        data: {
          id: body.runId,
          migrationName: body.migrationName,
          status: body.status,
          durationMs: body.durationMs,
          artifactKey: body.artifactKey,
          artifactHash: body.artifactHash,
          compatibility: {
            create: body.compatibility.map((c: any) => ({
              appVersion: c.appVersion,
              dbVersion: c.dbVersion,
              status: c.status,
              durationMs: c.durationMs,
              error: c.error,
            })),
          },
          evidence: {
            create: body.evidence.map((e: any) => ({
              faultType: e.faultType,
              confidence: e.confidence,
              operation: e.operation,
              observedError: e.observedError,
            })),
          },
        },
        include: {
          compatibility: true,
          evidence: true,
        },
      });
      return reply.send(run);
    } catch (e: any) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: e.message } });
    }
  });

  // Upload Artifact
  app.post('/artifact', { preValidation: [(app as any).authenticate] }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' } });
    }

    const buffer = await data.toBuffer();
    if (data.file.truncated) {
      return reply
        .status(413)
        .send({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'File exceeds maximum size' } });
    }
    if (buffer.length === 0) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'File is empty' } });
    }

    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const storageKey = await uploadFile(buffer, data.mimetype, 'json');

    return reply.send({ artifactKey: storageKey, artifactHash: hash });
  });

  // Get all Runs
  app.get('/', async (request, reply) => {
    const runs = await prisma.verificationRun.findMany({
      orderBy: { timestamp: 'desc' },
    });
    return reply.send(runs);
  });

  // Get specific Run with Evidence and Decisions
  app.get('/:id', async (request, reply) => {
    const { id } = paramIdSchema.parse(request.params);
    const run = await prisma.verificationRun.findUnique({
      where: { id },
      include: {
        compatibility: true,
        evidence: true,
        ReviewerDecision: { include: { reviewer: { select: { email: true } } } },
      },
    });
    if (!run) return reply.status(404).send();

    return reply.send(run);
  });

  // Download Evidence Artifact
  app.get(
    '/:id/evidence',
    { preValidation: [(app as any).authenticate] },
    async (request, reply) => {
      const { id } = paramIdSchema.parse(request.params);
      const run = await prisma.verificationRun.findUnique({
        where: { id },
        select: { artifactKey: true },
      });

      if (!run)
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Run not found' } });
      if (!run.artifactKey)
        return reply
          .status(404)
          .send({ error: { code: 'NOT_FOUND', message: 'No artifact for this run' } });

      try {
        const stream = await getFileStream(run.artifactKey);
        reply.header('Content-Type', 'application/json');
        reply.header('Content-Disposition', `attachment; filename="evidence-${id}.json"`);
        return reply.send(stream);
      } catch (e: any) {
        return reply
          .status(404)
          .send({ error: { code: 'NOT_FOUND', message: 'Artifact not found in storage' } });
      }
    },
  );

  // Reviewer Decision
  app.post(
    '/:id/decisions',
    { preValidation: [(app as any).authenticate] },
    async (request, reply) => {
      const user = (request as any).user;
      if (user.role !== 'REVIEWER' && user.role !== 'ADMIN') {
        return reply
          .status(403)
          .send({ error: { code: 'FORBIDDEN', message: 'Reviewer role required' } });
      }

      const { id } = paramIdSchema.parse(request.params);
      const { decision, comment } = runDecisionSchema.parse(request.body);

      try {
        const reviewerDecision = await prisma.reviewerDecision.create({
          data: {
            runId: id,
            reviewerId: user.id,
            decision,
            comment,
          },
        });
        return reply.send(reviewerDecision);
      } catch (e: any) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: e.message } });
      }
    },
  );
}
