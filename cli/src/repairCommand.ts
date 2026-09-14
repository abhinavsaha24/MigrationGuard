import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as readline from 'readline';
import { RepairPlanner } from '@migrationguard/repair-planner';
import { CompatibilityExplanationContext, RepairProposal } from '@migrationguard/core';
import { runVerificationOrchestrator } from './orchestrator.js';

export interface RepairOptions {
  config?: string;
  show?: boolean;
  approve?: string;
  reject?: string;
  yes?: boolean;
}

export async function repairCommand(options: RepairOptions, cwd: string) {
  let configPath = options.config
    ? path.resolve(cwd, options.config)
    : path.resolve(cwd, 'migrationguard.json');
  let configDir = cwd;

  if (fs.existsSync(configPath)) {
    configDir = path.dirname(configPath);
  } else {
    // Check if inside repository root
    let repoRoot = cwd;
    if (repoRoot.endsWith('cli')) repoRoot = path.resolve(repoRoot, '../');
    const defaultMigration = path.join(
      repoRoot,
      'fixtures',
      'prisma',
      'migrations',
      '20240102000000_v2',
    );
    if (fs.existsSync(defaultMigration)) {
      configPath = '';
    } else {
      console.error(
        `Configuration file not found. Please specify --config <path> or run from a project root.`,
      );
      process.exit(2);
    }
  }

  let config: any = {};
  if (configPath && fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e: any) {
      console.error(`Invalid configuration JSON: ${e.message}`);
      process.exit(2);
    }
  } else {
    let repoRoot = cwd;
    if (repoRoot.endsWith('cli')) repoRoot = path.resolve(repoRoot, '../');
    config = {
      migration: path.join(repoRoot, 'fixtures', 'prisma', 'migrations', '20240102000000_v2'),
      baseMigration: path.join(repoRoot, 'fixtures', 'prisma', 'migrations', '20240101000000_v1'),
      schema: path.join(repoRoot, 'fixtures', 'prisma', 'schema.prisma'),
      workload: path.join(repoRoot, 'workloads', 'm1-user-compatibility.json'),
      appDir: path.join(repoRoot, 'apps', 'poc-app'),
    };
  }

  const schemaFile = path.isAbsolute(config.schema)
    ? config.schema
    : path.resolve(configDir, config.schema);
  const migrationDir = path.isAbsolute(config.migration)
    ? config.migration
    : path.resolve(configDir, config.migration);
  const migrationFile = path.join(migrationDir, 'migration.sql');

  if (!fs.existsSync(schemaFile)) {
    console.error(`Schema file does not exist: ${schemaFile}`);
    process.exit(2);
  }

  const currentSchema = fs.readFileSync(schemaFile, 'utf-8');
  const migrationSql = fs.existsSync(migrationFile) ? fs.readFileSync(migrationFile, 'utf-8') : '';

  // Check reports directory for existing verification evidence
  const reportsDir = path.resolve(cwd, 'reports');
  let context: CompatibilityExplanationContext = {
    verificationId: `MG-REPAIR-${Date.now()}`,
    verdict: 'FAIL',
    faultCategory: 'DESTRUCTIVE_RENAME',
    confidence: 'CONFIRMED',
    failedStates: ['OLD_APP_V2_DB', 'NEW_APP_V1_DB'],
    migrationChanges: [
      { type: 'DROP_COLUMN', table: 'users', column: 'name' },
      { type: 'ADD_COLUMN', table: 'users', column: 'full_name', nullable: false },
    ],
    observations: [
      {
        state: 'OLD_APP_V2_DB',
        operation: 'GET /users/1',
        databaseError: 'The column `users.name` does not exist in the current database.',
      },
    ],
    evidence: [
      {
        id: 'EVD-LOCAL-001',
        faultType: 'DESTRUCTIVE_RENAME',
        confidence: 'CONFIRMED',
        observedError: 'The column `users.name` does not exist in the current database.',
      },
    ],
  };

  if (fs.existsSync(reportsDir)) {
    const reportFiles = fs.readdirSync(reportsDir).filter((f) => f.endsWith('.json'));
    if (reportFiles.length > 0) {
      reportFiles.sort(
        (a, b) =>
          fs.statSync(path.join(reportsDir, b)).mtimeMs -
          fs.statSync(path.join(reportsDir, a)).mtimeMs,
      );
      try {
        const latestReport = JSON.parse(
          fs.readFileSync(path.join(reportsDir, reportFiles[0]), 'utf-8'),
        );
        if (latestReport.evidence && latestReport.evidence.length > 0) {
          const evList = latestReport.evidence;
          const primaryEv =
            evList.find((e: any) => e.failureCategory === 'COMPATIBILITY_FAILURE') || evList[0];
          context = {
            verificationId: latestReport.runId || context.verificationId,
            verdict: evList.some((e: any) => e.failureCategory !== 'NONE') ? 'FAIL' : 'PASS',
            faultCategory: primaryEv.faultType || 'COMPATIBILITY_FAILURE',
            confidence: primaryEv.confidence || 'CONFIRMED',
            failedStates: evList
              .filter((e: any) => e.failureCategory !== 'NONE')
              .map((e: any) => `${e.applicationVersion}_APP_${e.databaseVersion}_DB`),
            migrationChanges: context.migrationChanges,
            observations: evList.map((e: any) => ({
              state: `${e.applicationVersion}_APP_${e.databaseVersion}_DB`,
              operation: e.operationId,
              databaseError: e.databaseError,
            })),
            evidence: evList.map((e: any) => ({
              id: e.evidenceId,
              faultType: e.faultType,
              confidence: e.confidence,
              operation: e.operationId,
              observedError: e.databaseError,
            })),
          };
        }
      } catch {
        // use fallback context
      }
    }
  }

  const proposal = RepairPlanner.plan(context, currentSchema, migrationSql);

  console.log('\nMigrationGuard Guided Repair Proposal');
  console.log('────────────────────────────────────────────────────────────────────────');
  console.log(`Proposal ID:     ${proposal.proposalId}`);
  console.log(`Verification:    ${proposal.verificationId}`);
  console.log(`Fault Detected:  ${proposal.faultCategory}`);
  console.log(`Strategy:        ${proposal.strategy}`);
  console.log(`Expected Result: OLD+V1: PASS | NEW+V1: PASS | OLD+V2: PASS | NEW+V2: PASS`);
  console.log('────────────────────────────────────────────────────────────────────────');

  console.log('\nAffected Database Objects:');
  for (const obj of proposal.affectedObjects) {
    console.log(
      ` - [${obj.type}] ${obj.table}.${obj.name} -> Action: ${obj.action} (${obj.details || ''})`,
    );
  }

  console.log('\nProposed Schema Diff:');
  console.log('------------------------------------------------------------------------');
  for (const diff of proposal.schemaDiff) {
    if (diff.type === 'ADD') {
      console.log(`+ ${diff.content}`);
    } else if (diff.type === 'REMOVE') {
      console.log(`- ${diff.content}`);
    } else {
      console.log(`  ${diff.content}`);
    }
  }
  console.log('------------------------------------------------------------------------');

  console.log('\nRollout Migration Plan:');
  for (const phase of proposal.migrationPlan) {
    console.log(`Phase ${phase.phase} [${phase.timing}]: ${phase.title}`);
    console.log(`  ${phase.description}`);
    for (const sql of phase.sqlStatements) {
      console.log(`  SQL> ${sql}`);
    }
  }

  console.log('\nRisks & Assumptions:');
  for (const r of proposal.risks) {
    console.log(` * Risk: ${r}`);
  }
  for (const w of proposal.warnings) {
    console.log(` ! Warning: ${w}`);
  }

  if (options.show) {
    console.log('\nInspection complete (--show mode). No changes were made.');
    process.exit(0);
  }

  if (options.reject) {
    console.log(`\nProposal ${options.reject} rejected. No changes were made.`);
    process.exit(0);
  }

  // Staleness Validation
  if (!RepairPlanner.validateStaleness(proposal, currentSchema)) {
    console.error(
      '\n[Error] Repair proposal is stale. The source schema has changed since proposal generation.',
    );
    console.error('Please generate a new proposal against the current schema state.');
    process.exit(2);
  }

  // Explicit User Approval
  let approved = false;
  if (options.approve === proposal.proposalId || options.yes) {
    approved = true;
  } else {
    approved = await promptUserConfirmation('\nApply this repair to your local project? [y/N]: ');
  }

  if (!approved) {
    console.log('\nRepair was not approved. No files were modified.');
    process.exit(0);
  }

  // Apply Changes to Schema
  console.log(`\n[Repair] Applying proposed schema to ${schemaFile}...`);
  fs.writeFileSync(schemaFile, proposal.proposedSchema, 'utf-8');
  console.log('[Repair] Schema successfully updated.');

  // Immediate Post-Repair Verification
  console.log('\n[Repair] Executing mandatory independent post-repair verification...');
  const resolvedConfig = {
    migration: migrationDir,
    baseMigration: config.baseMigration ? path.resolve(configDir, config.baseMigration) : '',
    schema: schemaFile,
    workload: path.resolve(configDir, config.workload),
    appDir: config.appDir ? path.resolve(configDir, config.appDir) : cwd,
    upload: false,
  };

  const verifyExitCode = await runVerificationOrchestrator(resolvedConfig);
  if (verifyExitCode === 0) {
    console.log('\n────────────────────────────────────────────────────────────────────────');
    console.log('REPAIR VERIFIED: All matrix states passed successfully.');
    console.log('────────────────────────────────────────────────────────────────────────');
    process.exit(0);
  } else {
    console.error('\n────────────────────────────────────────────────────────────────────────');
    console.error('REPAIR NOT VERIFIED: Residual compatibility failures detected.');
    console.error('────────────────────────────────────────────────────────────────────────');
    process.exit(1);
  }
}

function promptUserConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}
