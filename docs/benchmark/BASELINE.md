# MigrationGuard Benchmark: Atlas Baseline Evaluation

## Overview

To scientifically measure MigrationGuard's contribution to migration safety, we establish an explicit baseline using **Atlas** (a leading SQL-only declarative schema migration tool). The benchmark compares Atlas's schema-level static analysis against MigrationGuard's dynamic application-aware verification.

## Baseline Methodology

### 1. Execution Environment

- Atlas CLI is downloaded natively to the CI environment (`bin/atlas.exe`).
- For every benchmark test case, MigrationGuard's `packages/benchmark-runner` executes `atlas migrate lint` or an equivalent command on the candidate migration SQL against a dev-database.

### 2. Capture and Evaluation

- **Success Criteria**: If Atlas exits with `0` and emits no linting warnings about destructive operations, it marks the migration as `SAFE`.
- **Failure Criteria**: If Atlas returns a non-zero exit code indicating a destructive schema change (e.g., `destructive change detected: drop column`), it marks the migration as `UNSAFE`.

### 3. Metric Calculation

Atlas results are recorded exactly as observed without fabrication.
The benchmark runner will independently calculate for Atlas:

- True Positives (TP): Atlas caught an unsafe migration.
- True Negatives (TN): Atlas allowed a safe migration.
- False Positives (FP): Atlas flagged a safe migration as unsafe.
- False Negatives (FN): Atlas allowed an unsafe migration.

### 4. Application-Aware Gap Analysis

The core focus of this comparison is the subset of failures where **Atlas evaluates the migration as SAFE**, but **MigrationGuard evaluates the migration as UNSAFE (Compatibility Failure)**. These cases validate the necessity of application-version awareness in rolling deployments.

## Limitations

- If a migration cannot be parsed by Atlas due to unsupported dialects or environment constraints in the isolated sandbox, the result will be cleanly marked as `NOT_EVALUATED` with the specific stderr reason. Mock parsers are strictly prohibited for baseline evaluation.
