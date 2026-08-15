#!/bin/sh
# Docker startup: create bucket + migrate + seed default users + start server
set -e

cd /app

# Run Prisma migrations via the JS entry point directly
node node_modules/prisma/build/index.js migrate deploy --schema apps/server/prisma/schema.prisma

# Create S3 bucket if it doesn't exist (idempotent)
node << 'EOF'
const { S3Client, CreateBucketCommand, HeadBucketCommand } = require('/app/node_modules/@aws-sdk/client-s3');
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin_password',
  },
  endpoint: process.env.AWS_ENDPOINT || 'http://localhost:9000',
  forcePathStyle: true,
});
const bucket = process.env.S3_BUCKET || 'migrationguard-storage';

async function ensureBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log('[startup] Bucket exists:', bucket);
  } catch (e) {
    if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404 || e.Code === 'NoSuchBucket') {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
      console.log('[startup] Bucket created:', bucket);
    } else {
      console.log('[startup] Bucket check:', e.message);
    }
  }
}
ensureBucket().catch(e => console.error('[startup] Bucket error (non-fatal):', e.message));
EOF

# Seed default admin and reviewer users (upsert — idempotent)
node << 'EOF'
const { PrismaClient } = require('/app/node_modules/@prisma/client');
const argon2 = require('/app/node_modules/argon2');
const p = new PrismaClient();

async function seed() {
  const adminHash = await argon2.hash('admin123!');
  const reviewerHash = await argon2.hash('reviewer123!');

  await p.user.upsert({
    where: { email: 'admin@migrationguard.dev' },
    update: {},
    create: { email: 'admin@migrationguard.dev', passwordHash: adminHash, role: 'ADMIN' },
  });

  await p.user.upsert({
    where: { email: 'reviewer@migrationguard.dev' },
    update: {},
    create: { email: 'reviewer@migrationguard.dev', passwordHash: reviewerHash, role: 'REVIEWER' },
  });

  console.log('[startup] Users seeded');
  await p.$disconnect();
}

seed().catch(e => {
  console.error('[startup] Seed error:', e.message);
  process.exit(1);
});
EOF

exec node /app/apps/server/dist/server.js
