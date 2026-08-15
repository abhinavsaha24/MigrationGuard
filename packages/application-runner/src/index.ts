import { spawn, ChildProcess, spawnSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { setTimeout } from 'timers/promises';
import * as http from 'http';
import * as net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../');

export async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, () => {
      const addr = srv.address();
      const port = typeof addr === 'string' ? 0 : addr?.port || 0;
      srv.close(() => resolve(port));
    });
  });
}

export class ApplicationRunner {
  private process: ChildProcess | null = null;
  private port: number | null = null;
  private version: 'OLD' | 'NEW';
  private repoPath?: string;

  constructor(version: 'OLD' | 'NEW', repoPath?: string) {
    this.version = version;
    this.repoPath = repoPath;
  }

  public async start(databaseUrl: string): Promise<void> {
    this.port = await getFreePort();
    console.log(`[APP ${this.version}] Starting on port ${this.port}...`);

    if (this.repoPath) {
      const scriptName = this.version === 'OLD' ? 'start:old' : 'start:new';
      const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      this.process = spawn(npmCmd, ['run', scriptName], {
        cwd: this.repoPath,
        env: { ...process.env, PORT: this.port.toString(), DATABASE_URL: databaseUrl },
        stdio: 'pipe',
        shell: process.platform === 'win32',
      });
    } else {
      const scriptName = this.version === 'OLD' ? 'old.js' : 'new.js';
      const scriptPath = path.join(REPO_ROOT, 'apps', 'poc-app', 'dist', scriptName);
      this.process = spawn('node', [scriptPath], {
        env: { ...process.env, PORT: this.port.toString(), DATABASE_URL: databaseUrl },
        stdio: 'pipe',
      });
    }

    this.process.stdout?.on('data', (data) =>
      console.log(`[APP ${this.version}] ${data.toString().trim()}`),
    );
    this.process.stderr?.on('data', (data) =>
      console.error(`[APP ${this.version} ERR] ${data.toString().trim()}`),
    );

    await this.waitForHealthCheck();
  }

  public getPort(): number {
    if (!this.port) throw new Error('Port not bound yet.');
    return this.port;
  }

  public stop(): void {
    if (this.process && this.process.pid) {
      if (process.platform === 'win32') {
        // Windows specific forced termination of process tree
        spawnSync('taskkill', ['/pid', this.process.pid.toString(), '/t', '/f'], {
          stdio: 'ignore',
        });
      } else {
        this.process.kill('SIGKILL');
      }
      this.process = null;
    }
  }

  private async waitForHealthCheck(): Promise<void> {
    let attempts = 0;
    while (attempts < 60) {
      const isUp = await new Promise<boolean>((resolve) => {
        http
          .get(`http://localhost:${this.port}/health`, (res) => {
            resolve(res.statusCode === 200);
          })
          .on('error', () => resolve(false));
      });
      if (isUp) return;
      await setTimeout(500);
      attempts++;
    }
    this.stop();
    throw new Error(
      `Application ${this.version} failed to start or pass health check on port ${this.port}.`,
    );
  }
}
