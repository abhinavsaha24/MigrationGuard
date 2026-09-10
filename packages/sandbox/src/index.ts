import { spawnSync } from 'child_process';
import { setTimeout } from 'timers/promises';
import * as net from 'net';

export class SandboxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SandboxError';
  }
}

export class SandboxTimeoutError extends SandboxError {
  constructor(message: string) {
    super(message);
    this.name = 'SandboxTimeoutError';
  }
}

export async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, () => {
      const addr = srv.address();
      const port = typeof addr === 'string' ? 0 : addr?.port || 0;
      srv.close(() => {
        resolve(port);
      });
    });
  });
}

export interface SandboxTelemetry {
  queries: string[];
  errors: {
    message: string;
    statement?: string;
  }[];
}

export class PostgresSandbox {
  private containerName: string;
  private port: number | null = null;
  private isReady: boolean = false;

  constructor(containerName: string) {
    this.containerName = containerName;
  }

  public async start(): Promise<void> {
    this.stop(); // Ensure clean state before starting

    this.port = await getFreePort();
    console.log(
      `[Sandbox] Starting PostgreSQL sandbox '${this.containerName}' on port ${this.port}...`,
    );

    const res = spawnSync(
      'docker',
      [
        'run',
        '-d',
        '--name',
        this.containerName,
        '-e',
        'POSTGRES_USER=postgres',
        '-e',
        'POSTGRES_PASSWORD=postgres',
        '-e',
        'POSTGRES_DB=migrationguard',
        '-p',
        `${this.port}:5432`,
        'postgres:15',
        '-c',
        'shared_preload_libraries=pg_stat_statements',
        '-c',
        'log_statement=all',
        '-c',
        'log_min_error_statement=error',
      ],
      { encoding: 'utf-8' },
    );

    if (res.status !== 0) {
      throw new SandboxError(`Failed to start docker container: ${res.stderr || res.stdout}`);
    }

    try {
      await this.waitForReadiness();
    } catch (err) {
      this.stop();
      throw err;
    }
  }

  public stop(): void {
    const res = spawnSync('docker', ['rm', '-f', this.containerName], {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    if (res.status !== 0 && !res.stderr.includes('No such container')) {
      console.error(
        `[Sandbox] Warning: Failed to cleanly remove container ${this.containerName}: ${res.stderr}`,
      );
    }
    this.isReady = false;
  }

  public getDatabaseUrl(): string {
    if (!this.port) {
      throw new SandboxError(
        'Cannot get database URL: Sandbox has not started or port is unbound.',
      );
    }
    const host = process.env.SANDBOX_HOST || 'localhost';
    return `postgresql://postgres:postgres@${host}:${this.port}/migrationguard?schema=public`;
  }

  public clearTelemetry(): void {
    if (!this.isReady) return;
    spawnSync(
      'docker',
      [
        'exec',
        this.containerName,
        'psql',
        '-U',
        'postgres',
        '-d',
        'migrationguard',
        '-c',
        "SELECT 'MIGRATIONGUARD_TELEMETRY_RESET';",
      ],
      { encoding: 'utf-8' },
    );
  }

  public getTelemetry(): SandboxTelemetry {
    if (!this.isReady) {
      return { queries: [], errors: [] };
    }

    const logRes = spawnSync('docker', ['logs', this.containerName], { encoding: 'utf-8' });
    const queries: string[] = [];
    const errors: { message: string; statement?: string }[] = [];

    if (logRes.status === 0 && logRes.stderr) {
      const lines = logRes.stderr.split('\n');

      let currentError: string | null = null;
      let currentStatement: string | null = null;

      // Find the last reset marker to ignore previous test runs
      let startIndex = 0;
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].includes("statement: SELECT 'MIGRATIONGUARD_TELEMETRY_RESET';")) {
          startIndex = i + 1;
          break;
        }
      }

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];

