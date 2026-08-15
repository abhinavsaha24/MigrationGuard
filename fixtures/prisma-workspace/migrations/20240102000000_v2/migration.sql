ALTER TABLE "users" ADD COLUMN "full_name" TEXT NOT NULL DEFAULT 'Unknown';
UPDATE "users" SET "full_name" = "name";
ALTER TABLE "users" DROP COLUMN "name";
