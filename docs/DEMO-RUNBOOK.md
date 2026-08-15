# MigrationGuard Final Demonstration Runbook

## Deployment Status

**LOCAL_PRODUCTION_SIMULATION**

## 1. Prerequisites

- Docker & Docker Compose
- Node.js (v20+)
- Tested on Windows/Linux environments

## 2. Clean Startup

Ensure a clean state before demonstration:

```bash
docker compose -f docker-compose.prod.yml down -v --remove-orphans
docker compose -f docker-compose.prod.yml up -d --build
```

## 3. Local URLs

- **Frontend / Application:** `http://localhost:80`
- **Backend API:** `http://localhost:3000/api`
- **Storage Console (MinIO):** `http://localhost:9001` (Do not expose publicly)

## 4. Demo Credentials Policy

- **Admin:** `admin@migrationguard.dev` / `admin123!`
- **Reviewer:** `reviewer@migrationguard.dev` / `reviewer123!`

## 5. Workflows

### Admin Walkthrough

1. Navigate to Frontend URL.
2. Login as Admin.
3. Access Dashboard.
4. Create a Presentation.
5. Upload Version 1 and Publish.
6. Upload Version 2 and Publish.
7. Verify Version 1 remains preserved in history.

### Reviewer Walkthrough

1. Login as Reviewer.
2. Access the Runs Dashboard.
3. Open a Verification Run.
4. Verify the Compatibility Matrix and Evidence JSON/Markdown.
5. Submit an `ACCEPTED` decision.
6. Verify Reviewer cannot perform Admin-only actions (e.g., publishing presentations).

### MigrationGuard Verification Walkthrough

Execute the verification engine against the predefined matrix:

```bash
npm run verify
```

Expected output is an intentional exit code `1` (Verification Failure) demonstrating the engine's ability to detect the `DESTRUCTIVE_RENAME` fault in `NEW + V1` and `OLD + V2` configurations.

### Evidence Walkthrough

1. Run `npx migrationguard evidence verify <run-id>`
2. The engine will hash the locally retrieved evidence artifact and compare it against the cryptographic hash stored during the verification run.
3. Expected result: `Artifact valid. Hash matches exactly.`

### Benchmark Walkthrough

Execute the benchmark evaluation:

```bash
npm run benchmark
```

Expected output:

- **MigrationGuard:** Precision 1.00, Recall 1.00, F1 1.00
- **Atlas:** Precision 0.50, Recall 1.00, F1 0.67
  _(Note: n=4 limitation. This is a controlled research benchmark and not a generalized claim of 100% accuracy in production environments.)_

### Storage Reconciliation

Run the storage reconciliation tool to verify synchronization between PostgreSQL and MinIO:

```bash
npx migrationguard storage reconcile --dry-run
```

Expected: `Orphan objects = 0`, `Missing objects = 0`

## 6. Shutdown

```bash
docker compose -f docker-compose.prod.yml down
```

## 7. Known Limitations

- The deployment is strictly a local production simulation. It lacks real TLS, DNS, and distributed clustering.
- The `fast-jwt` dependency vulnerability is an accepted risk within this simulation boundary.
- Benchmark validation is restricted to a controlled matrix (n=4).
