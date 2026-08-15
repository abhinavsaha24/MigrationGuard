import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WorkloadLoader, WorkloadReplayEngine } from './index.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as http from 'http';
import * as net from 'net';

describe('WorkloadLoader', () => {
  it('should validate and load a well-formed workload', () => {
    const p = path.join(os.tmpdir(), 'valid-wl.json');
    fs.writeFileSync(
      p,
      JSON.stringify({
        id: 'w1',
        name: 'W1',
        description: 'desc',
        operations: [{ id: 'op1', method: 'GET', path: '/foo' }],
      }),
    );
    const wl = WorkloadLoader.load(p);
    expect(wl.id).toBe('w1');
    expect(wl.operations[0].id).toBe('op1');
  });

  it('should reject missing fields', () => {
    const p = path.join(os.tmpdir(), 'inv-wl.json');
    fs.writeFileSync(p, JSON.stringify({ id: 'w1', operations: [] }));
    expect(() => WorkloadLoader.load(p)).toThrow(/Missing id, name, or operations array/);
  });

  it('should reject duplicate operation IDs', () => {
    const p = path.join(os.tmpdir(), 'dup-wl.json');
    fs.writeFileSync(
      p,
      JSON.stringify({
        id: 'w1',
        name: 'W1',
        description: 'desc',
        operations: [
          { id: 'op1', method: 'GET', path: '/foo' },
          { id: 'op1', method: 'POST', path: '/bar' },
        ],
      }),
    );
    expect(() => WorkloadLoader.load(p)).toThrow(/Duplicate operation ID found: op1/);
  });
});

describe('WorkloadReplayEngine', () => {
  let server: http.Server;
  let port: number;
  let baseUrl: string;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/ok') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } else if (req.url === '/slow') {
        setTimeout(() => {
          res.writeHead(200);
          res.end('done');
        }, 300);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as net.AddressInfo).port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(() => {
    server.close();
  });

  it('should execute operations sequentially and capture results', async () => {
    const engine = new WorkloadReplayEngine(1000);
    const workload = {
      id: 'w1',
      name: 'test',
      description: 'test',
      operations: [
        { id: 'op1', method: 'GET', path: '/ok', expect: { status: 200 } },
        { id: 'op2', method: 'GET', path: '/not-found' },
      ],
    };

    const result = await engine.replay(workload, baseUrl);
    expect(result.success).toBe(false); // op2 fails (404)
    expect(result.operations.length).toBe(2);

    expect(result.operations[0].status).toBe(200);
    expect(result.operations[0].success).toBe(true);
    expect((result.operations[0].response as { status: string }).status).toBe('ok');

    expect(result.operations[1].status).toBe(404);
    expect(result.operations[1].success).toBe(false);
  });

  it('should enforce timeouts', async () => {
    const engine = new WorkloadReplayEngine(100); // 100ms timeout
    const workload = {
      id: 'w2',
      name: 'test',
      description: 'test',
      operations: [{ id: 'op1', method: 'GET', path: '/slow' }],
    };
    const result = await engine.replay(workload, baseUrl);
    expect(result.operations[0].success).toBe(false);
    expect(result.operations[0].status).toBe(504);
    expect(result.operations[0].error).toMatch(/Timeout/);
  });
});
