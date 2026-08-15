import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://mg_user:mg_password@localhost:5432/migrationguard_prod?schema=public',
    },
  },
});
const s3 = new S3Client({
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  credentials: { accessKeyId: 'minioadmin', secretAccessKey: 'minioadmin_password' },
  forcePathStyle: true,
});

async function runTest() {
  console.log('--- Storage Reconcile Test ---');

  const orphanKey = `orphan-${Date.now()}.bin`;

  console.log(`\n1. Creating an ORPHAN object in S3 without a DB row (${orphanKey})...`);
  await s3.send(
    new PutObjectCommand({
      Bucket: 'migrationguard-storage',
      Key: orphanKey,
      Body: Buffer.from('Orphan object'),
    }),
  );

  console.log('\n2. Running reconciliation DRY RUN...');
  try {
    execSync('node cli/dist/index.js storage reconcile --dry-run', {
      stdio: 'inherit',
      env: {
        ...process.env,
        AWS_ACCESS_KEY_ID: 'minioadmin',
        AWS_SECRET_ACCESS_KEY: 'minioadmin_password',
        S3_BUCKET: 'migrationguard-storage',
      },
    });
    console.error('FAIL: Dry run should have exited 1 due to orphan object.');
    process.exit(1);
  } catch (e) {
    console.log('SUCCESS: Dry run detected orphan and exited 1.');
  }

  console.log('\n3. Running reconciliation DELETE...');
  try {
    execSync('node cli/dist/index.js storage reconcile --delete', {
      stdio: 'inherit',
      env: {
        ...process.env,
        AWS_ACCESS_KEY_ID: 'minioadmin',
        AWS_SECRET_ACCESS_KEY: 'minioadmin_password',
        S3_BUCKET: 'migrationguard-storage',
      },
    });
    console.error(
      'FAIL: Delete should also exit 1 if an orphan was found and deleted (returns non-zero for scripting).',
    );
    process.exit(1);
  } catch (e) {
    console.log('SUCCESS: Delete removed orphan and exited 1.');
  }

  console.log('\n4. Running reconciliation again to ensure it is clean...');
  try {
    // If it's clean, it should exit 0
    execSync('node cli/dist/index.js storage reconcile --dry-run', {
      stdio: 'inherit',
      env: {
        ...process.env,
        AWS_ACCESS_KEY_ID: 'minioadmin',
        AWS_SECRET_ACCESS_KEY: 'minioadmin_password',
        S3_BUCKET: 'migrationguard-storage',
      },
    });
    console.log('SUCCESS: Reconciliation clean. Exited 0.');
  } catch (e) {
    console.error('FAIL: Should be clean but exited 1.');
    process.exit(1);
  }
}

runTest()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
