import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
// @ts-expect-error importing pure JS ESM utility
import { assertVerificationResult } from '../../scripts/ci-assert-verify.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');

describe('M1 E2E Verification', () => {
  it('should successfully run the full M1 compatibility matrix and produce expected evidence in human mode', () => {
    try {
      execSync('npm run verify', { cwd: REPO_ROOT, encoding: 'utf-8', stdio: 'pipe' });
      throw new Error(
        'Expected verify script to exit with code 1 due to compatibility failure, but it succeeded.',
      );
    } catch (e: unknown) {
      const err = e as { status: number; stdout: string; stderr: string };
      if (err.status !== 1) {
        throw new Error(
          `Expected verify script to exit with code 1, but got ${err.status}. Output: ${err.stdout} \n Error: ${err.stderr}`,
        );
      }
      expect(err.stdout).toContain('OLD + V1     PASS');
      expect(err.stdout).toContain('NEW + V1     FAIL');
      expect(err.stdout).toContain('OLD + V2     FAIL');
      expect(err.stdout).toContain('NEW + V2     PASS');
      expect(err.stdout).toContain('VERIFICATION FAILED');
      expect(err.stdout).toContain('DESTRUCTIVE_RENAME');
    }
  }, 120000);

  it('should output machine-readable JSON verification result when --json is passed', () => {
    try {
      execSync('node ./dist/index.js verify --json', {
        cwd: path.resolve(REPO_ROOT, 'cli'),
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      throw new Error('Expected verify --json to exit with code 1, but it succeeded.');
    } catch (e: unknown) {
      const err = e as { status: number; stdout: string; stderr: string };
      expect(err.status).toBe(1);
      const parsed = JSON.parse(err.stdout.trim());
      expect(parsed.exitCode).toBe(1);
      expect(parsed.result).toBe('VERIFICATION FAILED');
      expect(parsed.fault).toBe('DESTRUCTIVE_RENAME');
      expect(parsed.confidence).toBe('CONFIRMED');
      expect(parsed.matrix).toEqual({
        OLD_V1: 'PASS',
        NEW_V1: 'FAIL',
        OLD_V2: 'FAIL',
        NEW_V2: 'PASS',
      });
      expect(parsed.states).toHaveLength(4);
      expect(parsed.evidence).toHaveLength(4);
    }
  }, 120000);
});

describe('CI Verification Assertion Contract', () => {
  const validReport = {
    runId: 'MG-VERIFY-MOCK-1',
    evidence: [
      { applicationVersion: 'OLD', databaseVersion: 'V1', failureCategory: 'NONE' },
      {
        applicationVersion: 'NEW',
        databaseVersion: 'V1',
        failureCategory: 'COMPATIBILITY_FAILURE',
      },
      {
        applicationVersion: 'OLD',
        databaseVersion: 'V2',
        failureCategory: 'COMPATIBILITY_FAILURE',
        faultType: 'DESTRUCTIVE_RENAME',
        confidence: 'CONFIRMED',
        databaseError: 'The column `users.name` does not exist',
      },
      { applicationVersion: 'NEW', databaseVersion: 'V2', failureCategory: 'NONE' },
    ],
  };

  it('passes when exit code is 1 and report matches expected destructive rename incompatibility', () => {
    const res = assertVerificationResult({
      exitCode: 1,
      report: validReport,
    });
    expect(res.success).toBe(true);
    expect(res.fault).toBe('DESTRUCTIVE_RENAME');
    expect(res.matrix.OLD_V2).toBe('FAIL');
  });

  it('fails when exit code is 0 (unexpected pass hides incompatibility)', () => {
    expect(() =>
      assertVerificationResult({
        exitCode: 0,
        report: validReport,
      }),
    ).toThrow(/unexpectedly exited with 0/);
  });

  it('fails when verifier reports configuration error (exit code 2)', () => {
    expect(() =>
      assertVerificationResult({
        exitCode: 2,
        report: validReport,
      }),
    ).toThrow(/CONFIGURATION_ERROR/);
  });

  it('fails when verifier reports infrastructure failure (exit code 3)', () => {
    expect(() =>
      assertVerificationResult({
        exitCode: 3,
        report: validReport,
      }),
    ).toThrow(/INFRASTRUCTURE_FAILURE/);
  });

  it('fails when verifier crashes with unknown failure (exit code 4)', () => {
    expect(() =>
      assertVerificationResult({
        exitCode: 4,
        report: validReport,
      }),
    ).toThrow(/unexpected error\/crash code: 4/);
  });

  it('fails when matrix states are corrupted or missing', () => {
    const corruptedReport = {
      runId: 'MG-VERIFY-CORRUPT',
      evidence: [
        { applicationVersion: 'OLD', databaseVersion: 'V1', failureCategory: 'NONE' },
        { applicationVersion: 'OLD', databaseVersion: 'V2', failureCategory: 'NONE' },
      ],
    };
    expect(() =>
      assertVerificationResult({
        exitCode: 1,
        report: corruptedReport,
      }),
    ).toThrow(/exactly 4 matrix state evidence records/);
  });

  it('fails when fault category is not DESTRUCTIVE_RENAME', () => {
    const wrongFaultReport = {
      runId: 'MG-VERIFY-WRONG',
      evidence: [
        { applicationVersion: 'OLD', databaseVersion: 'V1', failureCategory: 'NONE' },
        {
          applicationVersion: 'NEW',
          databaseVersion: 'V1',
          failureCategory: 'COMPATIBILITY_FAILURE',
        },
        {
          applicationVersion: 'OLD',
          databaseVersion: 'V2',
          failureCategory: 'COMPATIBILITY_FAILURE',
          faultType: 'NOT_NULL_INCOMPATIBILITY',
          confidence: 'CONFIRMED',
          databaseError: 'users.name',
        },
        { applicationVersion: 'NEW', databaseVersion: 'V2', failureCategory: 'NONE' },
      ],
    };
    expect(() =>
      assertVerificationResult({
        exitCode: 1,
        report: wrongFaultReport,
      }),
    ).toThrow(/Expected fault category DESTRUCTIVE_RENAME/);
  });
});
