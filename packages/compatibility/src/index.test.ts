import { describe, it, expect } from 'vitest';
import {
  ObservationNormalizer,
  FaultClassifier,
  CausalAnalyzer,
  EvidenceBuilder,
} from './index.js';
import { CompatibilityRun } from '@migrationguard/matrix-engine';

describe('Compatibility Pipeline', () => {
  const baseRun: CompatibilityRun = {
    runId: 'test1',
    applicationVersion: 'OLD',
    databaseVersion: 'V2',
    workloadId: 'w1',
    status: 'WORKLOAD_FAILURE',
    startedAt: '2026-01-01T00:00:00.000Z',
    completedAt: '2026-01-01T00:00:01.000Z',
    durationMs: 100,
  };

  it('Normalizes DB error correctly', () => {
    const run = {
      ...baseRun,
      workloadResult: {
        success: false,
        operations: [
          {
            id: 'op1',
            method: 'GET',
            path: '/users/1',
            success: false,
            status: 500,
            durationMs: 10,
            response: {
              isDatabaseError: true,
              error: 'The column `name` does not exist in the current database',
            },
          },
        ],
      },
    } as unknown as CompatibilityRun;

    const obs = ObservationNormalizer.normalize(run);
    expect(obs.isMissingColumn).toBe(true);
    expect(obs.missingColumnName).toBe('name');
  });

  it('Negative Test: Generic 500 error produces WORKLOAD_FAILURE', () => {
    const run = {
      ...baseRun,
      workloadResult: {
        success: false,
        operations: [
          {
            id: 'op1',
            method: 'GET',
            path: '/users/1',
            success: false,
            status: 500,
            durationMs: 10,
            response: { error: 'TypeError: Cannot read properties of undefined' },
          },
        ],
      },
    } as unknown as CompatibilityRun;

    const obs = ObservationNormalizer.normalize(run);
    const cls = FaultClassifier.classify(run, obs);
    expect(cls.category).toBe('WORKLOAD_FAILURE');
    expect(cls.baseFaultType).toBe('NONE');
  });

  it('Negative Test: Docker timeout produces TIMEOUT_FAILURE', () => {
    const run = {
      ...baseRun,
      status: 'INFRASTRUCTURE_FAILURE',
      error: 'Docker timeout',
    } as CompatibilityRun;
    const obs = ObservationNormalizer.normalize(run);
    const cls = FaultClassifier.classify(run, obs);
    expect(cls.category).toBe('TIMEOUT_FAILURE');
  });

  it('Causal Analyzer Maps DESTRUCTIVE_RENAME', () => {
    const obs = { isMissingColumn: true, missingColumnName: 'name', durationMs: 10 };
    const cls = {
      category: 'COMPATIBILITY_FAILURE' as const,
      baseFaultType: 'COLUMN_REMOVAL' as const,
    };
    const sql = `ALTER TABLE users DROP COLUMN name; ALTER TABLE users ADD COLUMN full_name TEXT;`;

    const causal = CausalAnalyzer.analyze(baseRun, obs, cls, sql);
    expect(causal.faultType).toBe('DESTRUCTIVE_RENAME');
    expect(causal.confidence).toBe('CONFIRMED');
    expect(causal.migrationStatement).toContain('DROP COLUMN name');
  });

  it('Causal Analyzer Maps QUERY_INCOMPATIBILITY for NEW+V1', () => {
    const run = {
      ...baseRun,
      applicationVersion: 'NEW',
      databaseVersion: 'V1',
    } as CompatibilityRun;
    const obs = { isMissingColumn: true, missingColumnName: 'full_name', durationMs: 10 };
    const cls = {
      category: 'COMPATIBILITY_FAILURE' as const,
      baseFaultType: 'COLUMN_REMOVAL' as const,
    };
    const sql = `ALTER TABLE users ADD COLUMN full_name TEXT;`;

    const causal = CausalAnalyzer.analyze(run, obs, cls, sql);
    expect(causal.faultType).toBe('QUERY_INCOMPATIBILITY');
    expect(causal.confidence).toBe('CONFIRMED');
  });

  it('Causal Analyzer Maps Native RENAME COLUMN', () => {
    const obs = { isMissingColumn: true, missingColumnName: 'name', durationMs: 10 };
    const cls = {
      category: 'COMPATIBILITY_FAILURE' as const,
      baseFaultType: 'COLUMN_REMOVAL' as const,
    };
    const sql = `ALTER TABLE users RENAME COLUMN name TO full_name;`;

    const causal = CausalAnalyzer.analyze(baseRun, obs, cls, sql);
    expect(causal.faultType).toBe('DESTRUCTIVE_RENAME');
    expect(causal.confidence).toBe('CONFIRMED');
    expect(causal.migrationStatement).toContain('RENAME COLUMN name TO full_name');
  });

  it('Causal Analyzer Maps Native RENAME COLUMN with quotes', () => {
    const obs = { isMissingColumn: true, missingColumnName: 'name', durationMs: 10 };
    const cls = {
      category: 'COMPATIBILITY_FAILURE' as const,
      baseFaultType: 'COLUMN_REMOVAL' as const,
    };
    const sql = `ALTER TABLE "public"."users" RENAME COLUMN "name" TO "full_name";`;

    const causal = CausalAnalyzer.analyze(baseRun, obs, cls, sql);
    expect(causal.faultType).toBe('DESTRUCTIVE_RENAME');
    expect(causal.confidence).toBe('CONFIRMED');
  });
});