        // Match standard query statements
        const statementLogMatch = line.match(/LOG:\s+statement:\s+(.+)/);
        if (statementLogMatch) {
          const stmt = statementLogMatch[1].trim();
          if (!stmt.includes('pg_stat_statements') && !stmt.includes('SELECT 1;')) {
            queries.push(stmt);
          }
          currentStatement = stmt;
        }

        // Match errors
        const errorMatch = line.match(/ERROR:\s+(.+)/);
        if (errorMatch) {
          if (currentError) {
            errors.push({ message: currentError, statement: currentStatement || undefined });
          }
          currentError = errorMatch[1].trim();
        } else if (currentError && line.match(/STATEMENT:\s+(.+)/)) {
          // Native postgres error logs sometimes output the exact statement that failed
          const stmtMatch = line.match(/STATEMENT:\s+(.+)/);
          currentStatement = stmtMatch![1].trim();
          errors.push({ message: currentError, statement: currentStatement });
          currentError = null;
        } else if (currentError && line.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}/)) {
          // We hit the next log line, flush the accumulated error
          errors.push({ message: currentError, statement: currentStatement || undefined });
          currentError = null;
        }
      }

      // Flush any trailing error
      if (currentError) {
        errors.push({ message: currentError, statement: currentStatement || undefined });
      }
    }

    return { queries, errors };
  }

  public getSchemaMetadata(): Record<string, string[]> {
    if (!this.isReady) {
      return {};
    }

    const res = spawnSync(
      'docker',
      [
        'exec',
        this.containerName,
        'psql',
        '-U',
        'postgres',
        '-d',
        'migrationguard',
        '-t',
        '-A',
        '-c',
        "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public';",
      ],
      { encoding: 'utf-8' },
    );

    const schema: Record<string, string[]> = {};
    if (res.status === 0 && res.stdout) {
      const lines = res.stdout
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      for (const line of lines) {
        const [table, col] = line.split('|');
        if (table && col) {
          if (!schema[table]) schema[table] = [];
          schema[table].push(col);
        }
      }
    }
    return schema;
  }

  private async waitForReadiness(): Promise<void> {
    console.log(`[Sandbox] Waiting for PostgreSQL container ${this.containerName} to be ready...`);

    // First ensure the host port is mapped and reachable
    await this.waitForHostPort();

    let attempts = 0;
    while (attempts < 30) {
      // Then verify PostgreSQL is actually ready to execute queries on the specific database
      const res = spawnSync(
        'docker',
        [
          'exec',
          this.containerName,
          'psql',
          '-U',
          'postgres',
          '-d',
          'migrationguard',
          '-c',
          'SELECT 1;',
        ],
        { encoding: 'utf-8', stdio: 'pipe' },
      );
      if (res.status === 0 && res.stdout.includes('1')) {
        // Initialize pg_stat_statements
        spawnSync(
          'docker',
          [
            'exec',
            this.containerName,
            'psql',
            '-U',
            'postgres',
            '-d',
            'migrationguard',
            '-c',
            'CREATE EXTENSION IF NOT EXISTS pg_stat_statements;',
          ],
          { encoding: 'utf-8', stdio: 'pipe' },
        );

        console.log(`[Sandbox] PostgreSQL is ready.`);
        this.isReady = true;
        return;
      }
      attempts++;
      await setTimeout(1000);
    }
    throw new SandboxTimeoutError(
      `Timeout waiting for PostgreSQL sandbox ${this.containerName} to be ready for queries.`,
    );
  }

  private async waitForHostPort(): Promise<void> {
    if (!this.port) throw new SandboxError('Port not assigned.');
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      const reachable = await new Promise<boolean>((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(500);
        socket.once('connect', () => {
          socket.destroy();
          resolve(true);
        });
        socket.once('error', () => {
          socket.destroy();
          resolve(false);
        });
        socket.once('timeout', () => {
          socket.destroy();
          resolve(false);
        });
        socket.connect(this.port!, '127.0.0.1');
      });
      if (reachable) return;
      await setTimeout(500);
    }
    throw new SandboxTimeoutError(
      `Host port ${this.port} for sandbox ${this.containerName} did not become reachable within timeout.`,
    );
  }
}
