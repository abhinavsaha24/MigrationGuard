INSERT INTO "User" ("email", "name") VALUES ('alice@prisma.io', 'Alice');
INSERT INTO "User" ("email", "name") VALUES ('bob@prisma.io', 'Bob');
INSERT INTO "Post" ("title", "content", "published", "viewCount", "authorId", "createdAt", "updatedAt") VALUES ('Hello World', 'This is a test post', true, 10, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
