import fastify, { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { setupAuthRoutes } from './routes/authRoutes.js';
import { setupPresentationRoutes } from './routes/presentationRoutes.js';
import { setupRunRoutes } from './routes/runRoutes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: true,
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        coerceTypes: true,
        useDefaults: true,
      },
    },
  });

  await app.register(cors, {
    origin: process.env.FRONTEND_ORIGIN || '*',
  });

  await app.register(rateLimit as any, {
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'supersecret_fallback_key',
  });

  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input data', details: error.errors },
      });
    }
    if (error.statusCode) {
      return reply.status(error.statusCode).send(error);
    }
    app.log.error(error);
    return reply
      .status(500)
      .send({ error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error' } });
  });

  app.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  app.get('/api/health', async (request, reply) => {
    try {
      const { prisma } = await import('./config/prisma.js');
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected' };
    } catch (e) {
      reply.status(503);
      return { status: 'error', database: 'disconnected' };
    }
  });

  // Register Routes
  app.register(setupAuthRoutes, { prefix: '/api/auth' });
  app.register(setupPresentationRoutes, { prefix: '/api/presentations' });
  app.register(setupRunRoutes, { prefix: '/api/runs' });

  return app;
}