describe('Evidence Provenance — SHA-256', () => {
  it('EvidenceBuilder produces full 64-char SHA-256 evidenceId', () => {
    const run: CompatibilityRun = {
      runId: 'run-prov-test',
      applicationVersion: 'OLD',
      databaseVersion: 'V2',
      workloadId: 'w1',
      status: 'PASS',
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:00:01.000Z',
      durationMs: 42,
    };
    const obs = { isMissingColumn: false, durationMs: 42, executedQueries: [] };
    const cls = { category: 'NONE' as const, baseFaultType: 'NONE' as const };
    const causal = { faultType: 'NONE' as const, confidence: 'UNKNOWN' as const, causalChain: [] };

    const record = EvidenceBuilder.build(run, obs, cls, causal);

    expect(record.evidenceId).toMatch(/^EVD-[0-9a-f]{64}$/);
  });

  it('EvidenceBuilder evidenceId is deterministic for identical inputs', () => {
    const run: CompatibilityRun = {
      runId: 'run-deterministic',
      applicationVersion: 'OLD',
      databaseVersion: 'V2',
      workloadId: 'w1',
      status: 'PASS',
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:00:01.000Z',
      durationMs: 100,
    };
    const obs = { isMissingColumn: false, durationMs: 100, executedQueries: [] };
    const cls = { category: 'NONE' as const, baseFaultType: 'NONE' as const };
    const causal = { faultType: 'NONE' as const, confidence: 'UNKNOWN' as const, causalChain: [] };

    const r1 = EvidenceBuilder.build(run, obs, cls, causal);
    const r2 = EvidenceBuilder.build(run, obs, cls, causal);

    expect(r1.evidenceId).toBe(r2.evidenceId);
  });

  it('EvidenceBuilder evidenceId changes when input changes', () => {
    const baseRun: CompatibilityRun = {
      runId: 'run-mutation',
      applicationVersion: 'OLD',
      databaseVersion: 'V2',
      workloadId: 'w1',
      status: 'PASS',
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:00:01.000Z',
      durationMs: 100,
    };
    const obs = { isMissingColumn: false, durationMs: 100, executedQueries: [] };
    const cls = { category: 'NONE' as const, baseFaultType: 'NONE' as const };
    const causal = { faultType: 'NONE' as const, confidence: 'UNKNOWN' as const, causalChain: [] };

    const r1 = EvidenceBuilder.build(baseRun, obs, cls, causal);
    const mutatedRun = { ...baseRun, runId: 'run-mutation-changed' };
    const r2 = EvidenceBuilder.build(mutatedRun, obs, cls, causal);

    expect(r1.evidenceId).not.toBe(r2.evidenceId);
  });

  it('buildInputHashes produces deterministic SHA-256 hashes', () => {
    const hashes1 = EvidenceBuilder.buildInputHashes({
      schemaV1: 'CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT);',
      migrationSql: 'ALTER TABLE users DROP COLUMN name;',
    });
    const hashes2 = EvidenceBuilder.buildInputHashes({
      schemaV1: 'CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT);',
      migrationSql: 'ALTER TABLE users DROP COLUMN name;',
    });

    expect(hashes1.schemaV1).toBe(hashes2.schemaV1);
    expect(hashes1.migrationSql).toBe(hashes2.migrationSql);
    expect(hashes1.schemaV1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('buildInputHashes changes when input changes by one byte', () => {
    const h1 = EvidenceBuilder.buildInputHashes({ schemaV1: 'CREATE TABLE users (id INT);' });
    const h2 = EvidenceBuilder.buildInputHashes({ schemaV1: 'CREATE TABLE users (id INT);x' });
    expect(h1.schemaV1).not.toBe(h2.schemaV1);
  });

  it('EvidenceRecord includes inputHashes when provided', () => {
    const run: CompatibilityRun = {
      runId: 'run-hash-test',
      applicationVersion: 'OLD',
      databaseVersion: 'V2',
      workloadId: 'w1',
      status: 'PASS',
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:00:01.000Z',
      durationMs: 50,
    };
    const obs = { isMissingColumn: false, durationMs: 50, executedQueries: [] };
    const cls = { category: 'NONE' as const, baseFaultType: 'NONE' as const };
    const causal = { faultType: 'NONE' as const, confidence: 'UNKNOWN' as const, causalChain: [] };
    const inputHashes = EvidenceBuilder.buildInputHashes({
      schemaV1: 'CREATE TABLE users (id INT);',
      migrationSql: 'ALTER TABLE users ADD COLUMN email TEXT;',
    });

    const record = EvidenceBuilder.build(run, obs, cls, causal, undefined, undefined, inputHashes);

    expect(record.inputHashes).toBeDefined();
    expect(record.inputHashes!['schemaV1']).toMatch(/^[0-9a-f]{64}$/);
    expect(record.inputHashes!['migrationSql']).toMatch(/^[0-9a-f]{64}$/);
  });
});
