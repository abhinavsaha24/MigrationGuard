import * as fs from 'fs';
import * as path from 'path';

export type AppVersion = 'OLD' | 'NEW';
export type DbVersion = 'V1' | 'V2';

export type FailureCategory =
  | 'NONE'
  | 'COMPATIBILITY_FAILURE'
  | 'INFRASTRUCTURE_FAILURE'
  | 'APPLICATION_STARTUP_FAILURE'
  | 'DATABASE_CONNECTION_FAILURE'
  | 'MIGRATION_EXECUTION_FAILURE'
  | 'WORKLOAD_FAILURE'
  | 'TIMEOUT_FAILURE'
  | 'UNKNOWN_FAILURE';

export type FaultType =
  | 'NONE'
  | 'COLUMN_REMOVAL'
  | 'DESTRUCTIVE_RENAME'
  | 'TYPE_NARROWING'
  | 'NOT_NULL_INCOMPATIBILITY'
  | 'FOREIGN_KEY_INCOMPATIBILITY'
  | 'ENUM_INCOMPATIBILITY'
  | 'QUERY_INCOMPATIBILITY'
  | 'MIXED_VERSION_WRITE_INCOMPATIBILITY'
  | 'UNSAFE_BACKFILL'
  | 'INDEX_LOCK_RISK'
  | 'TABLE_REWRITE_RISK'
  | 'DATA_INTEGRITY_FAILURE';

export type Confidence = 'CONFIRMED' | 'LIKELY' | 'UNKNOWN';

export interface EvidenceRecord {
  evidenceId: string;
  runId: string;
  timestamp: string;
  applicationVersion: AppVersion;
  databaseVersion: DbVersion;
  workloadId: string;
  operationId?: string;
  migrationId?: string;
  migrationFile?: string;
  migrationStatement?: string;
  expectedResult?: unknown;
  actualResult?: unknown;
  databaseError?: string;
  httpStatus?: number;
  durationMs: number;
  failureCategory: FailureCategory;
  faultType: FaultType;
  confidence: Confidence;
  causalChain?: string[];
  reproducibility: {
    nodeVersion: string;
    osPlatform: string;
  };
}

export function generateReport(evidenceList: EvidenceRecord[], reportsDir: string): void {
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const runId = evidenceList[0]?.runId || `MG-M1-${Date.now()}`;

  // JSON Report
  const jsonPath = path.join(reportsDir, `${runId}.json`);
  fs.writeFileSync(
    jsonPath,
    JSON.stringify({ schemaVersion: '1.0', runId, evidence: evidenceList }, null, 2),
    'utf-8',
  );

  // Markdown Report
  let md = `# MigrationGuard Verification Report\n\nRun ID: ${runId}\n\n`;

  let overallStatus = 'PASS';
  if (evidenceList.some((e) => e.failureCategory === 'COMPATIBILITY_FAILURE')) {
    overallStatus = 'FAILED (Compatibility regressions found)';
  } else if (evidenceList.some((e) => e.failureCategory !== 'NONE')) {
    overallStatus = 'ERROR (Infrastructure or execution failure)';
  }

  md += `**Overall Status:** ${overallStatus}\n\n---\n\n`;

  for (const evidence of evidenceList) {
    md += `## State: ${evidence.applicationVersion} APP + ${evidence.databaseVersion} DB\n\n`;
    md += `- **Failure Category:** ${evidence.failureCategory}\n`;
    md += `- **Fault Type:** ${evidence.faultType}\n`;
    md += `- **Confidence:** ${evidence.confidence}\n`;
    md += `- **Operation:** ${evidence.operationId || 'UNKNOWN'}\n`;
    md += `- **Duration:** ${evidence.durationMs}ms\n\n`;

    if (evidence.failureCategory !== 'NONE') {
      md += `### Failure Evidence\n`;
      if (evidence.databaseError) {
        md += `**Observed Error:**\n\`\`\`text\n${evidence.databaseError}\n\`\`\`\n\n`;
      }
      if (evidence.migrationStatement && evidence.migrationStatement !== 'UNKNOWN') {
        md += `**Migration Statement:**\n\`\`\`sql\n${evidence.migrationStatement}\n\`\`\`\n\n`;
      }
      if (evidence.causalChain && evidence.causalChain.length > 0) {
        md += `**Causal Chain:**\n`;
        evidence.causalChain.forEach((step, index) => {
          md += `${index + 1}. ${step}\n`;
        });
        md += `\n`;
      }
      if (evidence.actualResult) {
        md += `**Actual Response:**\n\`\`\`json\n${JSON.stringify(evidence.actualResult, null, 2)}\n\`\`\`\n\n`;
      }
    }
  }

  const mdPath = path.join(reportsDir, `${runId}.md`);
  fs.writeFileSync(mdPath, md, 'utf-8');
}
