import { PostgresSandbox } from '@migrationguard/sandbox';
import { MigrationEngine } from '@migrationguard/migration-engine';
import { ApplicationRunner } from '@migrationguard/application-runner';
import { Workload, WorkloadReplayEngine } from '@migrationguard/workload';
import {
  CompatibilityRun,
  CompatibilityMatrix,
  AppVersionState,
  DbVersionState,
  MatrixRunStatus,
} from './model.js';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export interface MatrixConfig {
  sandbox: PostgresSandbox;
  migrationEngine: MigrationEngine;
  oldRunner: ApplicationRunner;
  newRunner: ApplicationRunner;
  workloadEngine: WorkloadReplayEngine;
  workload: Workload;
  schemaPath: string;
  v1MigrationDir: string;
  v1MigrationName: string;
  v2MigrationDir: string;
  v2MigrationName: string;
  seedSqlPath?: string;
}

export class CompatibilityMatrixEngine {
  private config: MatrixConfig;

  constructor(config: MatrixConfig) {
    this.config = config;
  }

  public async executeMatrix(runId: string): Promise<CompatibilityMatrix> {
    const startedAt = new Date().toISOString();
    const runs: CompatibilityRun[] = [];

    // V1 setup
    let v1SetupSuccess = false;
    try {
      this.config.migrationEngine.prepareWorkspace(this.config.schemaPath);
      this.config.migrationEngine.applyMigration(
        this.config.v1MigrationDir,
        this.config.v1MigrationName,
      );

      if (this.config.seedSqlPath && fs.existsSync(this.config.seedSqlPath)) {
        this.config.migrationEngine.seedRawSql(this.config.seedSqlPath);
      } else {
        const tempSqlPath = path.join(os.tmpdir(), 'mg-seed.sql');
        fs.writeFileSync(
          tempSqlPath,
          `
          INSERT INTO "users" ("name", "email") VALUES ('Abhinav', 'abhinav@example.com');
          INSERT INTO "users" ("name", "email") VALUES ('Test User', 'test@example.com');
        `,
          'utf-8',
        );
        this.config.migrationEngine.seedRawSql(tempSqlPath);
      }
      v1SetupSuccess = true;
    } catch (err) {
      console.error('[MatrixEngine] V1 Setup Failed:', err);
      runs.push(this.createFailedRun(runId, 'OLD', 'V1', 'INFRASTRUCTURE_FAILURE', err));
      runs.push(this.createFailedRun(runId, 'NEW', 'V1', 'INFRASTRUCTURE_FAILURE', err));
    }

    if (v1SetupSuccess) {
      runs.push(await this.executeQuadrant(runId, 'OLD', 'V1', this.config.oldRunner));
      runs.push(await this.executeQuadrant(runId, 'NEW', 'V1', this.config.newRunner));
    }

    // V2 setup
    let v2SetupSuccess = false;
    if (v1SetupSuccess) {
      try {
        this.config.migrationEngine.applyMigration(
          this.config.v2MigrationDir,
          this.config.v2MigrationName,
        );
        v2SetupSuccess = true;
      } catch (err) {
        console.error('[MatrixEngine] V2 Setup Failed:', err);
        runs.push(this.createFailedRun(runId, 'OLD', 'V2', 'MIGRATION_FAILURE', err));
        runs.push(this.createFailedRun(runId, 'NEW', 'V2', 'MIGRATION_FAILURE', err));
      }
    } else {
      runs.push(
        this.createFailedRun(
          runId,
          'OLD',
          'V2',
          'INFRASTRUCTURE_FAILURE',
          'Skipped due to V1 failure',
        ),
      );
      runs.push(
        this.createFailedRun(
          runId,
          'NEW',
          'V2',
          'INFRASTRUCTURE_FAILURE',
          'Skipped due to V1 failure',
        ),
      );
    }

    if (v2SetupSuccess) {
      runs.push(await this.executeQuadrant(runId, 'OLD', 'V2', this.config.oldRunner));
      runs.push(await this.executeQuadrant(runId, 'NEW', 'V2', this.config.newRunner));
    }

    return {
      runId,
      workloadId: this.config.workload.id,
      startedAt,
      completedAt: new Date().toISOString(),
      runs,
    };
  }

  private async executeQuadrant(
    runId: string,
    appVersion: AppVersionState,
    dbVersion: DbVersionState,
    runner: ApplicationRunner,
  ): Promise<CompatibilityRun> {
    const startedAt = new Date().toISOString();
    const start = Date.now();
    let status: MatrixRunStatus = 'PASS';
    let errorStr: string | undefined;
    let workloadResult;

    try {
      await runner.start(this.config.sandbox.getDatabaseUrl());
    } catch (err) {
      status = 'APPLICATION_STARTUP_FAILURE';
      errorStr = err instanceof Error ? err.message : String(err);
      return {
        runId,
        applicationVersion: appVersion,
        databaseVersion: dbVersion,
        workloadId: this.config.workload.id,
        status,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - start,
        error: errorStr,
      };
    }

    try {
      workloadResult = await this.config.workloadEngine.replay(
        this.config.workload,
        `http://localhost:${runner.getPort()}`,
      );
      if (!workloadResult.success) {
        status = 'WORKLOAD_FAILURE';
      }
    } catch (err) {
      status = 'INFRASTRUCTURE_FAILURE';
      errorStr = (err as Error).message;
    } finally {
      runner.stop();
    }

    return {
      runId,
      applicationVersion: appVersion,
      databaseVersion: dbVersion,
      workloadId: this.config.workload.id,
      status,
      workloadResult,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
      error: errorStr,
    };
  }

  private createFailedRun(
    runId: string,
    appVersion: AppVersionState,
    dbVersion: DbVersionState,
    status: MatrixRunStatus,
    err: unknown,
  ): CompatibilityRun {
    return {
      runId,
      applicationVersion: appVersion,
      databaseVersion: dbVersion,
      workloadId: this.config.workload.id,
      status,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
