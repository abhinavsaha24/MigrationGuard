const express = require('express');
import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

app.get('/health', (req: any, res: any) => res.status(200).send('OK'));

app.get('/users', async (req, res) => {
  try {
    const users = await prisma.$queryRaw`SELECT id, name, email FROM "users"`;
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ isDatabaseError: true, error: err.message });
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 0;
const server = app.listen(port, () => {
  const boundPort = (server.address() as any).port;
  console.log(`Ready on port ${boundPort}`);
  if (process.send) process.send({ type: 'ready', port: boundPort });
});

process.on('SIGTERM', () => {
  server.close(() => {
    prisma.$disconnect();
    process.exit(0);
  });
});
