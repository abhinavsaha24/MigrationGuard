# MigrationGuard

MigrationGuard is a dynamic, application-aware database migration verification engine. Unlike static analysis tools (e.g., Atlas or Prisma Migrate), MigrationGuard verifies migration safety by executing the actual application workload against isolated pre- and post-migration database states in an ephemeral Docker sandbox. This guarantees backward compatibility during rolling and zero-downtime deployments.

Production Dashboard: [https://migrationguard.abhinavsaha.me](https://migrationguard.abhinavsaha.me)

---

## Architecture

MigrationGuard orchestrates a 4-state Compatibility Matrix during CI/CD:

1. **OLD APP + V1 DB**: Verifies the pre-migration baseline functionality.
2. **NEW APP + V1 DB**: Verifies backward compatibility during rollout (new code against unmigrated database).
3. **OLD APP + V2 DB**: **Critical test** — verifies whether existing application instances continue serving traffic without failure when the database is migrated.
4. **NEW APP + V2 DB**: Verifies post-migration target state functionality.

Execution outcomes are analyzed by the **Evidence Engine**, which maps observed HTTP failures directly to underlying PostgreSQL schema constraints (e.g., `COLUMN_REMOVAL`, `DESTRUCTIVE_RENAME`, `TYPE_NARROWING`).

---

## Quick Start & Verification

### 1. Verification Example (Local Fixture)

Verify a database migration against an application workload in an ephemeral PostgreSQL container:

```bash
# Clone and build
git clone https://github.com/abhinavsaha24/MigrationGuard.git
cd MigrationGuard
npm ci
npm run build

# Run real migration verification fixture
npm run verify
```

The CLI executes the 4-cell matrix, captures HTTP responses, and outputs forensic evidence in `reports/MG-VERIFY-<timestamp>.json` and `.md`.

### 2. Uploading Results to Hosted Production Dashboard

Set the API configuration and pass `--upload`:

```bash
export MG_API_URL="https://migrationguard.abhinavsaha.me"
export MG_API_TOKEN="<YOUR_JWT_TOKEN>"

npx migrationguard verify --config migrationguard.json --upload
```

View results, matrix states, and database exception traces on the hosted web console:
[https://migrationguard.abhinavsaha.me/#/dashboard/runs](https://migrationguard.abhinavsaha.me/#/dashboard/runs)

---

## Research Methodology & Benchmark Results

MigrationGuard was evaluated against an explicit ground truth matrix comparing its dynamic causal analysis against static schema linters.

- **Benchmark Evaluation**: MigrationGuard achieved **100% Precision** and **100% Recall** (F1 = 1.00) across structural fault scenarios, successfully isolating destructive changes while passing safe additive migrations.
- **Limitation Statement (n=5)**: The evaluation utilized a controlled dataset (n=5) covering safe column additions, type narrowing, and destructive drops. While achieving high precision within this benchmark suite, this does not imply generalized 100% accuracy on arbitrary external database topologies.

Run the benchmark suite:

```bash
node cli/dist/index.js benchmark
```

---

## Running the Application Locally

To launch the local development stack (Frontend, Backend, PostgreSQL, MinIO) for local testing:

```bash
docker compose up -d --build
```

- Frontend: `http://localhost:5173` or `http://localhost:8080`
- Backend API: `http://localhost:3000`

---

## Scope & Limitations

- **Database Support**: PostgreSQL (versions 14, 15, and 16).
- **Application Runner**: Node.js applications (Express, Fastify, NestJS) using Prisma or raw SQL migrations.
- **Execution Model**: Ephemeral Docker sandboxes run locally or on CI runners with Docker daemon access.
- **Hosted Platform**: `https://migrationguard.abhinavsaha.me` serves as a telemetry, review, and audit console; it does not execute arbitrary remote customer containers.

---

## Documentation Index

- **Customer Guide**
  - [Customer Usage Guide](docs/CUSTOMER-GUIDE.md) — Complete installation, configuration, matrix interpretation, and CI/CD setup.
- **Architecture & System Design**
  - [Final Architecture](docs/architecture/FINAL-ARCHITECTURE.md)
  - [System Specifications](MIGRATIONGUARD_SPEC.md)
- **Deployment & Runbooks**
  - [Production Deployment Guide](docs/DEPLOYMENT.md)
  - [Developer & Operator Runbook](docs/RUNBOOK.md)
  - [Pre-Deployment Audit](docs/FINAL-PREDEPLOYMENT-AUDIT.md)
- **Research & Benchmarks**
  - [Research Paper & Summary](docs/research/MIGRATIONGUARD-RESEARCH-PAPER.md)
  - [Performance Metrics](docs/research/FINAL-PERFORMANCE.md)
  - [Reproducibility Guide](docs/research/REPRODUCIBILITY.md)
  - [Benchmark Results](docs/benchmark/RESULTS.md)
  - [Benchmark Ground Truth](docs/benchmark/GROUND-TRUTH.md)
  - [Benchmark Repository Selection](docs/benchmark/REPOSITORY-SELECTION.md)
  - [Baseline Methodology](docs/benchmark/BASELINE.md)
- **Security & Final Reports**
  - [Final Deployment Result](docs/FINAL-DEPLOYMENT-RESULT.md)
  - [Final Security Review](docs/security/FINAL-SECURITY-REVIEW.md)
- **Historical Archive**
  - Preserved architectural records in `docs/archive/`.
