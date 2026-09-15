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
  json?: boolean;
}

export async function verifyCommand(options: any, cwd: string) {
  let config: VerifyConfig = {};

  let configDir = cwd;

  if (options.config) {
    const configPath = path.resolve(cwd, options.config);
    if (!fs.existsSync(configPath)) {
      console.error(`Configuration file not found: ${configPath}`);
      process.exit(2);
    }
    configDir = path.dirname(configPath);
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e: any) {
      console.error(`Invalid configuration JSON in ${configPath}: ${e.message}`);
      process.exit(2);
    }
  } else if (fs.existsSync(path.resolve(cwd, 'migrationguard.json'))) {
    const configPath = path.resolve(cwd, 'migrationguard.json');
    configDir = cwd;
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e: any) {
      console.error(`Invalid configuration JSON in ${configPath}: ${e.message}`);
      process.exit(2);
    }
  } else {
    // Default config uses the deterministic M1 regression fixture if inside repository
    let repoRoot = cwd;
    if (repoRoot.endsWith('cli')) {
      repoRoot = path.resolve(repoRoot, '../');
    }
    const defaultMigration = path.join(
      repoRoot,
      'fixtures',
      'prisma',
      'migrations',
      '20240102000000_v2',
    );
    if (fs.existsSync(defaultMigration)) {
      config = {
        migration: defaultMigration,
        baseMigration: path.join(repoRoot, 'fixtures', 'prisma', 'migrations', '20240101000000_v1'),
        schema: path.join(repoRoot, 'fixtures', 'prisma', 'schema.prisma'),
        workload: path.join(repoRoot, 'workloads', 'm1-user-compatibility.json'),
        appDir: path.join(repoRoot, 'apps', 'poc-app'),
      };
    }
  }

  // Resolve relative paths in config relative to the configuration file directory
  if (config.migration && !path.isAbsolute(config.migration)) {
    config.migration = path.resolve(configDir, config.migration);
  }
  if (config.baseMigration && !path.isAbsolute(config.baseMigration)) {
    config.baseMigration = path.resolve(configDir, config.baseMigration);
  }
  if (config.schema && !path.isAbsolute(config.schema)) {
    config.schema = path.resolve(configDir, config.schema);
  }
  if (config.workload && !path.isAbsolute(config.workload)) {
    config.workload = path.resolve(configDir, config.workload);
  }
  if (config.appDir && !path.isAbsolute(config.appDir)) {
    config.appDir = path.resolve(configDir, config.appDir);
  }

  // CLI options override config
  if (options.migration) config.migration = path.resolve(cwd, options.migration);
  if (options.workload) config.workload = path.resolve(cwd, options.workload);
  if (options.schema) config.schema = path.resolve(cwd, options.schema);
  if (options.appDir) config.appDir = path.resolve(cwd, options.appDir);
  if (options.upload !== undefined) config.upload = options.upload;
  if (options.json !== undefined) config.json = Boolean(options.json);

  // Validate presence
  const missing = [];
  if (!config.migration) missing.push('migration');
  if (!config.workload) missing.push('workload');
  if (!config.schema) missing.push('schema');

  if (missing.length > 0) {
    if (config.json) {
      console.log(
        JSON.stringify(
          {
            exitCode: 2,
            result: 'CONFIGURATION ERROR',
            error: `Missing required configuration: ${missing.join(', ')}`,
          },
          null,
          2,
        ),
      );
    } else {
      console.error(`Missing required configuration: ${missing.join(', ')}`);
      console.error('Please specify a configuration file via --config <path> or CLI flags.');
    }
    process.exit(2);
  }

  const resolvedConfig = {
    migration: config.migration as string,
    baseMigration: config.baseMigration || '',
    schema: config.schema as string,
    workload: config.workload as string,
    appDir: config.appDir ? path.resolve(configDir, config.appDir) : cwd,
    upload: config.upload || false,
    json: config.json || false,
  };

  // Validate files exist
  for (const [key, p] of Object.entries(resolvedConfig)) {
    if (key === 'upload' || key === 'json' || (key === 'baseMigration' && !p)) continue;
    if (p && !fs.existsSync(p as string)) {
      if (config.json) {
        console.log(
          JSON.stringify(
            {
              exitCode: 2,
              result: 'CONFIGURATION ERROR',
              error: `[Configuration Error] ${key} path does not exist: ${p}`,
            },
            null,
            2,
          ),
        );
      } else {
        console.error(`[Configuration Error] ${key} path does not exist: ${p}`);
      }
      process.exit(2); // CONFIGURATION_ERROR
    }
  }

  const exitCode = await runVerificationOrchestrator(resolvedConfig);
  process.exit(exitCode);
}
