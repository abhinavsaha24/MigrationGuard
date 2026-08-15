import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');

describe('M1 E2E Verification', () => {
  it('should successfully run the full M1 compatibility matrix and produce expected evidence', () => {
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
    }
  }, 120000);
});
