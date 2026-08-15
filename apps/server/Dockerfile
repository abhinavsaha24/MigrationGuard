# Production Stage — uses Debian slim which ships OpenSSL required by Prisma
FROM node:20-slim

# Install OpenSSL (Prisma) and build tools (needed to compile argon2 native binding)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests
COPY package*.json ./
COPY apps/server/package*.json ./apps/server/

# Copy pre-compiled dist (built on host via tsc -b)
COPY apps/server/dist ./apps/server/dist

# Copy Prisma schema for client generation
COPY apps/server/prisma ./apps/server/prisma

# Install dependencies natively inside Linux instead of copying from Windows host
RUN npm ci --omit=dev
RUN cd apps/server && npm ci --omit=dev

# Re-install argon2 inside Linux to compile the correct native binary
# (The Windows-compiled binary copied from the host does not work on Linux)
RUN cd apps/server && npm rebuild argon2

# Re-generate Prisma Client for linux-x64-openssl (correct native binary)
RUN cd apps/server && npx prisma generate

# Copy startup entrypoint (migrate + seed + start)
COPY apps/server/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000
CMD ["/bin/sh", "/app/docker-entrypoint.sh"]
