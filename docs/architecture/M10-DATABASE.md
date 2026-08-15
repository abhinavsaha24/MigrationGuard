# M10: Database Architecture

The MigrationGuard persistent database is implemented in PostgreSQL and orchestrated via Prisma.

## Models

### User

Tracks administrators and reviewers for the hosted application. Includes role-based differentiation (`ADMIN` vs `REVIEWER`).

- Uses `argon2` for secure password hashing.

### Presentation & PresentationVersion

Tracks the lifecycle of published presentation documents (e.g. PPTX or PDF overviews of the tool).

- Implements strict versioning. Older versions are never destroyed.
- Blobs are pushed to S3 object storage; the database merely tracks the `storageKey`.
- `publishedAt` timestamp enables soft-publishing and scheduled release.

### VerificationRun

The core entity capturing the execution footprint of a MigrationGuard CI or CLI run.

- `id` corresponds to the deterministically generated `MG-VERIFY-xxx` run ID from the CLI orchestrator.
- Tracks total `durationMs`, `migrationName`, and an overarching `status` (`PASS` or `FAIL`).

### CompatibilityRun

1-to-many relationship with `VerificationRun`. Represents individual cells of the compatibility matrix.

- Captures `appVersion` (OLD/NEW), `dbVersion` (V1/V2), and `durationMs` for specific workloads.

### EvidenceRecord

1-to-many relationship with `VerificationRun`. Captures the fault catalogue classification.

- Persists `faultType` (e.g., DESTRUCTIVE_RENAME, COMPATIBILITY_FAILURE, NONE).
- Contains `observedError` and the `operation` that caused the failure (e.g. `GET /users`).

### ReviewerDecision

1-to-many relationship with `VerificationRun`. Associates a `User` (reviewer) decision (`ACCEPTED` or `REJECTED`) with a specific run, mimicking real-world CI/CD gate mechanics.
