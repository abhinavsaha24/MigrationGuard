# MigrationGuard

MigrationGuard is a dynamic, application-aware database migration verification engine. Unlike static analysis tools (e.g., Atlas or Prisma Migrate), MigrationGuard verifies migration safety by executing the actual application workload against isolated pre- and post-migration database states in an ephemeral Docker sandbox. This guarantees backward compatibility during rolling deployments.

## Architecture

MigrationGuard orchestrates a 4-state Compatibility Matrix during CI:

1. **OLD APP + V1 DB**: Tests the pre-migration baseline.
2. **NEW APP + V1 DB**: Tests backwards compatibility. A new application instance connecting to a database that has _not_ yet been migrated.
3. **OLD APP + V2 DB**: Tests backwards compatibility. An old application instance connecting to a database that _has_ been migrated.
4. **NEW APP + V2 DB**: Tests the post-migration baseline.

Execution outcomes are analyzed by the **Evidence Engine**, which maps observed HTTP failures directly to underlying PostgreSQL schema constraints (e.g., `COLUMN_REMOVAL`, `DESTRUCTIVE_RENAME`, `TYPE_NARROWING`).

## Research Methodology & Benchmark Results

MigrationGuard was rigorously evaluated against an explicit ground truth matrix comparing its causal analysis against the static capabilities of Atlas.

- **Benchmark Results**: MigrationGuard achieved **100% Precision** and **100% Recall** (F1 = 1.00), successfully isolating injected structural faults while passing safe migrations.
- **Limitation Statement (n=4)**: The evaluation utilized an explicitly constrained dataset (n=4) covering safe column additions, type narrowing, and destructive drops. While achieving perfect metrics within this set, this result does not imply generalized 100% accuracy on all arbitrary PostgreSQL schema changes.

## Running the Application

### Local Demonstration

To launch the full stack (Frontend, Backend, PostgreSQL, MinIO) locally for demonstration:

```bash
docker compose up -d --build
```

For detailed instructions, see the [Local Demo Runbook](docs/LOCAL-DEMO-RUNBOOK.md).

### Production Deployment

MigrationGuard is engineered for secure deployment via an Nginx reverse proxy. For VPS deployment configuration, environment variables, and certificate handling, see the [Production Deployment Runbook](docs/PRODUCTION-DEPLOYMENT.md).

## Documentation Index

The repository contains extensive architectural, research, and audit documentation:

- **Architecture & System Design**
  - [Final Architecture](docs/architecture/FINAL-ARCHITECTURE.md)
  - [System Specifications](MIGRATIONGUARD_SPEC.md)
- **Deployment & Runbooks**
  - [Deployment Readiness Status](docs/DEPLOYMENT-READINESS.md)
  - [Production Deployment](docs/PRODUCTION-DEPLOYMENT.md)
  - [Local Demo Runbook](docs/LOCAL-DEMO-RUNBOOK.md)
- **Research & Benchmarks**
  - [Research Paper & Summary](docs/research/MIGRATIONGUARD-RESEARCH-PAPER.md)
  - [Performance Metrics](docs/research/FINAL-PERFORMANCE.md)
  - [Reproducibility Guide](docs/research/REPRODUCIBILITY.md)
  - [Benchmark Results](docs/benchmark/RESULTS.md)
  - [Benchmark Ground Truth](docs/benchmark/GROUND-TRUTH.md)
  - [Benchmark Repository Selection](docs/benchmark/REPOSITORY-SELECTION.md)
  - [Baseline Methodology](docs/benchmark/BASELINE.md)
- **Security & Final Reports**
  - [Final Release Report](docs/FINAL-RELEASE-REPORT.md)
  - [Final Security Review](docs/security/FINAL-SECURITY-REVIEW.md)
- **Historical Archive**
  - Architectural milestones and early audit decisions are preserved in `docs/archive/`.
