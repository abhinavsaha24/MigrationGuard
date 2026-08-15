import { PostgresSandbox } from '@migrationguard/sandbox';
import { MigrationEngine } from '@migrationguard/migration-engine';
import { ApplicationRunner } from '@migrationguard/application-runner';
import { CompatibilityAnalyzer } from '@migrationguard/compatibility';
import { WorkloadLoader, WorkloadReplayEngine } from '@migrationguard/workload';
import { CompatibilityMatrixEngine } from '@migrationguard/matrix-engine';
import { generateReport, EvidenceRecord } from '@migrationguard/evidence';
import * as path from 'path';
import * as fs from 'fs';
import { VerifyConfig } from './verifyCommand.js';

export async function runVerificationOrchestrator(config: Required<VerifyConfig>): Promise<number> {
  console.log('\nMigrationGuard');
  console.log('────────────────────────────\n');

  console.log(`Migration:\n${path.basename(config.migration)}\n`);
  console.log(`Environment:\nPostgreSQL\nNode.js\nPrisma\n`);

  const sandbox = new PostgresSandbox(`mg-cli-${Date.now()}`);
  const oldRunner = new ApplicationRunner('OLD', config.appDir);
  const newRunner = new ApplicationRunner('NEW', config.appDir);
  const workloadEngine = new WorkloadReplayEngine(5000);

  let workload;
  try {
    workload = WorkloadLoader.load(config.workload);
  } catch (e: any) {
    console.error(`[Configuration Error] Failed to load workload: ${e.message}`);
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
    return 2; // CONFIGURATION_ERROR
  }

  try {
    await sandbox.start();
    const dbUrl = sandbox.getDatabaseUrl();
    const migrationEngine = new MigrationEngine(dbUrl);

    // M1 regression fixture doesn't have an explicit v1 config in standard CLI use cases,
    // but our verifyCommand sets it up nicely. We just pass it through.
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

    console.log('Compatibility Matrix:\n');
    for (const run of matrixResult.runs) {
      const evidence = CompatibilityAnalyzer.analyze(
        run,
        v2MigrationSql,
        path.join(config.migration, 'migration.sql'),
      );
      evidenceList.push(evidence);

      const label = `${evidence.applicationVersion} + ${evidence.databaseVersion}`.padEnd(12, ' ');

      if (evidence.failureCategory === 'NONE') {
        console.log(`${label} PASS`);
      } else if (evidence.failureCategory === 'COMPATIBILITY_FAILURE') {
        console.log(`${label} FAIL`);
        // Ignore forward compatibility failures for NEW APP + V1 DB as they are expected by default
        // But wait, the regression test explicitly asserts NEW + V1 is a FAIL.
        // For general "Verified failure" exit status, we usually only care about OLD + V2 and NEW + V2 and OLD + V1.
        // Actually, NEW + V1 is expected to fail. So it doesn't fail the *verification*.
        // Only OLD + V2 failing means VERIFICATION FAILED (Regression found).
        if (evidence.applicationVersion === 'OLD' && evidence.databaseVersion === 'V2') {
          hasVerifiedCompatibilityFailure = true;
          if (!failingEvidence) failingEvidence = evidence;
        } else if (evidence.applicationVersion === 'NEW' && evidence.databaseVersion === 'V2') {
          hasVerifiedCompatibilityFailure = true;
          if (!failingEvidence) failingEvidence = evidence;
        }
      } else if (evidence.failureCategory === 'MIGRATION_EXECUTION_FAILURE') {
        console.log(`${label} FAIL`);
        hasVerifiedCompatibilityFailure = true;
        if (!failingEvidence) failingEvidence = evidence;
      } else {
        console.log(`${label} FAIL`);
        hasInfraFailure = true;
        if (!failingEvidence) failingEvidence = evidence;
      }
    }

    console.log('');

    if (hasInfraFailure) {
      console.log('Result:\nINFRASTRUCTURE FAILED\n');
      console.log(`Fault:\n${failingEvidence?.failureCategory}\n`);
      exitCode = 3; // INFRASTRUCTURE_FAILURE
    } else if (hasVerifiedCompatibilityFailure) {
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
      exitCode = 1; // VERIFIED_COMPATIBILITY_FAILURE
    } else {
      console.log('Result:\nSUCCESS\n');
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
    console.log(`Reports:\nreports/${runId}.json\nreports/${runId}.md\n`);

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
              headers: { Authorization: `Bearer ${token}` },
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
  } catch (error: any) {
    console.error('\nResult:\nVERIFICATION FAILED (Unexpected Error)\n');
    console.error(error.message);
    exitCode = 4; // UNKNOWN_FAILURE
  } finally {
    // Ensure all resources are cleaned up
    sandbox.stop();
  }

  return exitCode;
}
