# MigrationGuard — Developer Runbook

Complete instructions for a developer to go from zero to a fully running MigrationGuard system.

---

## What Is MigrationGuard?

MigrationGuard is a database migration safety tool. Given a Prisma migration, it:

1. Spins up ephemeral PostgreSQL sandboxes in Docker containers.
2. Runs a **2×2 compatibility matrix** — old and new application versions against old (V1) and new (V2) database schemas.
3. Replays an HTTP workload against each combination.
4. Captures PostgreSQL telemetry and classifies any failures (e.g. COLUMN_REMOVAL, DESTRUCTIVE_RENAME, NOT_NULL_INCOMPATIBILITY).
5. Generates an evidence report (JSON + Markdown) with a deterministic evidenceId.
6. Optionally uploads results to the hosted backend API.

---

## Package Dependency Graph

`
core           (no internal deps)
sandbox        (no internal deps — Docker via child_process)
evidence       (no internal deps)
workload       (no internal deps)
mutation-engine (no internal deps)
migration-engine (no internal deps — Prisma via execSync)

matrix-engine   <- sandbox, migration-engine, application-runner, workload
compatibility   <- workload, evidence, matrix-engine
benchmark-runner <- core, sandbox, matrix-engine, evidence, compatibility
cli             <- sandbox, migration-engine, application-runner, compatibility,
                  workload, matrix-engine, evidence, benchmark-runner
poc-app         (standalone Prisma demo app — old.ts and new.ts versions)
server          (Fastify API backend — separate from the CLI pipeline)
frontend        (React/Vite dashboard — reads from server API)
`

Build order (as declared in root tsconfig.json references):

    core -> sandbox -> evidence -> migration-engine -> mutation-engine ->
    application-runner -> workload -> matrix-engine -> compatibility ->
    benchmark-runner -> poc-app -> cli

---

## Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+ (comes with Node 20)
- Docker 24+ (MUST be running — the sandbox spawns postgres:15 containers)
- Git

Docker is NOT optional for tests or running verification.

Verify:

    node --version     # v20.x.x or higher
    npm --version      # 10.x.x or higher
    docker info        # Should succeed and show Server Version

---

## 1. Clone and Install

    git clone https://github.com/abhinavsaha24/MigrationGuard.git
    cd MigrationGuard
    npm ci

Do NOT use npm install on CI or EC2 — use npm ci to ensure lockfile versions.

---

## 2. Environment Variables

### CLI / Engine (no .env required for basic use)

No env vars needed for local CLI unless:
- Uploading results: set MG_API_TOKEN and MG_API_URL
- On EC2: set SANDBOX_HOST=host.docker.internal (lets sandbox containers reach the host)

### Server / Backend

    cp .env.example .env
    # Edit .env with your values

Required variables (server):

- DATABASE_URL      — PostgreSQL connection string for server's own DB
- JWT_SECRET        — Strong random secret for JWT signing
- FRONTEND_ORIGIN   — CORS allowed origin
- S3_BUCKET         — S3/MinIO bucket name
- AWS_REGION        — AWS region (us-east-1 for MinIO)
- AWS_ENDPOINT      — MinIO: http://localhost:9000
- AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY — MinIO credentials
- SANDBOX_HOST      — EC2 only: host.docker.internal
- MG_API_URL / MG_API_TOKEN — CLI upload target

---

## 3. Prisma Generation (included in build, but can run manually)

    npm run generate --workspace=@migrationguard/poc-app

Generates:
- node_modules/@prisma/client-v1  (from fixtures/prisma/schema-v1.prisma)
- node_modules/@prisma/client-v2  (from fixtures/prisma/schema-v2.prisma)

---

## 4. Build

    npm run build

Runs:
1. npm run generate --workspace=@migrationguard/poc-app
2. tsc -b (builds all packages in dependency order)

After building, these must all exist:

    packages/core/dist/index.js
    packages/sandbox/dist/index.js
    packages/evidence/dist/index.js
    packages/workload/dist/index.js
    packages/migration-engine/dist/index.js
    packages/mutation-engine/dist/index.js
    packages/application-runner/dist/index.js
    packages/matrix-engine/dist/index.js
    packages/compatibility/dist/index.js
    packages/benchmark-runner/dist/index.js
    apps/poc-app/dist/old.js
    apps/poc-app/dist/new.js
    cli/dist/index.js

### Build fails or dist/ is empty?

Most common cause: stale tsconfig.tsbuildinfo files.

    find . -name '*.tsbuildinfo' -not -path '*/node_modules/*' -delete
    npm run build

(Fixed in commit af1b0c5 — *.tsbuildinfo is now in .gitignore.)

---

## 5. Tests

    npm run test

### Suites

Suite                                Requires Docker  Description
@migrationguard/compatibility        No               Fault classification, causal analysis
@migrationguard/matrix-engine        No               Matrix execution with mocked runners
@migrationguard/workload             No               Workload loader and replay engine
@migrationguard/server               No               Fastify API endpoint tests
@migrationguard/sandbox              YES              PostgreSQL sandbox lifecycle
@migrationguard/migration-engine     YES              Prisma migration apply/seed
@migrationguard/application-runner   YES              App process lifecycle
@migrationguard/cli verify.test.ts   YES              Full E2E verification run
@migrationguard/cli provenance.test  No               Evidence ID determinism

