import { CompatibilityMatrixEngine, MatrixConfig } from '@migrationguard/matrix-engine';
import { PostgresSandbox } from '@migrationguard/sandbox';
import { MigrationEngine } from '@migrationguard/migration-engine';
import { ApplicationRunner } from '@migrationguard/application-runner';
import { WorkloadLoader, WorkloadReplayEngine } from '@migrationguard/workload';
import { CompatibilityAnalyzer } from '@migrationguard/compatibility';
import * as path from 'path';
import * as fs from 'fs';
import { AtlasEvaluator, AtlasResult } from './atlas-evaluator.js';

export interface BenchmarkManifestTest {
  testId: string;
  track: 'A' | 'B';
  repository: string;
  migration: string;
  faultType: string;
  groundTruth: 'SAFE' | 'UNSAFE';
  workload?: string;
}

export interface BenchmarkManifest {
  tests: BenchmarkManifestTest[];
}

export interface BenchmarkResult {
  testId: string;
  track: 'A' | 'B';
  repository: string;
  faultType: string;
  groundTruth: 'SAFE' | 'UNSAFE';
  migrationguard: {
    verdict: 'SAFE' | 'UNSAFE' | 'NOT_EVALUATED';
    confidence: string;
    evidenceFaultType: string;
  };
  atlas: AtlasResult;
}

export class BenchmarkRunner {
  private repoRoot: string;
  private atlasEvaluator: AtlasEvaluator;

  constructor(repoRoot: string) {
    this.repoRoot = repoRoot;
    this.atlasEvaluator = new AtlasEvaluator(repoRoot);
  }

  public async runBenchmark(manifestPath: string, filter?: string): Promise<BenchmarkResult[]> {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw);
    const results: BenchmarkResult[] = [];

    let testsToRun = manifest.tests;
    if (filter) {
      testsToRun = testsToRun.filter(
        (t: any) => t.testId.includes(filter) || t.repository.includes(filter),
      );
    }

