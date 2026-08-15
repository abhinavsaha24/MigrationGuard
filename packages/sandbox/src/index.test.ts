import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgresSandbox, getFreePort } from './index.js';
import { spawnSync } from 'child_process';

describe('PostgresSandbox M2', () => {
  let sandbox: PostgresSandbox;
  const containerName = `mg-test-sandbox-${Date.now()}`;

  beforeAll(() => {
    sandbox = new PostgresSandbox(containerName);
  });

  afterAll(() => {
    sandbox.stop();
  });

  it('should find a free port', async () => {
    const port = await getFreePort();
    expect(port).toBeGreaterThan(0);
  });

  it('should start a sandbox and become ready', async () => {
    await sandbox.start();
    const url = sandbox.getDatabaseUrl();
    expect(url).toContain('postgresql://');
    expect(url).not.toContain('54321'); // No longer hardcoded

    // Verify container actually exists in docker ps
    const res = spawnSync(
      'docker',
      ['ps', '--filter', `name=${containerName}`, '--format', '{{.Names}}'],
      { encoding: 'utf-8' },
    );
    expect(res.stdout.trim()).toBe(containerName);
  }, 60000);

  it('should stop cleanly', () => {
    sandbox.stop();
    const res = spawnSync(
      'docker',
      ['ps', '-a', '--filter', `name=${containerName}`, '--format', '{{.Names}}'],
      { encoding: 'utf-8' },
    );
    expect(res.stdout.trim()).toBe('');
  });
});
