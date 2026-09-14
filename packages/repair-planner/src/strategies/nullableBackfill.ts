import {
  CompatibilityExplanationContext,
  RepairProposal,
  AffectedObject,
  MigrationPlanPhase,
} from '@migrationguard/core';
import { computeSchemaDiff } from '../diff.js';
import * as crypto from 'crypto';

export function planNullableBackfillRepair(
  context: CompatibilityExplanationContext,
  beforeSchema: string,
  migrationSql: string,
): RepairProposal {
  const addChange = context.migrationChanges.find((c) => c.type === 'ADD_COLUMN');
  const tableName = addChange?.table || 'users';
  const newCol = addChange?.column || 'new_column';

  // In beforeSchema, ensure newCol is declared nullable or with a default
  let proposedSchema = beforeSchema;
  const modelRegex = new RegExp(`model\\s+${tableName}\\s*{([^}]+)}`, 'i');
  const match = beforeSchema.match(modelRegex);

  if (match) {
    const modelBody = match[1];
    const newColRegex = new RegExp(`^(\\s*${newCol}\\s+)(\\w+)(.*)$`, 'm');
    const newColMatch = modelBody.match(newColRegex);

    if (newColMatch && !newColMatch[2].endsWith('?')) {
      const updatedModelBody = modelBody.replace(newColRegex, `$1${newColMatch[2]}?$3`);
      proposedSchema = proposedSchema.replace(modelBody, updatedModelBody);
    } else if (!modelBody.includes(newCol)) {
      const newLine = `\n  ${newCol} String?`;
      proposedSchema = proposedSchema.replace(modelBody, modelBody + newLine);
    }
  }

  const affectedObjects: AffectedObject[] = [
    {
      type: 'COLUMN',
      table: tableName,
      name: newCol,
      action: 'ADD_NULLABLE',
      details: `Make '${newCol}' nullable initially to prevent inserts from legacy application versions from failing constraint checks.`,
    },
  ];

  const migrationPlan: MigrationPlanPhase[] = [
    {
      phase: 1,
      title: 'Add Nullable Column',
      description: `Add column '${newCol}' as NULLABLE (or with DEFAULT) to accommodate legacy application writes.`,
      sqlStatements: [`ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${newCol}" TEXT;`],
      timing: 'PRE_DEPLOYMENT',
      reversibility: 'REVERSIBLE',
    },
    {
      phase: 2,
      title: 'Backfill Default Values',
      description: `Backfill existing rows that have NULL in '${newCol}'.`,
      sqlStatements: [`UPDATE "${tableName}" SET "${newCol}" = '' WHERE "${newCol}" IS NULL;`],
      timing: 'POST_MIGRATION',
      reversibility: 'REVERSIBLE',
    },
    {
      phase: 3,
      title: 'Enforce NOT NULL Constraint (Contract Phase)',
      description: `Apply NOT NULL constraint after old application versions omitting '${newCol}' have drained.`,
      sqlStatements: [`ALTER TABLE "${tableName}" ALTER COLUMN "${newCol}" SET NOT NULL;`],
      timing: 'POST_LEGACY_DRAIN',
      reversibility: 'REVERSIBLE',
    },
  ];

  const schemaDiff = computeSchemaDiff(beforeSchema, proposedSchema);

  const hash = (s: string) => crypto.createHash('sha256').update(s, 'utf-8').digest('hex');
  const sourceSchemaHash = hash(beforeSchema);
  const sourceMigrationHash = hash(migrationSql);
  const proposalId = `PRP-${hash(sourceSchemaHash + sourceMigrationHash + 'NULLABLE_WITH_BACKFILL').substring(0, 16)}`;

  return {
    proposalId,
    verificationId: context.verificationId,
    createdAt: new Date().toISOString(),
    sourceSchemaHash,
    sourceMigrationHash,
    faultCategory: context.faultCategory,
    compatibilityState: context.failedStates[0] || 'OLD_APP_V2_DB',
    strategy: 'NULLABLE_WITH_BACKFILL',
    affectedObjects,
    requiredChanges: [
      `Add field '${newCol}' as optional in model '${tableName}'`,
      `Backfill non-null default values for existing rows`,
      `Defer NOT NULL constraint until all legacy application pods drain`,
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
      'Application logic must tolerate null values during transition window if no default is specified',
    ],
    assumptions: ['A safe default or backfill value exists for all existing rows'],
    warnings: [
      'Do not set NOT NULL before older application versions stop issuing inserts without this field.',
    ],
    status: 'VALIDATED',
  };
}
