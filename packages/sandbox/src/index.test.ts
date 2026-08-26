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

  it('should capture native log telemetry', async () => {
    // Note: sandbox is already started from the previous test
    sandbox.clearTelemetry();
    
    // Need a tiny delay to ensure reset marker is logged before subsequent queries
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Execute multiple queries including an error
    spawnSync(
      'docker',
      [
        'exec',
        containerName, // From closure
        'psql',
        '-U',
        'postgres',
        '-d',
        'migrationguard',
        '-c',
        "CREATE TABLE test_telemetry (id SERIAL PRIMARY KEY, name TEXT);",
      ],
      { encoding: 'utf-8' },
    );

    spawnSync(
      'docker',
      [
        'exec',
        containerName,
        'psql',
        '-U',
        'postgres',
        '-d',
        'migrationguard',
        '-c',
        "SELECT name FROM test_telemetry;",
      ],
      { encoding: 'utf-8' },
    );

    spawnSync(
      'docker',
      [
        'exec',
        containerName,
        'psql',
        '-U',
        'postgres',
        '-d',
        'migrationguard',
        '-c',
        "SELECT unknown_col FROM test_telemetry;",
      ],
      { encoding: 'utf-8' },
    );

    const telemetry = sandbox.getTelemetry();

    expect(telemetry.queries.some((q) => q.includes('CREATE TABLE test_telemetry'))).toBe(true);
    expect(telemetry.queries.some((q) => q.includes('SELECT name FROM test_telemetry'))).toBe(true);
    expect(telemetry.queries.some((q) => q.includes('SELECT unknown_col FROM test_telemetry'))).toBe(true);

    // Verify error is captured and associated with the statement
    expect(telemetry.errors.length).toBeGreaterThanOrEqual(1);
    const colError = telemetry.errors.find((e) => e.message.includes('column "unknown_col" does not exist'));
    expect(colError).toBeDefined();
    expect(colError?.statement).toContain('SELECT unknown_col FROM test_telemetry');
  }, 30000);

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