    for (const test of testsToRun) {
      console.log(`\n--- Running Benchmark Test: ${test.testId} [Track ${test.track}] ---`);
      const repoPath = path.resolve(this.repoRoot, test.repository);

      const sandbox = new PostgresSandbox('mg-benchmark-' + Date.now());
      await sandbox.start();

      let atlasResult: AtlasResult;
      let mgVerdict: 'SAFE' | 'UNSAFE' | 'NOT_EVALUATED' = 'NOT_EVALUATED';
      let mgConfidence = 'UNKNOWN';
      let mgEvidenceFaultType = 'NONE';

      try {
        const dbUrl = sandbox.getDatabaseUrl();
        const migrationEngine = new MigrationEngine(dbUrl);

        // Run Atlas Baseline
        // For Track A and Track B, migrations are in prisma/migrations or migrations depending on repo structure.
        // Let's standardise that all fixtures and repos should use `prisma/migrations` if possible, OR check if it exists.
        const trackMigrationsPath = fs.existsSync(path.join(repoPath, 'prisma', 'migrations'))
          ? path.join(repoPath, 'prisma', 'migrations')
          : path.join(repoPath, 'migrations');
        const v2MigrationDir = path.join(trackMigrationsPath, test.migration);
        const v2MigrationFile = path.join(v2MigrationDir, 'migration.sql');
        const v2MigrationSql = fs.existsSync(v2MigrationFile)
          ? fs.readFileSync(v2MigrationFile, 'utf-8')
          : '';
        atlasResult = await this.atlasEvaluator.evaluate(trackMigrationsPath, dbUrl, this.repoRoot);

        console.log(`[Atlas] Evaluated: ${atlasResult.status} (exitCode: ${atlasResult.exitCode})`);

        const oldRunner = new ApplicationRunner('OLD', repoPath);
        const newRunner = new ApplicationRunner('NEW', repoPath);
        const workloadEngine = new WorkloadReplayEngine(5000);

        // Use a generic workload or the specific one
        const workloadPath = path.resolve(
          this.repoRoot,
          test.workload || 'benchmark/workloads/m1-user-compatibility.json',
        );
        const workload = WorkloadLoader.load(workloadPath);

        const config: MatrixConfig = {
          sandbox,
          migrationEngine,
          oldRunner,
          newRunner,
          workloadEngine,
          workload,
          schemaPath: fs.existsSync(path.join(repoPath, 'prisma', 'schema.prisma'))
            ? path.join(repoPath, 'prisma', 'schema.prisma')
            : path.join(repoPath, 'schema.prisma'),
          v1MigrationDir: path.join(trackMigrationsPath, '20240101000000_v1'),
          v1MigrationName: '20240101000000_v1',
          v2MigrationDir: v2MigrationDir,
          v2MigrationName: test.migration,
          seedSqlPath: fs.existsSync(path.join(trackMigrationsPath, 'seed.sql'))
            ? path.join(trackMigrationsPath, 'seed.sql')
            : undefined,
        };

        const matrixEngine = new CompatibilityMatrixEngine(config);
        const engineResult = await matrixEngine.executeMatrix(`BM-${test.testId}`);
        const evidenceList = engineResult.runs.map((run: any) => ({
          run,
          ev: CompatibilityAnalyzer.analyze(run, v2MigrationSql, v2MigrationFile),
        }));

        // A database migration is UNSAFE if it breaks the existing application (OLD APP + V2)
        // or if the new application is broken on the new database (NEW APP + V2).
        // NEW APP + V1 failure is a forward-incompatibility (requires deploying DB before app), which is normal for additive changes.
        const isUnsafe = evidenceList.some(({ run, ev }) => {
          if (ev.failureCategory === 'COMPATIBILITY_FAILURE') {
            // Ignore NEW APP + V1 forward compatibility failures as they don't make the database migration itself unsafe
            if (run.applicationVersion === 'NEW' && run.databaseVersion === 'V1') {
              return false;
            }
            return true;
          }
          if (ev.failureCategory === 'MIGRATION_EXECUTION_FAILURE') {
            return true;
          }
          return false;
        });

        if (isUnsafe) {
          mgVerdict = 'UNSAFE';
          const failingEv = evidenceList.find(
            ({ run, ev }) =>
              (ev.failureCategory === 'COMPATIBILITY_FAILURE' &&
                !(run.applicationVersion === 'NEW' && run.databaseVersion === 'V1')) ||
              ev.failureCategory === 'MIGRATION_EXECUTION_FAILURE',
          );
          if (failingEv) {
            mgConfidence = failingEv.ev.confidence;
            mgEvidenceFaultType = failingEv.ev.faultType;
          }
        } else {
          // If there are infrastructure failures, we can't be sure it's SAFE
          const hasInfraErr = evidenceList.some(
            ({ run, ev }) =>
              ev.failureCategory !== 'NONE' &&
              ev.failureCategory !== 'COMPATIBILITY_FAILURE' &&
              ev.failureCategory !== 'MIGRATION_EXECUTION_FAILURE',
          );
          if (hasInfraErr) {
            mgVerdict = 'NOT_EVALUATED';
            console.log(`[MigrationGuard] Matrix ran into infrastructure/execution failure.`);
          } else {
            mgVerdict = 'SAFE';
          }
        }

        console.log(
          `[MigrationGuard] Verdict: ${mgVerdict} (Confidence: ${mgConfidence}, Fault: ${mgEvidenceFaultType})`,
        );
      } catch (e: any) {
        console.error(`[Benchmark Runner] Error in test ${test.testId}:`, e.message);
        atlasResult = {
          baseline: 'ATLAS',
          baselineVersion: 'unknown',
          exitCode: -1,
          status: 'NOT_EVALUATED',
          stdout: '',
          stderr: e.message,
          executionTimeMs: 0,
          evaluated: false,
          notes: 'Test failed due to internal error.',
        };
      } finally {
        await sandbox.stop();
      }

      results.push({
        testId: test.testId,
        track: test.track,
        repository: test.repository,
        faultType: test.faultType,
        groundTruth: test.groundTruth,
        migrationguard: {
          verdict: mgVerdict,
          confidence: mgConfidence,
          evidenceFaultType: mgEvidenceFaultType,
        },
        atlas: atlasResult,
      });
    }

    return results;
  }
}
