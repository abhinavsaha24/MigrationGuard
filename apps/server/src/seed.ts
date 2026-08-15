import { prisma } from './config/prisma.js';
import * as argon2 from 'argon2';

async function main() {
  const adminPassword = await argon2.hash('admin123!');
  await prisma.user.upsert({
    where: { email: 'admin@migrationguard.dev' },
    update: {},
    create: {
      email: 'admin@migrationguard.dev',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });

  const reviewerPassword = await argon2.hash('reviewer123!');
  await prisma.user.upsert({
    where: { email: 'reviewer@migrationguard.dev' },
    update: {},
    create: {
      email: 'reviewer@migrationguard.dev',
      passwordHash: reviewerPassword,
      role: 'REVIEWER',
    },
  });

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
