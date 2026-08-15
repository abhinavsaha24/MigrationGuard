import { describe, it, expect } from 'vitest';
import { ObservationNormalizer, FaultClassifier, CausalAnalyzer } from './index.js';
import { CompatibilityRun } from '@migrationguard/matrix-engine';

describe('Compatibility Pipeline', () => {
  const baseRun: CompatibilityRun = {
    runId: 'test1',
    applicationVersion: 'OLD',
    databaseVersion: 'V2',
    workloadId: 'w1',
    status: 'WORKLOAD_FAILURE',
    startedAt: '',
    completedAt: '',
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
});
