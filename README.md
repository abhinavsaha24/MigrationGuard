# MigrationGuard

**Application-Aware PostgreSQL Migration and Rolling-Deployment Verifier**

## Core Problem

A PostgreSQL migration can execute successfully while still breaking an application during a rolling deployment because old and new application versions may temporarily interact with different database schema states. MigrationGuard verifies whether old and new versions of an application remain compatible with the old and new PostgreSQL schemas during a migration transition.

## Project Status: 🔒 RELEASE CANDIDATE (M0-M12 COMPLETE)

MigrationGuard has completed its final milestone (M12) and achieved full repository freeze and hardening. It is functionally complete, regression-safe, and internally consistent.

| Milestone | Name                                         | Status      |
| --------- | -------------------------------------------- | ----------- |
| M0        | Foundation                                   | ✅ COMPLETE |
| M1        | Controlled PoC                               | ✅ COMPLETE |
| M2        | PostgreSQL Sandbox                           | ✅ COMPLETE |
| M3        | Migration Engine                             | ✅ COMPLETE |
| M4        | Application Runner                           | ✅ COMPLETE |
| M5        | Workload Replay Platform                     | ✅ COMPLETE |
| M6        | Compatibility Matrix Engine                  | ✅ COMPLETE |
| M7        | Evidence Engine + Fault Catalogue            | ✅ COMPLETE |
| M8        | Research Benchmark                           | ✅ COMPLETE |
| M9        | Production CLI + GitHub Actions              | ✅ COMPLETE |
| M10       | Hosted Backend Foundation                    | ✅ COMPLETE |
| M11       | Productization & Local Production Simulation | ✅ COMPLETE |
| M12       | Final Repository Hardening & Sign-off        | ✅ COMPLETE |

## Architecture

- **CLI** (`cli/`) — Verification and benchmark runner
- **Backend** (`apps/server/`) — Fastify + TypeScript REST API, JWT auth, RBAC, Prisma/PostgreSQL, MinIO/S3 storage
- **Frontend** (`apps/frontend/`) — React + Vite + TypeScript SPA, dark-mode dashboard
- **Packages** — Modular engines: `sandbox`, `migration-engine`, `application-runner`, `workload`, `compatibility`, `matrix-engine`, `evidence`, `benchmark-runner`

## Quick Start (Development)

```bash
npm install
npm run build
npm run test
npm run verify   # runs CLI verification (expects FAIL - detects DESTRUCTIVE_RENAME)
```

## Local Production Simulation

> **Deployment Status: `LOCAL_PRODUCTION_SIMULATION`**
> No public cloud, VPS, DNS or real TLS certificate. Production-structured, locally reproducible.

```bash
# Start full stack (Frontend + Backend + PostgreSQL + MinIO)
docker compose -f docker-compose.prod.yml up -d --build

# Access
# Frontend: http://localhost
# MinIO Console: http://localhost:9001
```

**Default Credentials:**

- Admin: `admin@migrationguard.dev` (`admin123!`)
- Reviewer: `reviewer@migrationguard.dev` (`reviewer123!`)

## Test Suite

```bash
npm run test          # Core Unit & Integration Tests (all pass)
npm run lint          # ESLint rules
npm run format:check  # Prettier style validation
```

## Documentation

- [`docs/FINAL-PROJECT-AUDIT.md`](docs/FINAL-PROJECT-AUDIT.md) — Definitive project state and architecture.
- [`docs/FINAL-RELEASE-AUDIT.md`](docs/FINAL-RELEASE-AUDIT.md) — Release validation and sign-off.
- [`docs/architecture/DEPLOYMENT-READINESS.md`](docs/architecture/DEPLOYMENT-READINESS.md) — Infrastructure deployment posture.
- [`docs/security/FINAL-SECURITY-REVIEW.md`](docs/security/FINAL-SECURITY-REVIEW.md) — Vulnerability assessment and accepted risks.
- [`docs/research/MIGRATIONGUARD-RESEARCH-PAPER.md`](docs/research/MIGRATIONGUARD-RESEARCH-PAPER.md) — Final research benchmark evaluation.
- [`docs/research/REPRODUCIBILITY.md`](docs/research/REPRODUCIBILITY.md) — Instructions for reproducing the M8 benchmark.
- [`docs/benchmark/GROUND-TRUTH.md`](docs/benchmark/GROUND-TRUTH.md) — Definition of benchmark test fixtures.
