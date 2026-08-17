# M7 Audit Log: Evidence Engine

## 1. Summary

The M7 Implementation rebuilt the ad-hoc diagnostic logic inside the CLI into a formal pipeline that isolates execution status from migration compatibility analysis.

## 2. Findings & Design Decisions

### 2.1 Causal Statement Mapping via Constrained Regex

- **Decision**: The `CausalAnalyzer` uses regex (e.g., `/DROP COLUMN "(\w+)"/`) to map database errors to SQL statements, rather than an AST parser.
- **Rationale**: Building a full PostgreSQL AST parser is prohibitively complex and unnecessary for the M7 scope. A constrained regex safely and deterministically correlates explicitly dropped columns with exact Prisma exceptions. If a match fails, the system safely falls back to `LIKELY` or `UNKNOWN` confidence rather than crashing.

### 2.2 Distinguishing Failure Categories

- **Decision**: Separated `FailureCategory` (e.g., `INFRASTRUCTURE_FAILURE`) from `FaultType` (e.g., `DESTRUCTIVE_RENAME`).
- **Rationale**: A timeout or a typo in `DATABASE_URL` is an execution hazard, not proof that a migration is unsafe. This separation ensures the upcoming M8 benchmarking phase receives clean, noise-free metrics.

### 2.3 Security Boundaries

- **Decision**: Migration SQL is treated as untrusted input during analysis.
- **Rationale**: The regex engines are kept simple to prevent ReDoS (Regular Expression Denial of Service). The raw SQL string is never passed to `eval` or executed by the Node.js host outside the sandboxed Docker Postgres container.

## 3. Test Verification

- Added **Negative Tests** to ensure generic HTTP 500 errors (`TypeError`) or timeouts correctly produce `WORKLOAD_FAILURE` and `TIMEOUT_FAILURE` rather than being falsely flagged as `COMPATIBILITY_FAILURE`s.
- E2E Matrix accurately observed the `NEW+V1` state as `QUERY_INCOMPATIBILITY (CONFIRMED)` and the `OLD+V2` state as `DESTRUCTIVE_RENAME (CONFIRMED)`.
