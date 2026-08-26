# MigrationGuard: Master Hardening Baseline

## Authorization Design

- `GET /api/runs` and `GET /api/runs/:id` are designed to be public.
- Rationale: MigrationGuard is an open-source verification framework. Like public CI/CD pipelines (e.g. GitHub Actions), run summaries and compatibility metrics are public to allow transparency in the research benchmark results. No sensitive credentials or user data are exposed in these payloads.
- **Evidence Download** (`GET /api/runs/:id/evidence`) remains strictly authenticated as it contains payload bodies and raw SQL schemas which could be sensitive.

## Benchmark Metrics

All claims of `MigrationGuard F1 = 1.00` and `Atlas F1 = 0.67` found throughout this repository's documentation are strictly bounded by `(n=4, preliminary)`.
The results represent a highly controlled matrix of specific fault types, not a generalized claim of universal safety.

The dataset contains:

1. `COLUMN_REMOVAL`
2. `SAFE_ADD_COLUMN`
3. `TYPE_NARROWING`
4. `EXPRESS_REAL` (no-op safety)

_(New `NATIVE_RENAME` experimental cases are excluded from the baseline 1.00 F1 claim.)_
