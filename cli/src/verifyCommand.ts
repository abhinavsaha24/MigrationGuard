import * as path from 'path';
import * as fs from 'fs';
import { runVerificationOrchestrator } from './orchestrator.js';

export interface VerifyConfig {
  migration?: string;
  baseMigration?: string;
  schema?: string;
  workload?: string;
  appDir?: string;
  upload?: boolean;
}

export async function verifyCommand(options: any, cwd: string) {
  let config: VerifyConfig = {};

  if (options.config) {
    const configPath = path.resolve(cwd, options.config);
    if (!fs.existsSync(configPath)) {
      console.error(`Configuration file not found: ${configPath}`);
      process.exit(2);
    }
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e: any) {
      console.error(`Invalid configuration JSON in ${configPath}: ${e.message}`);
      process.exit(2);
    }
  } else {
    // Default config uses the deterministic M1 regression fixture
    let repoRoot = cwd;
    if (repoRoot.endsWith('cli')) {
      repoRoot = path.resolve(repoRoot, '../');
    }
    config = {
      migration: path.join(repoRoot, 'fixtures', 'prisma', 'migrations', '20240102000000_v2'),
      baseMigration: path.join(repoRoot, 'fixtures', 'prisma', 'migrations', '20240101000000_v1'),
      schema: path.join(repoRoot, 'fixtures', 'prisma', 'schema.prisma'),
      workload: path.join(repoRoot, 'workloads', 'm1-user-compatibility.json'),
      appDir: path.join(repoRoot, 'apps', 'poc-app'),
    };
  }

  // CLI options override config
  if (options.migration) config.migration = path.resolve(cwd, options.migration);
  if (options.workload) config.workload = path.resolve(cwd, options.workload);
  if (options.schema) config.schema = path.resolve(cwd, options.schema);
  if (options.appDir) config.appDir = path.resolve(cwd, options.appDir);
  if (options.upload !== undefined) config.upload = options.upload;

  // Validate presence
  const missing = [];
  if (!config.migration) missing.push('migration');
  if (!config.workload) missing.push('workload');
  if (!config.schema) missing.push('schema');

  if (missing.length > 0) {
    console.error(`Missing required configuration: ${missing.join(', ')}`);
    process.exit(2);
  }

  const resolvedConfig = {
    migration: config.migration as string,
    baseMigration: config.baseMigration || '',
    schema: config.schema as string,
    workload: config.workload as string,
    appDir: config.appDir || cwd,
    upload: config.upload || false,
  };

  // Validate files exist
  for (const [key, p] of Object.entries(config)) {
    if (key === 'upload') continue;
    if (p && !fs.existsSync(p as string)) {
      console.error(`[Configuration Error] ${key} path does not exist: ${p}`);
      process.exit(2); // CONFIGURATION_ERROR
    }
  }

  const exitCode = await runVerificationOrchestrator(resolvedConfig);
  process.exit(exitCode);
}
