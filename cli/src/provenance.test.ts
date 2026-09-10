import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { EvidenceBuilder } from '@migrationguard/compatibility';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('End-To-End Provenance Integration', () => {
  it('should generate same inputHashes for same inputs, and different hashes for mutations', () => {
    const inputs1 = {
      schemaV1: 'model User { id String @id }',
      schemaV2: 'model User { id String @id \n name String }',
      migrationSql: 'ALTER TABLE "User" ADD COLUMN "name" TEXT NOT NULL;',
      workloadJson: '{"workloadId": "test"}',
    };

    const inputs2 = {
      ...inputs1,
    };

    const mutatedInputs = {
      ...inputs1,
      schemaV2: 'model User { id String @id \n name String? }', // One byte/char mutation
    };

    const hashes1 = EvidenceBuilder.buildInputHashes(inputs1);
    const hashes2 = EvidenceBuilder.buildInputHashes(inputs2);
    const hashesMutated = EvidenceBuilder.buildInputHashes(mutatedInputs);

    // 1. Same inputs -> Same hashes
    expect(hashes1['schemaV1']).toBe(hashes2['schemaV1']);
    expect(hashes1['schemaV2']).toBe(hashes2['schemaV2']);
    expect(hashes1['migrationSql']).toBe(hashes2['migrationSql']);
    expect(hashes1['workloadJson']).toBe(hashes2['workloadJson']);

    // 2. One-byte mutation -> Different hash
    expect(hashes1['schemaV2']).not.toBe(hashesMutated['schemaV2']);
    expect(hashes1['schemaV1']).toBe(hashesMutated['schemaV1']); // Unchanged parts stay same
  });
});
