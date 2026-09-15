import { prisma } from './config/prisma.js';
import * as argon2 from 'argon2';

async function main() {
  const adminPasswordRaw =
    process.env.INITIAL_ADMIN_PASSWORD ||
    (process.env.NODE_ENV !== 'production' ? 'dev_admin_temp_only' : undefined);
  if (!adminPasswordRaw) {
    throw new Error(
      'INITIAL_ADMIN_PASSWORD environment variable is required to seed users in production.',
    );
  }

  const adminPassword = await argon2.hash(adminPasswordRaw);
  await prisma.user.upsert({
    where: { email: 'admin@migrationguard.dev' },
    update: {},
    create: {
      email: 'admin@migrationguard.dev',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });

  const reviewerPasswordRaw =
    process.env.INITIAL_REVIEWER_PASSWORD ||
    (process.env.NODE_ENV !== 'production' ? 'dev_reviewer_temp_only' : undefined);
  if (reviewerPasswordRaw) {
    const reviewerPassword = await argon2.hash(reviewerPasswordRaw);
    await prisma.user.upsert({
      where: { email: 'reviewer@migrationguard.dev' },
      update: {},
      create: {
        email: 'reviewer@migrationguard.dev',
        passwordHash: reviewerPassword,
        role: 'REVIEWER',
      },
    });
  }

  console.log('Seed data created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
