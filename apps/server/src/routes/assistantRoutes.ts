import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AssistantService } from '../services/ai/assistantService.js';

const assistantService = new AssistantService();

const askSchema = z.object({
  query: z.string().optional(),
  runId: z.string().optional(),
  cellState: z.string().optional(),
});

export async function setupAssistantRoutes(app: FastifyInstance) {
  // Assistant status
  app.get('/status', async (_request, reply) => {
    return reply.send({
      status: 'ok',
      provider: assistantService.getProviderName(),
      aiEnabled: true,
    });
  });

  // Query assistant
  app.post('/ask', { preValidation: [(app as any).authenticate] }, async (request, reply) => {
    const user = (request as any).user;
    let body;
    try {
      body = askSchema.parse(request.body);
    } catch (e: any) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query payload', details: e.errors },
      });
    }

    try {
      if (body.runId && body.cellState) {
        const result = await assistantService.explainCellState(body.runId, body.cellState, user);
        return reply.send({ success: true, data: result });
      }

      if (body.runId) {
        const result = await assistantService.explainVerificationRun(body.runId, user);
        return reply.send({ success: true, data: result });
      }

      if (body.query) {
        const result = await assistantService.answerQuestion(body.query);
        return reply.send({ success: true, data: result });
      }

      return reply.status(400).send({
        error: { code: 'BAD_REQUEST', message: 'Either runId or query must be provided.' },
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({
        error: { code: 'ASSISTANT_ERROR', message: err.message || 'Assistant operation failed.' },
      });
    }
  });
}
