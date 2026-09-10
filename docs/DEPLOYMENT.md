# MigrationGuard Deployment Guide

This document outlines the deployment configuration for moving MigrationGuard into production using a hybrid architecture: GitHub Pages for the frontend and AWS for the backend (API, PostgreSQL, S3, Docker).

```text
MigrationGuard
      │
      ├── GitHub Repository
      │       └── GitHub Actions
      │               └── Frontend → GitHub Pages
      │
      └── AWS
              ├── Backend
              │     └── Docker
              │           └── PostgresSandbox
              ├── PostgreSQL / RDS
              └── S3 Evidence Storage
```

## 1. Frontend — GitHub Pages Deployment

The frontend is a pure React SPA compiled by Vite. It is deployed statically to GitHub Pages.

### Configuration

1. **Router**: We use `HashRouter` (React Router) to ensure deep links and page refreshes work correctly without a server-side rewrite rule (which GitHub Pages does not support natively for SPAs).
2. **Base Path**: The `vite.config.ts` accepts a `VITE_BASE_PATH` environment variable. If deploying to `https://<org>.github.io/<repo>/`, set `VITE_BASE_PATH=/<repo>/`.
3. **API URL**: Set `VITE_API_URL` to point to the AWS backend domain (e.g., `https://api.yourdomain.com`).

### Build & Deploy

```bash
cd apps/frontend
export VITE_BASE_PATH=/MigrationGuard/
export VITE_API_URL=https://api.yourdomain.com
npm run build
```

Deploy the resulting `dist/` directory to the `gh-pages` branch.

## 2. Backend — AWS Deployment

The backend requires Fastify (Node.js), PostgreSQL, Docker, and AWS S3. It is recommended to deploy using Docker Compose on an EC2 instance, ECS, or equivalent container service that grants access to the Docker daemon.

### AWS S3 Storage

The application stores deterministic Evidence records in S3.

- Create an S3 Bucket (e.g., `migrationguard-prod-evidence`).
- IAM Permissions: Assign an IAM role to the EC2 instance/ECS task with `s3:PutObject` and `s3:GetObject` on the bucket.
- Because `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are optional in the config, the AWS SDK will seamlessly assume the IAM Role. Do **not** hardcode credentials.

### Environment Variables

Set the following variables in your deployment environment (or a securely managed `.env` file):

```env
# Database
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_secure_db_password
POSTGRES_DB=migrationguard_prod
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public

# AWS S3 (IAM role assumed automatically)
S3_BUCKET=migrationguard-prod-evidence
AWS_REGION=us-east-1
# AWS_ENDPOINT is omitted in AWS production to use default S3 URLs.

# Security
JWT_SECRET=generate-a-strong-random-64-char-string
FRONTEND_ORIGIN=https://<org>.github.io

# Docker access is implicit via socket mount
```

### Docker Compose

Run the stack using the provided `docker-compose.prod.yml`:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

_Note: The backend mounts `/var/run/docker.sock` to dynamically provision `PostgresSandbox` containers during test execution._

### Database Migrations

**Never** use `prisma migrate dev` in production.
Instead, execute the deployment migration command against the production database:

```bash
# Executed within the backend container or via CI/CD
npx prisma migrate deploy
```

### Health Checks

The backend exposes a health check endpoint:

```http
GET /api/health
```

Docker Compose automatically monitors this endpoint (`http://localhost:3000/api/health`) to manage container readiness.

## 3. Rollback Procedure

If a backend deployment fails:

1. Revert the application container image tag to the previous stable release.
2. If database schema was modified, restore from the automated snapshot (Prisma migrations are strictly applied forward; rollbacks require restoring state or applying a forward-fix migration).
3. Evidence artifacts stored in S3 are immutable and unaffected by application rollbacks.
