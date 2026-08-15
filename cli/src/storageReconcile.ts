/**
 * `migrationguard storage reconcile [--dry-run | --delete]`
 *
 * Reconciles S3/MinIO object storage against the PostgreSQL metadata database.
 * Identifies orphan objects (in storage but no DB row) and missing objects
 * (DB row references a key that no longer exists in storage).
 *
 * Safety rules:
 * - dry-run (default): never deletes anything, only reports.
 * - --delete: explicit flag required for destructive action.
 * - Transient S3 errors never trigger deletion.
 * - Every deletion is logged with the key and reason.
 * - Idempotent: safe to run repeatedly.
 */

import {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

export interface ReconciliationReport {
  totalStorageObjects: number;
  totalDbKeys: number;
  orphanObjects: string[]; // in storage, no DB row
  missingObjects: string[]; // DB row exists, not in storage
  validObjects: number;
  deletedObjects: string[]; // only populated when --delete was run
  storageError: string | null;
  dbError: string | null;
}

function buildS3Client(): S3Client {
  const endpoint = process.env.AWS_ENDPOINT || 'http://localhost:9000';
  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || 'admin';
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || 'admin123';

  return new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

async function listAllStorageKeys(s3: S3Client, bucket: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
      }),
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

async function listAllDbKeys(prisma: PrismaClient): Promise<Set<string>> {
  const [versions, runs] = await Promise.all([
    prisma.presentationVersion.findMany({ select: { storageKey: true } }),
    prisma.verificationRun.findMany({ select: { artifactKey: true } }),
  ]);

  const keys = new Set<string>();
  for (const v of versions) if (v.storageKey) keys.add(v.storageKey);
  for (const r of runs) if (r.artifactKey) keys.add(r.artifactKey);
  return keys;
}

export async function storageReconcileAction(opts: {
  delete: boolean;
  dryRun: boolean;
}): Promise<void> {
  const bucket = process.env.S3_BUCKET || 'migrationguard-prod';
  const apiBase = (process.env.MG_API_URL || 'http://localhost').replace(/\/$/, '');

  const report: ReconciliationReport = {
    totalStorageObjects: 0,
    totalDbKeys: 0,
    orphanObjects: [],
    missingObjects: [],
    validObjects: 0,
    deletedObjects: [],
    storageError: null,
    dbError: null,
  };

  const s3 = buildS3Client();
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  });

  console.log('\n=== MigrationGuard Storage Reconciliation ===');
  console.log(`Mode: ${opts.delete ? 'DELETE' : 'DRY-RUN'}`);
  console.log(`Bucket: ${bucket}`);
  console.log('');

  // 1. Enumerate storage objects
  let storageKeys: string[] = [];
  try {
    storageKeys = await listAllStorageKeys(s3, bucket);
    report.totalStorageObjects = storageKeys.length;
    console.log(`Storage objects found: ${storageKeys.length}`);
  } catch (e: any) {
    report.storageError = `Storage enumeration failed: ${e.message}`;
    console.error(`[ERROR] ${report.storageError}`);
    console.error(
      '[ABORT] Cannot safely reconcile without storage access — no deletions performed.',
    );
    await prisma.$disconnect();
    printReport(report);
    process.exit(3);
  }

  // 2. Enumerate DB-referenced keys
  let dbKeys: Set<string>;
  try {
    dbKeys = await listAllDbKeys(prisma);
    report.totalDbKeys = dbKeys.size;
    console.log(`Database-referenced keys: ${dbKeys.size}`);
  } catch (e: any) {
    report.dbError = `Database enumeration failed: ${e.message}`;
    console.error(`[ERROR] ${report.dbError}`);
    console.error(
      '[ABORT] Cannot safely reconcile without database access — no deletions performed.',
    );
    await prisma.$disconnect();
    printReport(report);
    process.exit(3);
  }

  // 3. Identify orphans: storage keys with no DB reference
  const storageKeySet = new Set(storageKeys);
  for (const key of storageKeys) {
    if (!dbKeys.has(key)) {
      report.orphanObjects.push(key);
    }
  }

  // 4. Identify missing: DB keys not found in storage
  for (const key of dbKeys) {
    if (!storageKeySet.has(key)) {
      report.missingObjects.push(key);
    }
  }

  report.validObjects = storageKeys.length - report.orphanObjects.length;

  console.log(`\nOrphan objects (storage, no DB row): ${report.orphanObjects.length}`);
  for (const key of report.orphanObjects) {
    console.log(`  ORPHAN  ${key}`);
  }

  console.log(`Missing objects (DB row, not in storage): ${report.missingObjects.length}`);
  for (const key of report.missingObjects) {
    console.log(`  MISSING ${key}`);
  }

  console.log(`Valid objects: ${report.validObjects}`);

  // 5. Delete orphans if --delete was explicitly passed
  if (opts.delete && report.orphanObjects.length > 0) {
    console.log('\n[DELETE] Removing orphan objects...');
    for (const key of report.orphanObjects) {
      try {
        // Re-check that the key truly isn't in the DB (guard against race)
        const fresh = await listAllDbKeys(prisma);
        if (fresh.has(key)) {
          console.log(`  SKIP (now referenced in DB): ${key}`);
          continue;
        }
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        report.deletedObjects.push(key);
        console.log(`  DELETED ${key}`);
      } catch (e: any) {
        console.error(`  FAILED to delete ${key}: ${e.message}`);
      }
    }
  } else if (opts.dryRun && report.orphanObjects.length > 0) {
    console.log(
      `\n[DRY-RUN] ${report.orphanObjects.length} orphan(s) would be deleted with --delete.`,
    );
  }

  await prisma.$disconnect();
  printReport(report);

  // Exit 1 if any orphans or missing objects found (non-zero for scripting)
  if (report.orphanObjects.length > 0 || report.missingObjects.length > 0) {
    process.exit(1);
  }
  process.exit(0);
}

function printReport(report: ReconciliationReport): void {
  console.log('\n--- Reconciliation Report ---');
  console.log(`  Total storage objects : ${report.totalStorageObjects}`);
  console.log(`  Total DB-referenced   : ${report.totalDbKeys}`);
  console.log(`  Orphan objects        : ${report.orphanObjects.length}`);
  console.log(`  Missing objects       : ${report.missingObjects.length}`);
  console.log(`  Valid objects         : ${report.validObjects}`);
  console.log(`  Deleted this run      : ${report.deletedObjects.length}`);
  if (report.storageError) console.log(`  Storage error         : ${report.storageError}`);
  if (report.dbError) console.log(`  DB error              : ${report.dbError}`);
}
