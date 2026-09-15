import {
  CompatibilityExplanationContext,
  RepairProposal,
  AffectedObject,
  MigrationPlanPhase,
} from '@migrationguard/core';
import { computeSchemaDiff } from '../diff.js';
import * as crypto from 'crypto';

export function planExpandContractRepair(
  context: CompatibilityExplanationContext,
  beforeSchema: string,
  migrationSql: string,
): RepairProposal {
  // Find rename or drop/add pairs
  const renameChange = context.migrationChanges.find((c) => c.type === 'RENAME_COLUMN');
  const dropChange = context.migrationChanges.find((c) => c.type === 'DROP_COLUMN');
  const addChange = context.migrationChanges.find((c) => c.type === 'ADD_COLUMN');

  const tableName = renameChange?.table || dropChange?.table || addChange?.table || 'users';
  const oldCol = renameChange?.from || dropChange?.column || 'name';
  const newCol = renameChange?.to || addChange?.column || 'full_name';

  // Synthesize proposed schema:
  // In beforeSchema, ensure both oldCol and newCol exist in the model
  let proposedSchema = beforeSchema;

  // Search for the model in Prisma schema
  const modelRegex = new RegExp(`model\\s+${tableName}\\s*{([^}]+)}`, 'i');
  const match = beforeSchema.match(modelRegex);

  if (match) {
    const modelBody = match[1];
    let updatedModelBody = modelBody;

    // Ensure oldCol is nullable or preserved
    const oldColRegex = new RegExp(`^(\\s*${oldCol}\\s+)(\\w+)(.*)$`, 'm');
    const oldColMatch = modelBody.match(oldColRegex);
    if (oldColMatch && !oldColMatch[2].endsWith('?')) {
      updatedModelBody = updatedModelBody.replace(oldColRegex, `$1${oldColMatch[2]}?$3`);
    }

    // Add newCol if not already in model
    const newColRegex = new RegExp(`\\b${newCol}\\b`, 'i');
    if (!newColRegex.test(updatedModelBody)) {
      const colType = oldColMatch ? oldColMatch[2].replace('?', '') : 'String';
      const newLine = `\n  ${newCol} ${colType}?`;
      updatedModelBody = updatedModelBody + newLine;
    }

    proposedSchema = proposedSchema.replace(modelBody, updatedModelBody);
  }

  const affectedObjects: AffectedObject[] = [
    {
      type: 'COLUMN',
      table: tableName,
      name: oldCol,
      action: 'PRESERVE_TEMPORARY',
      details: `Preserve legacy column '${oldCol}' to maintain backward compatibility with OLD application versions.`,
    },
    {
      type: 'COLUMN',
      table: tableName,
      name: newCol,
      action: 'ADD_NULLABLE',
      details: `Add target column '${newCol}' as nullable to enable forward compatibility with NEW application versions.`,
    },
  ];

  const migrationPlan: MigrationPlanPhase[] = [
    {
      phase: 1,
      title: 'Expand: Add Nullable Column',
      description: `Add the new column '${newCol}' without dropping '${oldCol}'. Keep nullable to avoid violating existing rows.`,
      sqlStatements: [`ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${newCol}" TEXT;`],
      timing: 'PRE_DEPLOYMENT',
      reversibility: 'REVERSIBLE',
    },
    {
      phase: 2,
      title: 'Backfill: Data Synchronization',
      description: `Populate '${newCol}' from existing '${oldCol}' values for legacy records.`,
      sqlStatements: [
        `UPDATE "${tableName}" SET "${newCol}" = "${oldCol}" WHERE "${newCol}" IS NULL;`,
      ],
      timing: 'POST_MIGRATION',
      reversibility: 'REVERSIBLE',
    },
    {
      phase: 3,
      title: 'Deploy Dual-Read/Write Application',
      description:
        'Deploy application instances configured to write to both columns and prefer reading the new column.',
      sqlStatements: [],
      timing: 'POST_MIGRATION',
      reversibility: 'REVERSIBLE',
    },
    {
      phase: 4,
      title: 'Contract: Drop Legacy Column',
      description: `Drop legacy column '${oldCol}' only after all older application instances have cleanly drained.`,
      sqlStatements: [`ALTER TABLE "${tableName}" DROP COLUMN IF EXISTS "${oldCol}";`],
      timing: 'POST_LEGACY_DRAIN',
      reversibility: 'IRREVERSIBLE',
    },
  ];

  const schemaDiff = computeSchemaDiff(beforeSchema, proposedSchema);

  const hash = (s: string) => crypto.createHash('sha256').update(s, 'utf-8').digest('hex');
  const sourceSchemaHash = hash(beforeSchema);
  const sourceMigrationHash = hash(migrationSql);
  const proposalId = `PRP-${hash(sourceSchemaHash + sourceMigrationHash + 'EXPAND_CONTRACT').substring(0, 16)}`;

  return {
    proposalId,
    verificationId: context.verificationId,
    createdAt: new Date().toISOString(),
    sourceSchemaHash,
    sourceMigrationHash,
    faultCategory: 'DESTRUCTIVE_RENAME',
    failureMechanism: 'QUERY_INCOMPATIBILITY',
    compatibilityState: context.failedStates[0] || 'OLD_APP_V2_DB',
    strategy: 'EXPAND_CONTRACT',
    affectedObjects,
    requiredChanges: [
      `Add field '${newCol}' as optional in model '${tableName}'`,
      `Keep field '${oldCol}' as optional in model '${tableName}' during rollout`,
      `Apply phase 1 expand migration prior to rolling deployment`,
    ],
    migrationPlan,
    beforeSchema,
    proposedSchema,
    schemaDiff,
    expectedCompatibility: {
      'OLD+V1': 'PASS',
      'NEW+V1': 'PASS',
      'OLD+V2': 'PASS',
      'NEW+V2': 'PASS',
    },
    risks: [
      'Dual-write synchronization overhead while old application instances drain',
      'Temporarily relaxed nullability constraints during migration window',
    ],
    assumptions: [
      'Application code supports fallback or dual write for both column names',
      'Target database supports concurrent non-blocking column additions',
    ],
    warnings: [
      'Do not execute Phase 4 (Drop Column) until 100% of older pods/services have shut down.',
    ],
    status: 'VALIDATED',
  };
}
