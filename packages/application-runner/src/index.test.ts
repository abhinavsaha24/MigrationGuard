import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ApplicationRunner } from './index.js';
import { PostgresSandbox } from '@migrationguard/sandbox';
import { MigrationEngine } from '@migrationguard/migration-engine';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as os from 'os';
import * as fs from 'fs';
import * as http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES = path.resolve(__dirname, '../../../fixtures/prisma');

describe('ApplicationRunner M4', () => {
  let sandbox: PostgresSandbox;
  let engine: MigrationEngine;
  let dbUrl: string;

  beforeAll(async () => {
    sandbox = new PostgresSandbox(`mg-test-runner-${Date.now()}`);
    await sandbox.start();
    dbUrl = sandbox.getDatabaseUrl();

    engine = new MigrationEngine(dbUrl);
    engine.prepareWorkspace(path.join(FIXTURES, 'schema.prisma'));
    engine.applyMigration(
      path.join(FIXTURES, 'migrations', '20240101000000_v1'),
      '20240101000000_v1',
    );
    const seedSql = path.join(os.tmpdir(), `test-seed-${Date.now()}.sql`);
    fs.writeFileSync(
      seedSql,
      `INSERT INTO "users" ("name", "email") VALUES ('AppTest', 'app@example.com');`,
    );
    engine.seedRawSql(seedSql);
  }, 60000);

  afterAll(() => {
    engine.cleanup();
    sandbox.stop();
  });

  it('should start old app, allocate dynamic port, and cleanly stop', async () => {
    const runner = new ApplicationRunner('OLD');
    await runner.start(dbUrl);
    const port = runner.getPort();
    expect(port).toBeGreaterThan(0);

    // Verify health
    const isUp = await new Promise<boolean>((resolve) => {
      http
        .get(`http://localhost:${port}/health`, (res) => resolve(res.statusCode === 200))
        .on('error', () => resolve(false));
    });
    expect(isUp).toBe(true);

    runner.stop();

    // Process should be dead
    await new Promise((r) => setTimeout(r, 1000));
    const isUpAfterStop = await new Promise<boolean>((resolve) => {
      http
        .get(`http://localhost:${port}/health`, (res) => resolve(res.statusCode === 200))
        .on('error', () => resolve(false));
    });
    expect(isUpAfterStop).toBe(false);
  }, 30000);
});
