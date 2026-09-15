import { PostgresSandbox } from '@migrationguard/sandbox';
import { MigrationEngine } from '@migrationguard/migration-engine';
import { ApplicationRunner } from '@migrationguard/application-runner';
import { CompatibilityAnalyzer } from '@migrationguard/compatibility';
import { WorkloadLoader, WorkloadReplayEngine } from '@migrationguard/workload';
import { CompatibilityMatrixEngine } from '@migrationguard/matrix-engine';
import { generateReport, EvidenceRecord } from '@migrationguard/evidence';
import { EvidenceBuilder } from '@migrationguard/compatibility';
import * as path from 'path';
import * as fs from 'fs';
import { VerifyConfig } from './verifyCommand.js';

export async function runVerificationOrchestrator(config: Required<VerifyConfig>): Promise<number> {
  const originalLog = console.log;
  const isJson = Boolean(config.json);
  if (isJson) {
    console.log = (...args: any[]) => {
      process.stderr.write(args.map(String).join(' ') + '\n');
    };
  }

  if (!isJson) {
    console.log('\nMigrationGuard');
    console.log('────────────────────────────\n');

    console.log(`Migration:\n${path.basename(config.migration)}\n`);
    console.log(`Environment:\nPostgreSQL\nNode.js\nPrisma\n`);
  }

  const sandbox = new PostgresSandbox(`mg-cli-${Date.now()}`);
  const oldRunner = new ApplicationRunner('OLD', config.appDir);
  const newRunner = new ApplicationRunner('NEW', config.appDir);
  const workloadEngine = new WorkloadReplayEngine(5000);

  let workload;
  try {
    workload = WorkloadLoader.load(config.workload);
  } catch (e: any) {
    console.error(`[Configuration Error] Failed to load workload: ${e.message}`);
    if (config.json) {
      console.log = originalLog;
      process.stdout.write(
        JSON.stringify(
          {
            exitCode: 2,
            result: 'CONFIGURATION ERROR',
            error: `Failed to load workload: ${e.message}`,
          },
          null,
          2,
        ) + '\n',
      );
    }
    return 2; // CONFIGURATION_ERROR
  }

  const runId = `MG-VERIFY-${Date.now()}`;
  let exitCode = 4; // UNKNOWN_FAILURE by default

  let v2MigrationSql = '';
  try {
    const sqlPath = path.join(config.migration, 'migration.sql');
    if (fs.existsSync(sqlPath)) {
      v2MigrationSql = fs.readFileSync(sqlPath, 'utf-8');
    }
  } catch (e: any) {
    console.error(`[Configuration Error] Failed to read migration.sql: ${e.message}`);
    if (config.json) {
      console.log = originalLog;
      process.stdout.write(
        JSON.stringify(
          {
            exitCode: 2,
            result: 'CONFIGURATION ERROR',
            error: `Failed to read migration.sql: ${e.message}`,
          },
          null,
          2,
        ) + '\n',
      );
    }
    return 2; // CONFIGURATION_ERROR
  }

  let schemaV1 = '';
  let schemaV2 = '';
  let workloadJson = '';
  try {
    if (config.baseMigration && fs.existsSync(path.join(config.baseMigration, 'schema.prisma'))) {
      schemaV1 = fs.readFileSync(path.join(config.baseMigration, 'schema.prisma'), 'utf-8');
    } else if (config.schema && fs.existsSync(config.schema)) {
      schemaV1 = fs.readFileSync(config.schema, 'utf-8');
    }
    if (config.schema && fs.existsSync(config.schema)) {
      schemaV2 = fs.readFileSync(config.schema, 'utf-8');
    }
    if (config.workload && fs.existsSync(config.workload)) {
      workloadJson = fs.readFileSync(config.workload, 'utf-8');
    }
  } catch (e) {
    // Ignore read errors for hashing
  }

  const inputHashes = EvidenceBuilder.buildInputHashes({
    schemaV1: schemaV1 || undefined,
    schemaV2: schemaV2 || undefined,
    migrationSql: v2MigrationSql || undefined,
    workloadJson: workloadJson || undefined,
  });

  try {
    await sandbox.start();
    const dbUrl = sandbox.getDatabaseUrl();
    const migrationEngine = new MigrationEngine(dbUrl);

    const matrixEngine = new CompatibilityMatrixEngine({
      sandbox,
      migrationEngine,
      oldRunner,
      newRunner,
      workloadEngine,
      workload,
      schemaPath: config.schema,
      v1MigrationDir: config.baseMigration || '',
      v1MigrationName: config.baseMigration ? path.basename(config.baseMigration) : '',
      v2MigrationDir: config.migration,
      v2MigrationName: path.basename(config.migration),
    });

    const matrixResult = await matrixEngine.executeMatrix(runId);

    const evidenceList: EvidenceRecord[] = [];
    let hasVerifiedCompatibilityFailure = false;
    let hasInfraFailure = false;
    let failingEvidence: EvidenceRecord | null = null;

    if (!config.json) {
      console.log('Compatibility Matrix:\n');
    }
    for (const run of matrixResult.runs) {
      const evidence = CompatibilityAnalyzer.analyze(
        run,
        v2MigrationSql,
        path.join(config.migration, 'migration.sql'),
        matrixResult,
        inputHashes,
      );
      evidenceList.push(evidence);

      const label = `${evidence.applicationVersion} + ${evidence.databaseVersion}`.padEnd(12, ' ');

      if (evidence.failureCategory === 'NONE') {
        if (!config.json) console.log(`${label} PASS`);
      } else if (evidence.failureCategory === 'COMPATIBILITY_FAILURE') {
        if (!config.json) console.log(`${label} FAIL`);
        if (evidence.applicationVersion === 'OLD' && evidence.databaseVersion === 'V2') {
          hasVerifiedCompatibilityFailure = true;
          if (!failingEvidence) failingEvidence = evidence;
        } else if (evidence.applicationVersion === 'NEW' && evidence.databaseVersion === 'V2') {
          hasVerifiedCompatibilityFailure = true;
          if (!failingEvidence) failingEvidence = evidence;
        }
      } else if (evidence.failureCategory === 'MIGRATION_EXECUTION_FAILURE') {
        if (!config.json) console.log(`${label} FAIL`);
        hasVerifiedCompatibilityFailure = true;
        if (!failingEvidence) failingEvidence = evidence;
      } else {
        if (!config.json) console.log(`${label} FAIL`);
        hasInfraFailure = true;
        if (!failingEvidence) failingEvidence = evidence;
      }
    }

    if (!config.json) {
      console.log('');
    }

    if (hasInfraFailure) {
      if (!config.json) {
        console.log('Result:\nINFRASTRUCTURE FAILED\n');
        console.log(`Fault:\n${failingEvidence?.failureCategory}\n`);
      }
      exitCode = 3; // INFRASTRUCTURE_FAILURE
    } else if (hasVerifiedCompatibilityFailure) {
      if (!config.json) {
        console.log('Result:\nVERIFICATION FAILED\n');
        console.log(`Fault:\n${failingEvidence?.faultType}\n`);
        console.log(`Confidence:\n${failingEvidence?.confidence}\n`);
        if (failingEvidence?.operationId) {
          console.log(`Evidence:\n${failingEvidence.operationId}\n`);
        }
        if (failingEvidence?.databaseError || failingEvidence?.actualResult) {
          let obs = failingEvidence.databaseError;
          if (!obs && failingEvidence.actualResult) {
            obs = JSON.stringify(failingEvidence.actualResult);
          }
          console.log(`Observed:\n${obs}\n`);
        }
      }
      exitCode = 1; // VERIFIED_COMPATIBILITY_FAILURE
    } else {
      if (!config.json) {
        console.log('Result:\nSUCCESS\n');
      }
      exitCode = 0; // SUCCESS
    }

    // Reports
    let reportsDir = process.cwd();
    if (reportsDir.endsWith('cli')) {
      reportsDir = path.resolve(reportsDir, '../');
    }
    reportsDir = path.join(reportsDir, 'reports');

    generateReport(evidenceList, reportsDir);

    const jsonReportPath = path.join(reportsDir, `${runId}.json`);
    const mdReportPath = path.join(reportsDir, `${runId}.md`);
    if (!config.json) {
      console.log(`Reports:\nreports/${runId}.json\nreports/${runId}.md\n`);
    }

    if (config.upload) {
      const token = process.env.MG_API_TOKEN;
      const apiBase = (process.env.MG_API_URL || 'http://localhost').replace(/\/$/, '');
      if (!token) {
        console.warn('\n[Warning] --upload specified but MG_API_TOKEN is not set. Upload skipped.');
      } else {
        try {
          const apiStatus = exitCode === 0 ? 'PASS' : 'FAIL';
          let artifactKey: string | undefined;
          let artifactHash: string | undefined;

          // Upload JSON artifact first
          if (fs.existsSync(jsonReportPath)) {
            const fileBuffer = fs.readFileSync(jsonReportPath);
            const blob = new Blob([fileBuffer], { type: 'application/json' });
            const form = new FormData();
            form.set('file', blob, 'reports.json');

            const artRes = await fetch(`${apiBase}/api/runs/artifact`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'User-Agent': 'curl/8.21.0',
              },
              body: form,
            });

            if (artRes.ok) {
              const artData = await artRes.json();
              artifactKey = artData.artifactKey;
              artifactHash = artData.artifactHash;
            } else {
              console.warn(`[Warning] Failed to upload artifact: ${artRes.status}`);
            }
          }

          const payload = {
            runId,
            migrationName: path.basename(config.migration),
            status: apiStatus,
            durationMs: 0,
            artifactKey,
            artifactHash,
            compatibility: evidenceList.map((e) => ({
              appVersion: e.applicationVersion,
              dbVersion: e.databaseVersion,
              status: e.failureCategory === 'NONE' ? 'PASS' : 'FAIL',
              durationMs: 0,
              error: e.faultType !== 'NONE' ? e.faultType : undefined,
            })),
            evidence: evidenceList
              .filter((e) => e.faultType !== 'NONE')
              .map((e) => ({
                faultType: e.faultType,
                confidence: e.confidence,
                operation: e.operationId || 'N/A',
                observedError: e.databaseError || JSON.stringify(e.actualResult) || 'Unknown Error',
              })),
          };

          const response = await fetch(`${apiBase}/api/runs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              'User-Agent': 'curl/8.21.0',
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errBody = await response.text();
            console.error('\nREMOTE PERSISTENCE FAILED');
            console.error(`API Error: ${response.status} - ${errBody}`);
          } else {
            console.log('\nVERIFICATION SUCCESSFUL (Results uploaded to backend)');
          }
        } catch (uploadError: any) {
          console.error('\nREMOTE PERSISTENCE FAILED');
          console.error(`Upload error: ${uploadError.message}`);
        }
      }
    }

    if (config.json) {
      console.log = originalLog;
      const structuredOutput = {
        runId,
        exitCode,
        result: hasInfraFailure
          ? 'INFRASTRUCTURE FAILED'
          : hasVerifiedCompatibilityFailure
            ? 'VERIFICATION FAILED'
            : 'SUCCESS',
        fault: failingEvidence?.faultType || 'NONE',
        confidence: failingEvidence?.confidence || 'UNKNOWN',
        matrix: {
          OLD_V1:
            evidenceList.find((e) => e.applicationVersion === 'OLD' && e.databaseVersion === 'V1')
              ?.failureCategory === 'NONE'
              ? 'PASS'
              : 'FAIL',
          NEW_V1:
            evidenceList.find((e) => e.applicationVersion === 'NEW' && e.databaseVersion === 'V1')
              ?.failureCategory === 'NONE'
              ? 'PASS'
              : 'FAIL',
          OLD_V2:
            evidenceList.find((e) => e.applicationVersion === 'OLD' && e.databaseVersion === 'V2')
              ?.failureCategory === 'NONE'
              ? 'PASS'
              : 'FAIL',
          NEW_V2:
            evidenceList.find((e) => e.applicationVersion === 'NEW' && e.databaseVersion === 'V2')
              ?.failureCategory === 'NONE'
              ? 'PASS'
              : 'FAIL',
        },
        states: evidenceList.map((e) => ({
          applicationVersion: e.applicationVersion,
          databaseVersion: e.databaseVersion,
          status: e.failureCategory === 'NONE' ? 'PASS' : 'FAIL',
          failureCategory: e.failureCategory,
          faultType: e.faultType,
          confidence: e.confidence,
          operationId: e.operationId,
          observedError:
            e.databaseError || (e.actualResult ? JSON.stringify(e.actualResult) : undefined),
        })),
        evidence: evidenceList,
        reports: {
          json: path.relative(process.cwd(), jsonReportPath).replace(/\\/g, '/'),
          markdown: path.relative(process.cwd(), mdReportPath).replace(/\\/g, '/'),
        },
      };
      process.stdout.write(JSON.stringify(structuredOutput, null, 2) + '\n');
    }
  } catch (error: any) {
    exitCode = 4; // UNKNOWN_FAILURE
    if (config.json) {
      console.log = originalLog;
      process.stdout.write(
        JSON.stringify(
          {
            runId,
            exitCode: 4,
            result: 'VERIFICATION FAILED (Unexpected Error)',
            error: error.message || String(error),
          },
          null,
          2,
        ) + '\n',
      );
    } else {
      console.error('\nResult:\nVERIFICATION FAILED (Unexpected Error)\n');
      console.error(error.message);
    }
  } finally {
    console.log = originalLog;
    sandbox.stop();
  }

  return exitCode;
}