Without Docker: 34 tests pass.
With Docker running: all 40+ tests pass.

---

## 6. CLI Usage

### Basic Verification

    node cli/dist/index.js verify \
      --app-dir <path-to-application-repo> \
      --migration <path-to-v2-migration-directory> \
      --schema <path-to-prisma-schema.prisma> \
      --workload <path-to-workload.json>

Run built-in M1 regression fixture:

    npm run verify

### Exit Codes

0 = Compatible (all 4 matrix quadrants pass)
1 = Incompatibility detected (expected for M1 fixture)
2 = Configuration error
3 = Infrastructure failure (Docker unavailable, Prisma error)
4 = Unknown failure

### Benchmark

    npm run benchmark

### Storage Reconcile

    node cli/dist/index.js storage reconcile
    node cli/dist/index.js storage reconcile --delete

### Evidence Integrity

    node cli/dist/index.js evidence verify <run-id>

---

## 7. End-to-End Workflow (what happens during verify)

1. CLI loads workload JSON
2. PostgresSandbox.start() — docker run -d postgres:15 on a random free port
3. MigrationEngine.prepareWorkspace() — temp dir with schema.prisma
4. MigrationEngine.applyMigration(v1) — npx prisma migrate deploy (schema-v1)
5. ApplicationRunner('OLD').start(dbUrl) — spawns apps/poc-app/dist/old.js
6. WorkloadReplayEngine.replay() — HTTP replay against old app + v1 db
7. runner.stop(), applyMigration(v2) — upgrade to schema-v2
8. Replay old app + v2 db — WORKLOAD_FAILURE detected
9. Replay new app + v1 db — forward-compat failure (expected, not counted as unsafe)
10. Replay new app + v2 db — should pass
11. CompatibilityAnalyzer.analyze() classifies each quadrant
12. generateReport() writes reports/<runId>.json and reports/<runId>.md
13. CLI exits with code 1 (incompatibility found for M1 fixture)

---

## 8. Production Deployment on EC2

### EC2 Prerequisites

    # Node.js 20
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo yum install -y nodejs

    # Docker
    sudo yum install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker ec2-user
    # Re-login so group change takes effect

    # Verify
    node --version
    docker info

### Fresh Deploy

    git clone https://github.com/abhinavsaha24/MigrationGuard.git
    cd MigrationGuard
    npm ci
    npm run build

    # Verify critical dist files exist:
    ls packages/sandbox/dist/index.js
    ls packages/matrix-engine/dist/engine.js
    ls cli/dist/index.js

### Update on EC2

    cd ~/MigrationGuard
    git pull
    npm ci
    npm run build

### Full Stack (Docker Compose)

    cp .env.example .env
    # Edit .env — fill DATABASE_URL, JWT_SECRET, FRONTEND_ORIGIN, etc.

    docker compose -f docker-compose.prod.yml up -d
    docker compose -f docker-compose.prod.yml ps
    docker logs migrationguard-backend-1

---

## 9. Troubleshooting

### "Cannot find module '@migrationguard/sandbox'" or empty dist/

Stale *.tsbuildinfo files. Fix:

    find . -name '*.tsbuildinfo' -not -path '*/node_modules/*' -delete
    npm run build

### "Failed to start docker container: failed to connect to the docker API"

Docker not running:

    docker info
    sudo systemctl start docker
    sudo usermod -aG docker 
    newgrp docker

### "Expected verify script to exit with code 1, but got 4"

Docker required for CLI E2E test. Start Docker and retry.

### Port conflicts / leftover containers

    docker ps -a --filter name=mg- --format '{{.Names}}' | xargs docker rm -f

### Prisma "command not found"

Use npx, not global prisma:

    npm run generate --workspace=@migrationguard/poc-app

---

## 10. Daily Development Commands

    npm run test                 # Fast tests (no Docker needed)
    npm run build                # Build everything
    npm run lint                 # Lint check
    npm run format               # Auto-format
    npm run verify               # CLI E2E (needs Docker)
    npm run benchmark            # Full benchmark suite (needs Docker)

### Safe Clean Rebuild

    npx tsc -b --clean
    find . -name '*.tsbuildinfo' -not -path '*/node_modules/*' -delete
    npm run build

---

## 11. Architecture Overview

    CLI (verify/benchmark)
      |
      +-- PostgresSandbox      <- docker run postgres:15
      +-- MigrationEngine      <- npx prisma migrate deploy
      +-- ApplicationRunner    <- node poc-app/dist/{old,new}.js
      +-- WorkloadReplayEngine <- HTTP fetch replay
      +-- CompatibilityMatrix  <- 2x2 execution engine
      +-- CompatibilityAnalyzer <- fault classification
      +-- EvidenceBuilder      <- deterministic SHA-256 report

    Server (Fastify API)       <- Stores and serves run history
    Frontend (React/Vite)      <- Dashboard UI

---

## 12. Security Notes

- WorkloadReplayEngine restricts all HTTP requests to localhost only.
- JWT_SECRET must be a strong random value in production.
- .env is gitignored — never commit secrets.
- Docker socket is mounted into the backend container (required for sibling sandbox containers).
