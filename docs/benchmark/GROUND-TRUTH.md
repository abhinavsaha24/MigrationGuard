# MigrationGuard Benchmark: Ground Truth Methodology

## Overview

Ground truth in the MigrationGuard benchmark must be established entirely independently from the outputs of either the MigrationGuard system or the Atlas baseline. Using the output of a system to evaluate the system itself would create circular logic and invalidate the research findings.

## Ground Truth Establishment

### 1. Controlled Fixtures (Track B)

For synthetic injected faults, ground truth is mathematically guaranteed by the injection mechanism.

- **Method**: We take a known, stable schema version `V1` and apply a single specific mutation (`M`). We analyze the resulting database schema `V2`.
- **Labeling Rules**:
  - If `M` explicitly drops a column that was active in `V1`, the ground truth is **UNSAFE (COLUMN_REMOVAL)**.
  - If `M` drops a column `A` and creates a column `B` with the same type, the ground truth is **UNSAFE (DESTRUCTIVE_RENAME)**.
  - If `M` alters a column from `VARCHAR(255)` to `VARCHAR(50)`, the ground truth is **UNSAFE (TYPE_NARROWING)**.
  - If `M` adds a new column without altering or dropping existing constraints, the ground truth is **SAFE**.

### 2. Real-World Repositories (Track A)

For migrations pulled from real-world open-source repositories, ground truth is established via manual expert schema inspection and semantic migration analysis.

- **Method**: The repository's migration files are reviewed manually.
- **Labeling Rules**:
  - We observe the exact `ALTER TABLE` commands.
  - We cross-reference the `Prisma schema` for any removed fields between the git commits associated with the migration.
  - A label is statically assigned inside `manifest.json` along with the documented reasoning.

## Example `manifest.json` Structure

```json
{
  "testId": "FIXTURE_001",
  "repository": "benchmark/fixtures/column-removal",
  "migration": "20260810_remove_user_name",
  "faultType": "COLUMN_REMOVAL",
  "groundTruth": "UNSAFE",
  "reason": "Explicitly drops the 'name' column which was previously queried by the V1 application."
}
```

This ensures both MigrationGuard and Atlas are evaluated against a rigorously verified standard.
