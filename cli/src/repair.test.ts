import { describe, it, expect } from 'vitest';
import { RepairPlanner } from '@migrationguard/repair-planner';
import { CompatibilityExplanationContext } from '@migrationguard/core';

describe('CLI Guided Repair Module', () => {
  const schema = `
datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")
}

model users {
  id Int @id @default(autoincrement())
  name String
}
`;

  const migration = `ALTER TABLE "users" RENAME COLUMN "name" TO "full_name";`;

  const context: CompatibilityExplanationContext = {
    verificationId: 'MG-CLI-REPAIR-TEST',
    verdict: 'FAIL',
    faultCategory: 'COMPATIBILITY_FAILURE',
    confidence: 'CONFIRMED',
    failedStates: ['OLD_APP_V2_DB'],
    migrationChanges: [{ type: 'RENAME_COLUMN', table: 'users', from: 'name', to: 'full_name' }],
    observations: [
      {
        state: 'OLD_APP_V2_DB',
        operation: 'GET /users/1',
        databaseError: 'The column `users.name` does not exist in the current database.',
      },
    ],
    evidence: [
      {
        id: 'EVD-CLI-01',
        faultType: 'DESTRUCTIVE_RENAME',
        confidence: 'CONFIRMED',
        observedError: 'The column `users.name` does not exist in the current database.',
      },
    ],
  };

  it('synthesizes non-breaking expand-contract proposal with diff', () => {
    const proposal = RepairPlanner.plan(context, schema, migration);

    expect(proposal.strategy).toBe('EXPAND_CONTRACT');
    expect(proposal.affectedObjects.some((o) => o.name === 'full_name')).toBe(true);
    expect(
      proposal.schemaDiff.some((d) => d.type === 'ADD' && d.content.includes('full_name')),
    ).toBe(true);
    expect(proposal.expectedCompatibility['NEW+V2']).toBe('PASS');
  });

  it('rejects stale schema when modified', () => {
    const proposal = RepairPlanner.plan(context, schema, migration);

    expect(RepairPlanner.validateStaleness(proposal, schema)).toBe(true);
    expect(RepairPlanner.validateStaleness(proposal, schema + '\n// modified')).toBe(false);
  });
});
