/**
 * `migrationguard evidence verify <run-id>`
 *
 * Retrieves a verification run's artifact from storage, computes its SHA-256,
 * and compares it against the stored hash in the database.
 *
 * Reports MATCH or MISMATCH. Exits 1 on MISMATCH or missing artifact.
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';

function buildS3Client(): S3Client {
  return new S3Client({
    endpoint: process.env.AWS_ENDPOINT || 'http://localhost:9000',
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'admin',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'admin123',
    },
    forcePathStyle: true,
  });
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function evidenceVerifyAction(runId: string): Promise<void> {
  const apiBase = (process.env.MG_API_URL || 'http://localhost').replace(/\/$/, '');
  const bucket = process.env.S3_BUCKET || 'migrationguard-prod';
  const token = process.env.MG_API_TOKEN;

  console.log(`\n=== MigrationGuard Evidence Verification ===`);
  console.log(`Run ID: ${runId}`);
  console.log('');

  if (!token) {
    console.error('[ERROR] MG_API_TOKEN environment variable is required for evidence verify.');
    process.exit(2);
  }

  // 1. Retrieve run metadata from API
  let run: any;
  try {
    const res = await fetch(`${apiBase}/api/runs/${runId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) {
      console.error(`[ERROR] Run not found: ${runId}`);
      process.exit(2);
    }
    if (!res.ok) {
      console.error(`[ERROR] Failed to fetch run metadata: HTTP ${res.status}`);
      process.exit(3);
    }
    run = await res.json();
  } catch (e: any) {
    console.error(`[ERROR] Failed to connect to API at ${apiBase}: ${e.message}`);
    process.exit(3);
  }

  const storedHash: string | null = run.artifactHash ?? null;
  const storedKey: string | null = run.artifactKey ?? null;

  console.log(`Artifact key   : ${storedKey ?? '(none)'}`);
  console.log(`Stored hash    : ${storedHash ?? '(none)'}`);

  if (!storedKey || !storedHash) {
    console.log('\nResult: NO_ARTIFACT');
    console.log('This run has no artifact attached — nothing to verify.');
    process.exit(0);
  }

  // 2. Download artifact from storage
  const s3 = buildS3Client();
  let artifactBuffer: Buffer;
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: storedKey }));
    if (!res.Body) throw new Error('Empty response body from S3');
    artifactBuffer = await streamToBuffer(res.Body as NodeJS.ReadableStream);
  } catch (e: any) {
    console.error(`[ERROR] Failed to retrieve artifact from storage: ${e.message}`);
    process.exit(3);
  }

  // 3. Compute SHA-256 of downloaded bytes
  const actualHash = createHash('sha256').update(artifactBuffer).digest('hex');
  const actualSize = artifactBuffer.length;

  console.log(`\nActual hash    : ${actualHash}`);
  console.log(`Actual size    : ${actualSize} bytes`);

  // 4. Compare
  const hashMatch = actualHash === storedHash;

  console.log('\n--- Verification Result ---');
  console.log(`Expected hash  : ${storedHash}`);
  console.log(`Actual hash    : ${actualHash}`);
  console.log(`Hash match     : ${hashMatch ? 'YES' : 'NO'}`);

  if (hashMatch) {
    console.log('\nResult: MATCH — artifact integrity verified.');
    process.exit(0);
  } else {
    console.error('\nResult: MISMATCH — artifact hash does not match stored value.');
    console.error('The artifact may have been corrupted or tampered with.');
    process.exit(1);
  }
}
