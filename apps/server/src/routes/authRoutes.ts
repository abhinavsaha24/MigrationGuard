import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import * as argon2 from 'argon2';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function setupAuthRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return reply
          .status(401)
          .send({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
      }

      const isValid = await argon2.verify(user.passwordHash, password);
      if (!isValid) {
        return reply
          .status(401)
          .send({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
      }

      const token = app.jwt.sign(
        { id: user.id, role: user.role, email: user.email },
        { expiresIn: '1h' },
      );
      return reply.send({ token });
    } catch (e: any) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: e.message } });
    }
  });

  app.get('/me', { preValidation: [(app as any).authenticate] }, async (request, reply) => {
    const user = request.user;
    return reply.send({ user });
  });
}
