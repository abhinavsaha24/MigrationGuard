import {
  CompatibilityExplanationContext,
  RepairProposal,
  RepairStrategy,
} from '@migrationguard/core';
import { planExpandContractRepair } from './strategies/expandContract.js';
import { planNullableBackfillRepair } from './strategies/nullableBackfill.js';
import { computeSchemaDiff } from './diff.js';
import * as crypto from 'crypto';

export { computeSchemaDiff } from './diff.js';
export { planExpandContractRepair } from './strategies/expandContract.js';
export { planNullableBackfillRepair } from './strategies/nullableBackfill.js';

export class RepairPlanner {
  public static plan(
    context: CompatibilityExplanationContext,
    beforeSchema: string,
    migrationSql: string,
  ): RepairProposal {
    const primaryFault = context.evidence[0]?.faultType || context.faultCategory;

    if (
      primaryFault === 'DESTRUCTIVE_RENAME' ||
      context.migrationChanges.some((c) => c.type === 'RENAME_COLUMN') ||
      context.observations.some((o) => o.databaseError?.includes('does not exist'))
    ) {
      return planExpandContractRepair(context, beforeSchema, migrationSql);
    }

    if (
      primaryFault === 'NOT_NULL_INCOMPATIBILITY' ||
      primaryFault === 'ADD_REQUIRED_COLUMN' ||
      primaryFault === 'MAKE_NON_NULL'
    ) {
      return planNullableBackfillRepair(context, beforeSchema, migrationSql);
    }

    // Default safe fallback if already safe or unknown
    const hash = (s: string) => crypto.createHash('sha256').update(s, 'utf-8').digest('hex');
    const sourceSchemaHash = hash(beforeSchema);
    const sourceMigrationHash = hash(migrationSql);
    const proposalId = `PRP-${hash(sourceSchemaHash + sourceMigrationHash + 'NONE').substring(0, 16)}`;

    return {
      proposalId,
      verificationId: context.verificationId,
      createdAt: new Date().toISOString(),
      sourceSchemaHash,
      sourceMigrationHash,
      faultCategory: context.faultCategory,
      compatibilityState: context.failedStates[0] || 'NONE',
      strategy: 'NONE',
      affectedObjects: [],
      requiredChanges: ['No compatibility repair required for this migration.'],
      migrationPlan: [],
      beforeSchema,
      proposedSchema: beforeSchema,
      schemaDiff: computeSchemaDiff(beforeSchema, beforeSchema),
      expectedCompatibility: {
        'OLD+V1': 'PASS',
        'NEW+V1': 'PASS',
        'OLD+V2': 'PASS',
        'NEW+V2': 'PASS',
      },
      risks: [],
      assumptions: [],
      warnings: [],
      status: 'VALIDATED',
    };
  }

  public static validateStaleness(proposal: RepairProposal, currentSchema: string): boolean {
    const currentHash = crypto.createHash('sha256').update(currentSchema, 'utf-8').digest('hex');
    return currentHash === proposal.sourceSchemaHash;
  }
}
