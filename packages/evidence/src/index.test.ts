import { describe, it, expect } from 'vitest';
import { generateReport, EvidenceRecord } from './index.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Evidence Package', () => {
  it('should generate JSON and Markdown reports', () => {
    const tempDir = path.join(os.tmpdir(), `mg-evidence-test-${Date.now()}`);
    const mockEvidence = [
      {
        evidenceId: 'EVD-abc123',
        runId: 'RUN-TEST',
        timestamp: new Date().toISOString(),
        applicationVersion: 'OLD',
        databaseVersion: 'V2',
        workloadId: 'w1',
        durationMs: 150,
        failureCategory: 'COMPATIBILITY_FAILURE',
        faultType: 'DESTRUCTIVE_RENAME',
        confidence: 'CONFIRMED',
        causalChain: ['Step 1', 'Step 2'],
        reproducibility: {
          nodeVersion: '18.x',
          osPlatform: 'test',
        },
      },
    ] as EvidenceRecord[];

    generateReport(mockEvidence, tempDir);

    const jsonPath = path.join(tempDir, 'RUN-TEST.json');
    const mdPath = path.join(tempDir, 'RUN-TEST.md');

    expect(fs.existsSync(jsonPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);

    const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    expect(jsonContent.runId).toBe('RUN-TEST');
    expect(jsonContent.evidence.length).toBe(1);

    const mdContent = fs.readFileSync(mdPath, 'utf-8');
    expect(mdContent).toContain('MigrationGuard Verification Report');
    expect(mdContent).toContain('FAILED (Compatibility regressions found)');
    expect(mdContent).toContain('DESTRUCTIVE_RENAME');

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
