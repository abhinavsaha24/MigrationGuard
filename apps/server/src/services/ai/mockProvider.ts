import { CompatibilityExplanationContext, RepairProposal } from '@migrationguard/core';
import {
  AIProvider,
  AIExplanationResult,
  AIDocAnswerResult,
  AssistantDocChunk,
} from './aiProvider.js';

export class MockProvider implements AIProvider {
  public readonly name = 'MockProvider';

  public async explainFailure(
    context: CompatibilityExplanationContext,
  ): Promise<AIExplanationResult> {
    const primaryEvidence = context.evidence[0];
    const faultType = primaryEvidence?.faultType || context.faultCategory;
    const failedStates = context.failedStates.join(', ') || 'OLD_APP_V2_DB';

    const observations = context.observations
      .filter((o) => o.result !== 'PASS')
      .map((o) => ({
        text: `State [${o.state}] failed during operation [${o.operation || 'N/A'}]: ${o.databaseError || 'Incompatibility observed'}`,
        evidenceId: primaryEvidence?.id,
      }));

    if (observations.length === 0 && primaryEvidence) {
      observations.push({
        text: `Deterministic fault [${faultType}] detected with confidence [${primaryEvidence.confidence}].`,
        evidenceId: primaryEvidence.id,
      });
    }

    let explanation = '';
    let remediationText = '';
    let strategy = 'NONE';
    const docs = [{ title: 'Overview of Compatibility Matrix', topic: 'compatibility-matrix' }];

    if (faultType === 'DESTRUCTIVE_RENAME') {
      explanation =
        `MigrationGuard observed a compatibility failure caused by a destructive column rename. ` +
        `The migration altered a column that active application instances still reference. ` +
        `During rolling deployments, older pods running the previous application version fail immediately when querying the renamed column.`;
      remediationText =
        `Adopt an Expand/Contract rolling migration pattern: (1) Add the target column as nullable, ` +
        `(2) Deploy application code capable of dual-writing to both columns, (3) Backfill legacy records, ` +
        `and (4) Drop the old column in a subsequent release after all older pods have cleanly drained.`;
      strategy = 'EXPAND_CONTRACT';
      docs.push({
        title: 'Zero-Downtime Column Renames (Expand/Contract)',
        topic: 'destructive-rename',
      });
    } else if (faultType === 'NOT_NULL_INCOMPATIBILITY' || faultType === 'ADD_REQUIRED_COLUMN') {
      explanation =
        `MigrationGuard detected a NOT NULL constraint addition without a default value. ` +
        `Legacy application versions that do not supply this column will fail during insert or update operations.`;
      remediationText =
        `Add the column as nullable initially, backfill default values for existing records, ` +
        `and enforce the NOT NULL constraint in a follow-up deployment once all application instances populate the field.`;
      strategy = 'NULLABLE_WITH_BACKFILL';
      docs.push({ title: 'Safe NOT NULL Additions', topic: 'not-null-addition' });
    } else {
      explanation =
        `MigrationGuard detected compatibility regressions in states [${failedStates}] with classified fault [${faultType}]. ` +
        `Queries issued by application instances do not align with the updated database schema.`;
      remediationText = `Review the failing operations and verify schema migration ordering.`;
      strategy = 'NONE';
    }

    return {
      intent: 'explain_verification',
      observations,
      explanation,
      remediation: {
        available: strategy !== 'NONE',
        text: remediationText,
        isSuggestion: true,
        strategy,
      },
      documentation: docs,
    };
  }

  public async explainCell(
    cellState: string,
    context: CompatibilityExplanationContext,
  ): Promise<AIExplanationResult> {
    const obs = context.observations.find((o) => o.state === cellState);
    const evidence = context.evidence[0];

    let explanation = `Matrix cell [${cellState}] represents the interaction between application version and database schema version. `;
    if (cellState.includes('OLD_APP') && cellState.includes('V2_DB')) {
      explanation += `In this quadrant, older application pods interact with the newly upgraded database schema. Failures here indicate backward incompatibility: the migration altered or removed structures that legacy running pods still rely on.`;
    } else if (cellState.includes('NEW_APP') && cellState.includes('V1_DB')) {
      explanation += `In this quadrant, newer application pods interact with the pre-migration database schema. Failures here indicate forward incompatibility: the new application expects columns or tables that do not yet exist.`;
    } else {
      explanation += `The operation resulted in status [${obs?.result || 'UNKNOWN'}].`;
    }

    return {
      intent: 'explain_cell',
      observations: [
        {
          text: obs?.databaseError || `Status: ${obs?.result || 'FAIL'}`,
          evidenceId: evidence?.id,
        },
      ],
      explanation,
      remediation: {
        available: true,
        text: `Ensure the rollout sequence accommodates both application versions concurrently.`,
        isSuggestion: true,
      },
      documentation: [{ title: 'The 4-Cell Compatibility Matrix', topic: 'compatibility-matrix' }],
    };
  }

  public async answerDocumentation(
    query: string,
    docs: AssistantDocChunk[],
  ): Promise<AIDocAnswerResult> {
    const lowerQuery = query.toLowerCase();
    const matchedDocs = docs.filter(
      (d) =>
        d.title.toLowerCase().includes(lowerQuery) ||
        d.topic.toLowerCase().includes(lowerQuery) ||
        d.content.toLowerCase().includes(lowerQuery),
    );

    const relevant = matchedDocs.length > 0 ? matchedDocs : docs.slice(0, 2);

    let answer = `Here is the relevant information from MigrationGuard documentation:\n\n`;
    for (const doc of relevant) {
      answer += `### ${doc.title}\n${doc.content.substring(0, 300)}...\n\n`;
    }

    return {
      answer: answer.trim(),
      citations: relevant.map((d) => ({ title: d.title, topic: d.topic })),
      suggestedQueries: [
        'How does the 4-cell compatibility matrix work?',
        'What is an expand/contract migration?',
        'How do I run migrationguard verify via CLI?',
      ],
    };
  }

  public async explainRepair(proposal: RepairProposal): Promise<string> {
    return (
      `### Deterministic Repair Strategy: ${proposal.strategy}\n\n` +
      `MigrationGuard generated a compatibility-preserving repair plan for verification [${proposal.verificationId}].\n\n` +
      `**Problem**: A direct destructive modification causes active application pods to fail when querying legacy columns.\n` +
      `**Solution**: Apply non-breaking additions first (Phase 1 Expand), backfill data (Phase 2), and defer breaking drops until all legacy pods have cleanly terminated (Phase 4 Contract).\n\n` +
      `**Expected Result**: All 4 states in the compatibility matrix are projected to PASS once this repair is applied.`
    );
  }
}
