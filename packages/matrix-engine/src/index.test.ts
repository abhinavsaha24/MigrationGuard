import { describe, it, expect, vi } from 'vitest';
import { CompatibilityMatrixEngine } from './engine.js';
import { PostgresSandbox } from '@migrationguard/sandbox';
import { MigrationEngine } from '@migrationguard/migration-engine';
import { ApplicationRunner } from '@migrationguard/application-runner';
import { WorkloadReplayEngine, Workload } from '@migrationguard/workload';

describe('CompatibilityMatrixEngine M6', () => {
  it('should execute 4 quadrants and aggregate results', async () => {
    const sandbox = { getDatabaseUrl: () => 'postgres://' } as unknown as PostgresSandbox;

    const migrationEngine = {
      prepareWorkspace: vi.fn(),
      applyMigration: vi.fn(),
      seedRawSql: vi.fn(),
    } as unknown as MigrationEngine;

    const oldRunner = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      getPort: () => 3000,
    } as unknown as ApplicationRunner;

    const newRunner = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      getPort: () => 3001,
    } as unknown as ApplicationRunner;

    const workloadEngine = {
      replay: vi.fn().mockResolvedValue({ success: true, operations: [] }),
    } as unknown as WorkloadReplayEngine;

    const workload: Workload = { id: 'w1', name: 'W1', description: '', operations: [] };

    const engine = new CompatibilityMatrixEngine({
      sandbox,
      migrationEngine,
      oldRunner,
      newRunner,
      workloadEngine,
      workload,
      schemaPath: 'schema.prisma',
      v1MigrationDir: 'v1',
      v1MigrationName: 'v1',
      v2MigrationDir: 'v2',
      v2MigrationName: 'v2',
    });

    const result = await engine.executeMatrix('run1');

    expect(result.runs).toHaveLength(4);

    expect(result.runs[0].applicationVersion).toBe('OLD');
    expect(result.runs[0].databaseVersion).toBe('V1');
    expect(result.runs[0].status).toBe('PASS');

    expect(result.runs[1].applicationVersion).toBe('NEW');
    expect(result.runs[1].databaseVersion).toBe('V1');
    expect(result.runs[1].status).toBe('PASS');

    expect(result.runs[2].applicationVersion).toBe('OLD');
    expect(result.runs[2].databaseVersion).toBe('V2');
    expect(result.runs[2].status).toBe('PASS');

    expect(result.runs[3].applicationVersion).toBe('NEW');
    expect(result.runs[3].databaseVersion).toBe('V2');
    expect(result.runs[3].status).toBe('PASS');
  });

  it('should propagate INFRASTRUCTURE_FAILURE if V1 setup fails', async () => {
    const sandbox = { getDatabaseUrl: () => 'postgres://' } as unknown as PostgresSandbox;

    const migrationEngine = {
      prepareWorkspace: vi.fn().mockImplementation(() => {
        throw new Error('DB Down');
      }),
      applyMigration: vi.fn(),
      seedRawSql: vi.fn(),
    } as unknown as MigrationEngine;

    const oldRunner = {} as unknown as ApplicationRunner;
    const newRunner = {} as unknown as ApplicationRunner;
    const workloadEngine = {} as unknown as WorkloadReplayEngine;
    const workload: Workload = { id: 'w1', name: 'W1', description: '', operations: [] };

    const engine = new CompatibilityMatrixEngine({
      sandbox,
      migrationEngine,
      oldRunner,
      newRunner,
      workloadEngine,
      workload,
      schemaPath: 'schema.prisma',
      v1MigrationDir: 'v1',
      v1MigrationName: 'v1',
      v2MigrationDir: 'v2',
      v2MigrationName: 'v2',
    });

    const result = await engine.executeMatrix('run2');

    expect(result.runs).toHaveLength(4);
    expect(result.runs[0].status).toBe('INFRASTRUCTURE_FAILURE'); // OLD V1
    expect(result.runs[1].status).toBe('INFRASTRUCTURE_FAILURE'); // NEW V1
    expect(result.runs[2].status).toBe('INFRASTRUCTURE_FAILURE'); // OLD V2 (skipped)
    expect(result.runs[3].status).toBe('INFRASTRUCTURE_FAILURE'); // NEW V2 (skipped)
  });
});
