import * as http from 'http';
import { PrismaClient } from '../generated/client-v2';

const prisma = new PrismaClient({ log: ['error'] });

const server = http.createServer(async (req, res) => {
  const match = req.url?.match(/^\/users\/(\d+)$/);
  if (req.method === 'GET' && match) {
    const id = parseInt(match[1], 10);
    try {
      const user = await prisma.users.findUnique({ where: { id } });
      if (user) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(user));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'User not found' }));
      }
    } catch (e: unknown) {
      const error = e as Error;
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message || 'Internal Server Error', isDatabaseError: true }));
    }
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200); res.end('OK');
  } else {
    res.writeHead(404); res.end('Not Found');
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
server.listen(port, () => console.log(`NEW application listening on port ${port}`));
