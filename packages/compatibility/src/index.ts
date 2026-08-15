import { OperationResult } from '@migrationguard/workload';
import { EvidenceRecord, FailureCategory, FaultType, Confidence } from '@migrationguard/evidence';
import { CompatibilityRun } from '@migrationguard/matrix-engine';

export interface NormalizedObservation {
  failedOperation?: OperationResult;
  httpStatus?: number;
  databaseError?: string;
  isMissingColumn: boolean;
  missingColumnName?: string;
  durationMs: number;
}

export interface ClassifiedFault {
  category: FailureCategory;
  baseFaultType: FaultType;
}

export interface CausalAnalysis {
  faultType: FaultType;
  confidence: Confidence;
  migrationStatement?: string;
  causalChain: string[];
}

export class ObservationNormalizer {
  public static normalize(run: CompatibilityRun): NormalizedObservation {
    const defaultObs: NormalizedObservation = {
      isMissingColumn: false,
      durationMs: run.durationMs,
    };

    if (!run.workloadResult || run.workloadResult.operations.length === 0) {
      return defaultObs;
    }

    const failedOp =
      run.workloadResult.operations.find((op) => !op.success) ||
      run.workloadResult.operations[run.workloadResult.operations.length - 1];

    defaultObs.failedOperation = failedOp;
    defaultObs.httpStatus = failedOp.status;

    if (failedOp.status === 500 && failedOp.response && typeof failedOp.response === 'object') {
      const body = failedOp.response as { isDatabaseError?: boolean; error?: string };
      if (body.isDatabaseError && body.error) {
        defaultObs.databaseError = body.error;
        const colMatch = body.error.match(/column [`"']?(?:\w+\.)?(\w+)[`"']? does not exist/i);
        if (colMatch) {
          defaultObs.isMissingColumn = true;
          defaultObs.missingColumnName = colMatch[1];
        }
      }
    }

    return defaultObs;
  }
}

export class FaultClassifier {
  public static classify(run: CompatibilityRun, obs: NormalizedObservation): ClassifiedFault {
    if (run.status === 'PASS') {
      return { category: 'NONE', baseFaultType: 'NONE' };
    }

    // Map matrix engine infrastructure statuses directly to FailureCategory
    if (run.status === 'APPLICATION_STARTUP_FAILURE')
      return { category: 'APPLICATION_STARTUP_FAILURE', baseFaultType: 'NONE' };
    if (run.status === 'DATABASE_CONNECTION_FAILURE')
      return { category: 'DATABASE_CONNECTION_FAILURE', baseFaultType: 'NONE' };
    if (run.status === 'MIGRATION_FAILURE') {
      const errStr = (run.error || '').toLowerCase();
      if (
        errStr.includes('cannot be cast automatically') ||
        errStr.includes('type') ||
        errStr.includes('narrowing')
      ) {
        return { category: 'MIGRATION_EXECUTION_FAILURE', baseFaultType: 'TYPE_NARROWING' };
      }
      return { category: 'MIGRATION_EXECUTION_FAILURE', baseFaultType: 'DATA_INTEGRITY_FAILURE' };
    }
    if (run.status === 'INFRASTRUCTURE_FAILURE') {
      // Could be timeout
      if (run.error?.toLowerCase().includes('timeout')) {
        return { category: 'TIMEOUT_FAILURE', baseFaultType: 'NONE' };
      }
      return { category: 'INFRASTRUCTURE_FAILURE', baseFaultType: 'NONE' };
    }

    // If it's a workload failure, we must inspect the observation to see if it's a COMPATIBILITY_FAILURE
    if (run.status === 'WORKLOAD_FAILURE') {
      if (obs.isMissingColumn) {
        return { category: 'COMPATIBILITY_FAILURE', baseFaultType: 'COLUMN_REMOVAL' };
      }

      // If we got a 500 but it's not a recognized DB error, it's just a WORKLOAD_FAILURE
      return { category: 'WORKLOAD_FAILURE', baseFaultType: 'NONE' };
    }

    return { category: 'UNKNOWN_FAILURE', baseFaultType: 'NONE' };
  }
}

export class CausalAnalyzer {
  public static analyze(
    run: CompatibilityRun,
    obs: NormalizedObservation,
    classification: ClassifiedFault,
    migrationSql?: string,
  ): CausalAnalysis {
    if (
      classification.category !== 'COMPATIBILITY_FAILURE' ||
      !migrationSql ||
      !obs.missingColumnName
    ) {
      return {
        faultType: classification.baseFaultType,
        confidence: 'UNKNOWN',
        causalChain: [],
      };
    }

    const missingCol = obs.missingColumnName;
    const chain: string[] = [];

    // Analyze SQL for dropped columns and added columns
    const drops = [...migrationSql.matchAll(/DROP\s+COLUMN\s+"?(\w+)"?/gi)].map((m) => m[1]);
    const adds = [...migrationSql.matchAll(/ADD\s+COLUMN\s+"?(\w+)"?/gi)].map((m) => m[1]);

    if (run.applicationVersion === 'NEW' && run.databaseVersion === 'V1') {
      // NEW app on OLD db. Missing column is because the column hasn't been created yet.
      // E.g. V2 adds "full_name", but we are on V1.
      chain.push(`NEW application expects column '${missingCol}'.`);
      chain.push(`Database is still on V1 schema, where '${missingCol}' does not exist yet.`);

      if (adds.includes(missingCol)) {
        chain.push(
          `Migration V2 adds this column, proving the query incompatibility is a known forward-dependency.`,
        );
        return { faultType: 'QUERY_INCOMPATIBILITY', confidence: 'CONFIRMED', causalChain: chain };
      }
      return { faultType: 'QUERY_INCOMPATIBILITY', confidence: 'LIKELY', causalChain: chain };
    }

    if (run.applicationVersion === 'OLD' && run.databaseVersion === 'V2') {
      // OLD app on NEW db. Missing column because it was dropped.
      chain.push(`OLD application queries column '${missingCol}'.`);

      let matchedStatement: string | undefined;
      const dropRegex = new RegExp(
        `ALTER\\s+TABLE\\s+"?\\w+"?\\s+DROP\\s+COLUMN\\s+"?${missingCol}"?[^;]*;`,
        'i',
      );
      const stmtMatch = migrationSql.match(dropRegex);
      if (stmtMatch) {
        matchedStatement = stmtMatch[0].trim();
      }

      if (drops.includes(missingCol)) {
        chain.push(`Migration V2 executed a statement that dropped column '${missingCol}'.`);
        chain.push(`Database rejected the legacy query because the column no longer exists.`);

        if (adds.length > 0) {
          chain.push(
            `Migration V2 also added column(s): ${adds.join(', ')}. This strongly indicates a DESTRUCTIVE_RENAME.`,
          );
          return {
            faultType: 'DESTRUCTIVE_RENAME',
            confidence: 'CONFIRMED',
            migrationStatement: matchedStatement,
            causalChain: chain,
          };
        } else {
          return {
            faultType: 'COLUMN_REMOVAL',
            confidence: 'CONFIRMED',
            migrationStatement: matchedStatement,
            causalChain: chain,
          };
        }
      }

      chain.push(
        `Could not explicitly map '${missingCol}' to a DROP COLUMN statement in the migration.`,
      );
      return { faultType: classification.baseFaultType, confidence: 'LIKELY', causalChain: chain };
    }

    return { faultType: classification.baseFaultType, confidence: 'UNKNOWN', causalChain: chain };
  }
}

export class EvidenceBuilder {
  public static build(
    run: CompatibilityRun,
    obs: NormalizedObservation,
    cls: ClassifiedFault,
    causal: CausalAnalysis,
    migrationFile?: string,
  ): EvidenceRecord {
    return {
      evidenceId: `EVD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      runId: run.runId,
      timestamp: run.startedAt,
      applicationVersion: run.applicationVersion,
      databaseVersion: run.databaseVersion,
      workloadId: run.workloadId,
      operationId: obs.failedOperation
        ? `${obs.failedOperation.method} ${obs.failedOperation.path}`
        : undefined,
      migrationFile,
      migrationStatement: causal.migrationStatement,
      actualResult: obs.failedOperation
        ? (obs.failedOperation as { response?: unknown }).response
        : run.error,
      databaseError: obs.databaseError,
      httpStatus: obs.httpStatus,
      durationMs: run.durationMs,
      failureCategory: cls.category,
      faultType: causal.faultType,
      confidence: causal.confidence,
      causalChain: causal.causalChain,
      reproducibility: {
        nodeVersion: process.version,
        osPlatform: process.platform,
      },
    };
  }
}

export class CompatibilityAnalyzer {
  public static analyze(
    run: CompatibilityRun,
    migrationSql?: string,
    migrationFile?: string,
  ): EvidenceRecord {
    const obs = ObservationNormalizer.normalize(run);
    const cls = FaultClassifier.classify(run, obs);
    const causal = CausalAnalyzer.analyze(run, obs, cls, migrationSql);
    return EvidenceBuilder.build(run, obs, cls, causal, migrationFile);
  }
}
