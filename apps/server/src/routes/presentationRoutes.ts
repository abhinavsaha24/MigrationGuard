import { FastifyInstance } from 'fastify';
import { prisma } from '../config/prisma.js';
import { uploadFile, getFileUrl } from '../services/storageService.js';
import { z } from 'zod';

const paramIdSchema = z.object({ id: z.string().min(1) });
const paramPublishSchema = z.object({ id: z.string().min(1), versionId: z.string().min(1) });

export async function setupPresentationRoutes(app: FastifyInstance) {
  // Get all published presentations
  app.get('/', async (request, reply) => {
    const presentations = await prisma.presentation.findMany({
      include: {
        versions: {
          where: { publishedAt: { not: null } },
          orderBy: { version: 'desc' },
        },
      },
    });
    return reply.send(presentations);
  });

  // Upload new version (ADMIN only)
  app.post(
    '/:id/versions',
    { preValidation: [(app as any).authenticate] },
    async (request, reply) => {
      const user = (request as any).user;
      if (user.role !== 'ADMIN') {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Admin required' } });
      }

      const { id } = paramIdSchema.parse(request.params);
      const data = await request.file();
      if (!data) {
        return reply
          .status(400)
          .send({ error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' } });
      }

      const allowedMimeTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/json',
      ];
      if (!allowedMimeTypes.includes(data.mimetype)) {
        return reply
          .status(400)
          .send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid file type' } });
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

      let ext = data.filename.split('.').pop() || 'bin';
      ext = ext.replace(/[^a-zA-Z0-9]/g, ''); // Path traversal prevention
      const storageKey = await uploadFile(buffer, data.mimetype, ext);

      // Ensure the Presentation row exists before acquiring the version lock.
      // We use raw SQL to guarantee atomic INSERT ON CONFLICT DO NOTHING,
      // as Prisma's upsert can throw P2002 under extreme concurrency.
      await prisma.$executeRaw`
        INSERT INTO "Presentation" (id, title, "createdAt", "updatedAt")
        VALUES (${id}, 'Untitled', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `;

      // Atomically compute and reserve the next version number inside a
      // serializable transaction with an explicit row-level lock, eliminating
      // the TOCTOU race between concurrent upload requests for the same
      // presentation ID.
      try {
        const version = await prisma.$transaction(
          async (tx) => {
            // Lock the parent presentation row for the duration of this
            // transaction so concurrent uploads serialize here.
            await tx.$executeRaw`
              SELECT id FROM "Presentation" WHERE id = ${id} FOR UPDATE
            `;

            const [{ max }] = await tx.$queryRaw<[{ max: number | null }]>`
              SELECT MAX(version) AS max FROM "PresentationVersion"
              WHERE "presentationId" = ${id}
            `;
            const nextVersion = (max ?? 0) + 1;

            return tx.presentationVersion.create({
              data: {
                presentationId: id,
                version: nextVersion,
                originalFilename: data.filename,
                mimeType: data.mimetype,
                size: buffer.length,
                storageKey,
              },
            });
          },
          { isolationLevel: 'Serializable' },
        );
        return reply.send(version);
      } catch (err: any) {
        if (err.code === 'P2002' || err.code === '40001' || err.code === 'P2034') {
          return reply
            .status(409)
            .send({ error: { code: 'CONFLICT', message: 'Version conflict. Please try again.' } });
        }
        throw err;
      }
    },
  );

  // Publish a version (ADMIN only)
  app.post(
    '/:id/versions/:versionId/publish',
    { preValidation: [(app as any).authenticate] },
    async (request, reply) => {
      const user = (request as any).user;
      if (user.role !== 'ADMIN') {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Admin required' } });
      }

      const { id, versionId } = paramPublishSchema.parse(request.params);
      const version = await prisma.presentationVersion.update({
        where: { id: versionId },
        data: { publishedAt: new Date() },
      });

      return reply.send(version);
    },
  );

  // Get specific presentation details and presigned URL
  app.get('/:id', async (request, reply) => {
    const { id } = paramIdSchema.parse(request.params);
    const presentation = await prisma.presentation.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
      },
    });
    if (!presentation) return reply.status(404).send();

    // Map versions to include presigned URLs
    const versionsWithUrls = await Promise.all(
      presentation.versions.map(async (v) => {
        const url = await getFileUrl(v.storageKey);
        return { ...v, url };
      }),
    );

    return reply.send({ ...presentation, versions: versionsWithUrls });
  });
}
