import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomBytes } from 'crypto';
import { execSync } from 'child_process';
import { PostgresSandbox } from '@migrationguard/sandbox';
import { ApplicationRunner } from '@migrationguard/application-runner';
import { MigrationEngine } from '@migrationguard/migration-engine';
import { WorkloadReplayEngine } from '@migrationguard/workload';
import { CompatibilityMatrixEngine } from '@migrationguard/matrix-engine';
import { PrismaMutationEngine } from '@migrationguard/mutation-engine';

interface MutationCase {
  operator: string;
  expectedLabel: string;
  mutator: (schemaPath: string) => void;
}

export async function mutateCommandAction(repoRoot: string) {
  console.log('\n--- MigrationGuard End-to-End Mutation Experiment ---\n');

  const fixturesDir = path.join(repoRoot, 'benchmark', 'fixtures', 'safe-add-column');
  const schemaV1Path = path.join(fixturesDir, 'schema-v1.prisma');

  const cases: MutationCase[] = [
    {
      operator: 'DROP_COLUMN',
      expectedLabel: 'UNSAFE',
      mutator: (p) => PrismaMutationEngine.dropColumn(p, 'users', 'name'),
    },
    {
      operator: 'NATIVE_RENAME',
      expectedLabel: 'UNSAFE',
      mutator: (p) => PrismaMutationEngine.renameColumn(p, 'users', 'name', 'name_new'),
    },
    {
      operator: 'TYPE_NARROWING',
      expectedLabel: 'UNSAFE',
      mutator: (p) => PrismaMutationEngine.changeColumnType(p, 'users', 'email', 'Int'),
    },
    {
      operator: 'SAFE_ADD_COLUMN',
      expectedLabel: 'SAFE_UNEXERCISED', // since the existing workload doesn't use it
      mutator: (p) => PrismaMutationEngine.addColumn(p, 'users', 'age Int?'),
    },
  ];

  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;
  let infraFailures = 0;
  const results: any[] = [];

  const workloadEngine = new WorkloadReplayEngine();

  for (const c of cases) {
    console.log(`\n--- Running Mutation: ${c.operator} ---`);
    const runId = `mut-${randomBytes(4).toString('hex')}`;
    const workspaceDir = path.join(os.tmpdir(), `mg-mutate-${runId}`);
    fs.mkdirSync(workspaceDir, { recursive: true });

    const localSchemaV1 = path.join(workspaceDir, 'schema-v1.prisma');
    const localSchemaV2 = path.join(workspaceDir, 'schema-v2.prisma');
    fs.copyFileSync(schemaV1Path, localSchemaV1);
    fs.copyFileSync(path.join(fixturesDir, 'schema-v2.prisma'), localSchemaV2);

    let actualVerdict = 'NOT_EVALUATED';
    let executionStatus = 'SUCCESS';
    let failureReason = '';

    try {
      // 1. Generate mutation
      c.mutator(localSchemaV2);

      // 2. Generate migration SQL
      const migrationSqlPath = path.join(workspaceDir, 'migration.sql');
      const v2MigrationDir = path.join(workspaceDir, 'v2');
      const v1MigrationDir = path.join(workspaceDir, 'v1');
      fs.mkdirSync(v2MigrationDir, { recursive: true });
      fs.mkdirSync(v1MigrationDir, { recursive: true });
      fs.copyFileSync(
        path.join(fixturesDir, 'migrations', '20240101000000_v1', 'migration.sql'),
        path.join(v1MigrationDir, 'migration.sql'),
      );

      try {
        execSync(
          `npx prisma migrate diff --from-schema-datamodel "${localSchemaV1}" --to-schema-datamodel "${localSchemaV2}" --script > "${path.join(v2MigrationDir, 'migration.sql')}"`,
          {
            cwd: repoRoot,
            stdio: 'pipe',
          },
        );
      } catch (err: any) {
        throw new Error(`Prisma migrate diff failed: ${err.message}`);
      }

      // 3. Setup sandbox
      const sandbox = new PostgresSandbox(`mg-mutate-${runId}`);
      await sandbox.start();

      const migrationEngine = new MigrationEngine(sandbox.getDatabaseUrl());
      const oldRunner = new ApplicationRunner('OLD', fixturesDir);
      const newRunner = new ApplicationRunner('NEW', fixturesDir);

      const workloadPath = path.resolve(repoRoot, 'workloads', 'm1-user-compatibility.json');
      const workloadRaw = fs.readFileSync(workloadPath, 'utf-8');
      const workload = JSON.parse(workloadRaw);

      // 4. Matrix Engine
      // Create a thin wrapper around MatrixEngine usage to inject our custom generated migration
      const matrix = new CompatibilityMatrixEngine({
        sandbox,
        migrationEngine,
        oldRunner,
        newRunner,
        workloadEngine,
        workload,
        schemaPath: localSchemaV1,
        v1MigrationDir: v1MigrationDir,
        v1MigrationName: 'v1',
        v2MigrationDir: v2MigrationDir,
        v2MigrationName: 'v2',
      });

      // Proceed without overriding migrationEngine since we now provide real directories

      const matrixResult = await matrix.executeMatrix(runId);

      if (
        matrixResult.runs.some(
          (r) =>
            r.status === 'INFRASTRUCTURE_FAILURE' || r.status === 'APPLICATION_STARTUP_FAILURE',
        )
      ) {
        executionStatus = 'INFRASTRUCTURE_FAILURE';
        failureReason = 'Matrix infrastructure/startup failure.';
      } else {
        const { CompatibilityAnalyzer } = await import('@migrationguard/compatibility');

        const evidenceList = matrixResult.runs.map((run) => ({
          run,
          ev: CompatibilityAnalyzer.analyze(run, '', '', matrixResult),
        }));

        const isUnsafe = evidenceList.some(({ run, ev }) => {
          if (ev.failureCategory === 'COMPATIBILITY_FAILURE') {
            if (run.applicationVersion === 'NEW' && run.databaseVersion === 'V1') return false;
            return true;
          }
          if (ev.failureCategory === 'MIGRATION_EXECUTION_FAILURE') return true;
          return false;
        });

        if (isUnsafe) {
          actualVerdict = 'UNSAFE';
        } else {
          const hasInfraErr = evidenceList.some(
            ({ ev }) =>
              ev.failureCategory !== 'NONE' &&
              ev.failureCategory !== 'COMPATIBILITY_FAILURE' &&
              ev.failureCategory !== 'MIGRATION_EXECUTION_FAILURE',
          );
          if (hasInfraErr) {
            actualVerdict = 'NOT_EVALUATED';
          } else {
            actualVerdict = 'SAFE'; // Simplifying for the experiment
          }
        }
      }

      sandbox.stop();
      migrationEngine.cleanup();
    } catch (err: any) {
      executionStatus = 'INFRASTRUCTURE_FAILURE';
      failureReason = err.message;
    }

    if (executionStatus === 'SUCCESS') {
      const isExpectedUnsafe = c.expectedLabel === 'UNSAFE';
      const isActualUnsafe = actualVerdict === 'UNSAFE';

      if (isExpectedUnsafe && isActualUnsafe) tp++;
      else if (isExpectedUnsafe && !isActualUnsafe) fn++;
      else if (!isExpectedUnsafe && !isActualUnsafe) tn++;
      else if (!isExpectedUnsafe && isActualUnsafe) fp++;
    } else {
      infraFailures++;
    }

    results.push({
      mutationId: runId,
      operator: c.operator,
      expectedLabel: c.expectedLabel,
      actualVerdict,
      executionStatus,
      failureReason,
    });

    console.log(
      `[Mutate] Result for ${c.operator}: Verdict=${actualVerdict}, Status=${executionStatus}`,
    );
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 'NOT_APPLICABLE';
  const recall = tp + fn > 0 ? tp / (tp + fn) : 'NOT_APPLICABLE';
  let f1 = 'NOT_APPLICABLE';
  if (typeof precision === 'number' && typeof recall === 'number' && precision + recall > 0) {
    f1 = ((2 * precision * recall) / (precision + recall)).toFixed(2);
  }

  console.log('\n--- Mutation Experiment Results ---');
  console.log(`Total Cases: ${cases.length}`);
  console.log(`Evaluated: ${cases.length - infraFailures}`);
  console.log(`Infrastructure Failures: ${infraFailures}`);
  console.log(`\nMetrics:`);
  console.log(`TP: ${tp}, TN: ${tn}, FP: ${fp}, FN: ${fn}`);
  console.log(`Precision: ${typeof precision === 'number' ? precision.toFixed(2) : precision}`);
  console.log(`Recall: ${typeof recall === 'number' ? recall.toFixed(2) : recall}`);
  console.log(`F1 Score: ${f1}`);
  console.log('\nCase Breakdown:');
  console.table(results);

  if (infraFailures > 0) {
    console.error('Experiment encountered infrastructure failures.');
    process.exit(1);
  }
}

// If invoked directly
if (process.argv[1].endsWith('mutate.js') || process.argv[1].endsWith('mutate.ts')) {
  let root = process.cwd();
  if (root.endsWith('cli')) root = path.resolve(root, '../');
  mutateCommandAction(root).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
