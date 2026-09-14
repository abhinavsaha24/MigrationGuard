import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

function getPrismaCommand(extraDirs: string[] = []): string {
  const searchDirs = [...extraDirs, process.cwd()];
  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    searchDirs.push(currentDir);
    searchDirs.push(path.resolve(currentDir, '..'));
  } catch {
    // ignore
  }

  for (const dir of searchDirs) {
    if (!dir) continue;
    try {
      const req = createRequire(path.join(dir, 'package.json'));
      const prismaPkgPath = req.resolve('prisma/package.json');
      const binPath = path.join(path.dirname(prismaPkgPath), 'build', 'index.js');
      if (fs.existsSync(binPath)) {
        return `"${process.execPath}" "${binPath}"`;
      }
    } catch {
      // continue to next search directory
    }
  }
  return 'npx prisma';
}

export class MigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationError';
  }
}

export class MigrationEngine {
  private databaseUrl: string;
  private workspaceDir: string | null = null;
  private appliedMigrations: string[] = [];

  constructor(databaseUrl: string) {
    this.databaseUrl = databaseUrl;
  }

  public prepareWorkspace(schemaPath: string): void {
    const id = randomBytes(8).toString('hex');
    this.workspaceDir = path.join(os.tmpdir(), `mg-prisma-workspace-${id}`);

    fs.mkdirSync(this.workspaceDir, { recursive: true });
    fs.mkdirSync(path.join(this.workspaceDir, 'migrations'), { recursive: true });

    let schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    if (!schemaContent.includes('url =') && !schemaContent.includes('url      =')) {
      schemaContent = schemaContent.replace(/datasource\s+db\s*{[^}]*}/, (match) => {
        return match.replace('}', '  url = env("DATABASE_URL")\n}');
      });
    }
    fs.writeFileSync(path.join(this.workspaceDir, 'schema.prisma'), schemaContent);
  }

  public applyMigration(sourceDir: string, migrationName: string): void {
    if (!this.workspaceDir) throw new MigrationError('Workspace not prepared.');

    const targetDir = path.join(this.workspaceDir, 'migrations', migrationName);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(path.join(sourceDir, 'migration.sql'), path.join(targetDir, 'migration.sql'));

    try {
      const prismaCmd = getPrismaCommand([this.workspaceDir]);
      execSync(
        `${prismaCmd} migrate deploy --schema "${path.join(this.workspaceDir, 'schema.prisma')}"`,
        {
          env: { ...process.env, DATABASE_URL: this.databaseUrl },
          stdio: 'pipe',
        },
      );
      this.appliedMigrations.push(migrationName);
    } catch (err) {
      const error = err as { stderr?: string; stdout?: string; message?: string };
      throw new MigrationError(
        `Prisma migration failed: ${error.stderr || error.stdout || error.message}`,
      );
    }
  }

  public seedRawSql(sqlPath: string): void {
    if (!this.workspaceDir) throw new MigrationError('Workspace not prepared.');
    try {
      const prismaCmd = getPrismaCommand([this.workspaceDir]);
      execSync(
        `${prismaCmd} db execute --file "${sqlPath}" --schema "${path.join(this.workspaceDir, 'schema.prisma')}"`,
        {
          env: { ...process.env, DATABASE_URL: this.databaseUrl },
          stdio: 'pipe',
        },
      );
    } catch (err: unknown) {
      const error = err as { stderr?: string; stdout?: string; message?: string };
      throw new MigrationError(`Seeding failed: ${error.stderr || error.stdout || error.message}`);
    }
  }

  public cleanup(): void {
    if (this.workspaceDir && fs.existsSync(this.workspaceDir)) {
      try {
        fs.rmSync(this.workspaceDir, { recursive: true, force: true });
      } catch {
        console.error(
          `[MigrationEngine] Warning: Failed to clean up temp workspace ${this.workspaceDir}`,
        );
      }
    }
  }
}
