#!/usr/bin/env node
import { Command } from 'commander';
import { verifyCommand } from './verifyCommand.js';
import { benchmarkCommandAction } from './benchmark.js';
import { storageReconcileAction } from './storageReconcile.js';
import { evidenceVerifyAction } from './evidenceVerify.js';
import * as path from 'path';

const program = new Command();

program.name('migrationguard').description('MigrationGuard CLI').version('0.1.0');

// ── verify ────────────────────────────────────────────────────────────────────
program
  .command('verify')
  .description('Verify a migration against an application workload')
  .option('-c, --config <path>', 'Path to JSON configuration file')
  .option('-w, --workload <path>', 'Path to workload JSON file (overrides config)')
  .option('-m, --migration <path>', 'Path to migration directory (overrides config)')
  .option('-s, --schema <path>', 'Path to Prisma schema (overrides config)')
  .option('-a, --app-dir <path>', 'Path to application root directory (overrides config)')
  .option('--upload', 'Upload results to MigrationGuard hosted service (requires MG_API_TOKEN)')
  .action(async (options) => {
    try {
      await verifyCommand(options, process.cwd());
    } catch (e: any) {
      console.error('Fatal CLI Error:', e.message || e);
      process.exit(4); // UNKNOWN_FAILURE
    }
  });

// ── benchmark ─────────────────────────────────────────────────────────────────
program
  .command('benchmark')
  .description('Run the MigrationGuard benchmark suite')
  .option('--filter <testId>', 'Run a specific benchmark test by ID or repository name')
  .action(async (options) => {
    try {
      let repoRoot = process.cwd();
      if (repoRoot.endsWith('cli')) {
        repoRoot = path.resolve(repoRoot, '../');
      }
      await benchmarkCommandAction(repoRoot, options.filter);
    } catch (e: any) {
      console.error('Fatal CLI Error:', e.message || e);
      process.exit(4);
    }
  });

// ── storage ───────────────────────────────────────────────────────────────────
const storageCmd = program.command('storage').description('Object storage management commands');

storageCmd
  .command('reconcile')
  .description('Reconcile S3/MinIO object storage against the database')
  .option('--dry-run', 'Report orphans without deleting anything (default if no flag given)', false)
  .option('--delete', 'Delete orphan objects found in storage with no database reference', false)
  .action(async (options) => {
    try {
      const doDelete = Boolean(options.delete);
      const dryRun = !doDelete;
      await storageReconcileAction({ delete: doDelete, dryRun });
    } catch (e: any) {
      console.error('Fatal CLI Error:', e.message || e);
      process.exit(4);
    }
  });

// ── evidence ──────────────────────────────────────────────────────────────────
const evidenceCmd = program
  .command('evidence')
  .description('Evidence artifact management commands');

evidenceCmd
  .command('verify <run-id>')
  .description('Verify the SHA-256 integrity of an uploaded evidence artifact')
  .action(async (runId) => {
    try {
      await evidenceVerifyAction(runId);
    } catch (e: any) {
      console.error('Fatal CLI Error:', e.message || e);
      process.exit(4);
    }
  });

program.parse();
