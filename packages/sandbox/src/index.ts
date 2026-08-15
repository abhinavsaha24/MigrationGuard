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
    return `postgresql://postgres:postgres@localhost:${this.port}/migrationguard?schema=public`;
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
