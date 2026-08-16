import { execSync } from 'child_process';
import * as crypto from 'crypto';

const apiBase = 'http://localhost';
let adminToken = '';
let testRunId = '';

async function login() {
  const res = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@migrationguard.dev', password: 'admin123!' }),
  });
  if (!res.ok) throw new Error('Failed to login');
  const data = await res.json();
  adminToken = data.token;
}

async function createRun() {
  const payload = {
    runId: `MG-VERIFY-${Date.now()}`,
    migrationName: '20240102000000_v2',
    status: 'PASS',
    durationMs: 1000,
    artifactKey: null,
    artifactHash: null,
    compatibility: [],
    evidence: [],
  };

  // Upload an artifact first
  const buffer = Buffer.from('This is a test evidence artifact');
  const blob = new Blob([buffer], { type: 'application/json' });
  const form = new FormData();
  form.set('file', blob, 'reports.json');

  const artRes = await fetch(`${apiBase}/api/runs/artifact`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: form,
  });
  if (!artRes.ok) throw new Error('Failed to upload artifact');
  const artData = await artRes.json();

  payload.artifactKey = artData.artifactKey;
  payload.artifactHash = artData.artifactHash;
  testRunId = payload.runId;

  const res = await fetch(`${apiBase}/api/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create run');
}

async function runTest() {
  console.log('--- Evidence Verify Test ---');
  await login();
  await createRun();

  console.log(`\n1. Testing VALID artifact verification (Run ID: ${testRunId})...`);
  try {
    execSync(`node cli/dist/index.js evidence verify ${testRunId}`, {
      stdio: 'inherit',
      env: {
        ...process.env,
        MG_API_URL: 'http://localhost',
        MG_API_TOKEN: adminToken,
        AWS_ENDPOINT: 'http://127.0.0.1:9002',
        AWS_ACCESS_KEY_ID: 'admin',
        AWS_SECRET_ACCESS_KEY: 'admin123',
        S3_BUCKET: 'migrationguard-prod',
      },
    });
    console.log('SUCCESS: Valid artifact verified.');
  } catch (e) {
    console.error('FAIL: Valid artifact verification failed.');
    process.exit(1);
  }

  // To test a corrupted artifact, we need to alter it in MinIO.
  // Let's use the DB to just corrupt the expected hash so we simulate a MISMATCH.
  console.log(`\n2. Testing CORRUPTED artifact (simulating MISMATCH by altering DB hash)...`);
  execSync(
    `echo UPDATE "VerificationRun" SET "artifactHash" = 'badhash123' WHERE "id" = '${testRunId}'; | docker compose -f docker-compose.prod.yml exec -T backend npx prisma db execute --schema apps/server/prisma/schema.prisma --stdin`,
    { stdio: 'pipe' },
  );

  try {
    execSync(`node cli/dist/index.js evidence verify ${testRunId}`, {
      stdio: 'pipe',
      env: {
        ...process.env,
        MG_API_URL: 'http://localhost',
        MG_API_TOKEN: adminToken,
        AWS_ENDPOINT: 'http://127.0.0.1:9002',
        AWS_ACCESS_KEY_ID: 'admin',
        AWS_SECRET_ACCESS_KEY: 'admin123',
        S3_BUCKET: 'migrationguard-prod',
      },
    });
    console.error('FAIL: Verification succeeded but it should have failed due to mismatch.');
    process.exit(1);
  } catch (e) {
    console.log('SUCCESS: Mismatch correctly detected and exited with non-zero.');
  }

  // CLEANUP: Remove the test run so it doesn't pollute the dashboard
  console.log(`\n3. Cleaning up test data...`);
  execSync(
    `echo DELETE FROM \\"VerificationRun\\" WHERE \\"id\\" = '${testRunId}'; | docker compose -f docker-compose.prod.yml exec -T backend npx prisma db execute --schema apps/server/prisma/schema.prisma --stdin`,
    { stdio: 'pipe' },
  );
  console.log('SUCCESS: Test data cleaned up.');
}

runTest().catch((e) => {
  console.error(e);
  process.exit(1);
});
