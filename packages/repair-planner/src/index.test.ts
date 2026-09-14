import { describe, it, expect } from 'vitest';
import { RepairPlanner } from './index.js';
import { CompatibilityExplanationContext } from '@migrationguard/core';

describe('RepairPlanner', () => {
  const sampleSchema = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model users {
  id   Int    @id @default(autoincrement())
  name String
}
`;

  const sampleMigration = `
ALTER TABLE "users" DROP COLUMN "name";
ALTER TABLE "users" ADD COLUMN "full_name" TEXT NOT NULL;
`;

  const sampleContext: CompatibilityExplanationContext = {
    verificationId: 'MG-TEST-100',
    verdict: 'FAIL',
    faultCategory: 'COMPATIBILITY_FAILURE',
    confidence: 'CONFIRMED',
    failedStates: ['OLD_APP_V2_DB', 'NEW_APP_V1_DB'],
    migrationChanges: [
      { type: 'DROP_COLUMN', table: 'users', column: 'name' },
      { type: 'ADD_COLUMN', table: 'users', column: 'full_name', nullable: false },
    ],
    observations: [
      {
        state: 'OLD_APP_V2_DB',
        operation: 'GET /users/1',
        databaseError: 'The column `users.name` does not exist in the current database.',
        result: 'FAIL',
      },
    ],
    evidence: [
      {
        id: 'EVD-123',
        faultType: 'DESTRUCTIVE_RENAME',
        confidence: 'CONFIRMED',
        observedError: 'The column `users.name` does not exist in the current database.',
      },
    ],
  };

  it('generates an EXPAND_CONTRACT proposal for DESTRUCTIVE_RENAME', () => {
    const proposal = RepairPlanner.plan(sampleContext, sampleSchema, sampleMigration);

    expect(proposal.strategy).toBe('EXPAND_CONTRACT');
    expect(proposal.proposalId).toMatch(/^PRP-[a-f0-9]{16}$/);
    expect(proposal.affectedObjects.length).toBeGreaterThanOrEqual(2);
    expect(proposal.affectedObjects.some((o) => o.name === 'name')).toBe(true);
    expect(proposal.affectedObjects.some((o) => o.name === 'full_name')).toBe(true);
    expect(proposal.migrationPlan.length).toBe(4);
    expect(proposal.migrationPlan[0].title).toContain('Expand');
    expect(proposal.migrationPlan[3].title).toContain('Contract');
    expect(proposal.schemaDiff.length).toBeGreaterThan(0);
    expect(proposal.proposedSchema).toContain('name');
    expect(proposal.proposedSchema).toContain('full_name');
  });

  it('generates deterministic identical proposalId for identical inputs', () => {
    const p1 = RepairPlanner.plan(sampleContext, sampleSchema, sampleMigration);
    const p2 = RepairPlanner.plan(sampleContext, sampleSchema, sampleMigration);

    expect(p1.proposalId).toBe(p2.proposalId);
    expect(p1.sourceSchemaHash).toBe(p2.sourceSchemaHash);
    expect(p1.sourceMigrationHash).toBe(p2.sourceMigrationHash);
  });

  it('validates staleness: fresh schema passes, modified schema fails', () => {
    const proposal = RepairPlanner.plan(sampleContext, sampleSchema, sampleMigration);

    expect(RepairPlanner.validateStaleness(proposal, sampleSchema)).toBe(true);

    const modifiedSchema = sampleSchema.replace('name String', 'name String?');
    expect(RepairPlanner.validateStaleness(proposal, modifiedSchema)).toBe(false);
  });

  it('generates a NULLABLE_WITH_BACKFILL proposal for NOT_NULL_INCOMPATIBILITY', () => {
    const notNullContext: CompatibilityExplanationContext = {
      verificationId: 'MG-TEST-101',
      verdict: 'FAIL',
      faultCategory: 'COMPATIBILITY_FAILURE',
      confidence: 'CONFIRMED',
      failedStates: ['OLD_APP_V2_DB'],
      migrationChanges: [{ type: 'ADD_COLUMN', table: 'users', column: 'email', nullable: false }],
      observations: [],
      evidence: [
        {
          id: 'EVD-124',
          faultType: 'NOT_NULL_INCOMPATIBILITY',
          confidence: 'CONFIRMED',
        },
      ],
    };

    const notNullMigration = `ALTER TABLE "users" ADD COLUMN "email" TEXT NOT NULL;`;
    const proposal = RepairPlanner.plan(notNullContext, sampleSchema, notNullMigration);

    expect(proposal.strategy).toBe('NULLABLE_WITH_BACKFILL');
    expect(proposal.migrationPlan.some((p) => p.title.includes('Backfill'))).toBe(true);
  });
});
