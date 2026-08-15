import { WorkloadResult } from '@migrationguard/workload';

export type AppVersionState = 'OLD' | 'NEW';
export type DbVersionState = 'V1' | 'V2';

export type MatrixRunStatus =
  | 'PASS'
  | 'COMPATIBILITY_FAILURE'
  | 'APPLICATION_STARTUP_FAILURE'
  | 'DATABASE_CONNECTION_FAILURE'
  | 'MIGRATION_FAILURE'
  | 'WORKLOAD_FAILURE'
  | 'INFRASTRUCTURE_FAILURE';

export interface CompatibilityRun {
  runId: string;
  applicationVersion: AppVersionState;
  databaseVersion: DbVersionState;
  workloadId: string;
  status: MatrixRunStatus;
  workloadResult?: WorkloadResult;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  error?: string;
}

export interface CompatibilityMatrix {
  runId: string;
  workloadId: string;
  startedAt: string;
  completedAt: string;
  runs: CompatibilityRun[];
}
