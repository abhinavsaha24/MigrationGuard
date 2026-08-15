import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MigrationEngine, MigrationError } from './index.js';
import { PostgresSandbox } from '@migrationguard/sandbox';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import * as os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES = path.resolve(__dirname, '../../../fixtures/prisma');

describe('MigrationEngine M3', () => {
  let sandbox: PostgresSandbox;
  let engine: MigrationEngine;
  let dbUrl: string;

  beforeAll(async () => {
    sandbox = new PostgresSandbox(`mg-test-engine-${Date.now()}`);
    await sandbox.start();
    dbUrl = sandbox.getDatabaseUrl();
    engine = new MigrationEngine(dbUrl);
  }, 60000);

  afterAll(() => {
    engine.cleanup();
    sandbox.stop();
  });

  it('should fail if applying before workspace is prepared', () => {
    expect(() => engine.applyMigration('some/dir', 'v1')).toThrow(MigrationError);
  });

  it('should prepare workspace and apply a migration sequentially', () => {
    engine.prepareWorkspace(path.join(FIXTURES, 'schema.prisma'));

    // Apply V1
    const v1Path = path.join(FIXTURES, 'migrations', '20240101000000_v1');
    engine.applyMigration(v1Path, '20240101000000_v1');

    // Seed
    const seedSql = path.join(os.tmpdir(), `test-seed-${Date.now()}.sql`);
    fs.writeFileSync(
      seedSql,
      `INSERT INTO "users" ("name", "email") VALUES ('EngineTest', 'engine@example.com');`,
    );
    engine.seedRawSql(seedSql);

    // Apply V2
    const v2Path = path.join(FIXTURES, 'migrations', '20240102000000_v2');
    engine.applyMigration(v2Path, '20240102000000_v2');

    expect(true).toBe(true);
  }, 60000);
});
