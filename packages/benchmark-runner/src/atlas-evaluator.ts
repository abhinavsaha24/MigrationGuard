import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface AtlasResult {
  baseline: 'ATLAS';
  baselineVersion: string;
  exitCode: number;
  status: 'SAFE' | 'UNSAFE' | 'NOT_EVALUATED';
  stdout: string;
  stderr: string;
  executionTimeMs: number;
  evaluated: boolean;
  notes: string;
}

export class AtlasEvaluator {
  private atlasPath: string;

  constructor(repoRoot: string) {
    this.atlasPath = path.join(repoRoot, 'bin', 'atlas.exe');
  }

  public async evaluate(
    migrationDir: string,
    databaseUrl: string,
    repoRoot: string,
  ): Promise<AtlasResult> {
    const startTime = Date.now();
    let version = 'unknown';

    try {
      if (!fs.existsSync(this.atlasPath)) {
        return {
          baseline: 'ATLAS',
          baselineVersion: 'unknown',
          exitCode: -1,
          status: 'NOT_EVALUATED',
          stdout: '',
          stderr: 'Atlas CLI not found at bin/atlas.exe',
          executionTimeMs: Date.now() - startTime,
          evaluated: false,
          notes: 'Atlas CLI is missing. Cannot evaluate.',
        };
      }

      try {
        const vOut = execSync(`${this.atlasPath} version`, { encoding: 'utf-8' });
        version = vOut.trim().split('\n')[0];
      } catch (e) {
        version = 'error fetching version';
      }

      // We need atlas to lint a migration directory against a dev-db.
      // But for Prisma, the migrations are in prisma/migrations.
      const dirUrl = `file://${migrationDir.replace(/\\/g, '/')}`;

      const cmd = `"${this.atlasPath}" migrate lint --dev-url "${databaseUrl}" --dir "${dirUrl}" --latest 1`;

      const output = execSync(cmd, { cwd: repoRoot, encoding: 'utf-8', stdio: 'pipe' });

      // If it returns 0, atlas considers the latest migration safe
      return {
        baseline: 'ATLAS',
        baselineVersion: version,
        exitCode: 0,
        status: 'SAFE',
        stdout: output,
        stderr: '',
        executionTimeMs: Date.now() - startTime,
        evaluated: true,
        notes: 'Atlas passed without linting errors for destructive changes.',
      };
    } catch (e: any) {
      const exitCode = e.status || 1;
      const stdout = e.stdout?.toString() || '';
      const stderr = e.stderr?.toString() || e.message;

      // Atlas usually exits with 1 on lint failures
      return {
        baseline: 'ATLAS',
        baselineVersion: version,
        exitCode,
        status: 'UNSAFE',
        stdout,
        stderr,
        executionTimeMs: Date.now() - startTime,
        evaluated: true,
        notes: 'Atlas returned non-zero exit code indicating destructive changes or lint failure.',
      };
    }
  }
}
