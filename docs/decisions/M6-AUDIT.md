# M6 Audit Log: Compatibility Matrix

## 1. Summary

Prior to M6, the `cli` orchestrator implemented a hardcoded procedural script that selectively tested 3 of the 4 rolling deployment states (omitting `NEW APP + V1 DB`). M6 generalized this into a reusable `CompatibilityMatrixEngine`.

## 2. Findings & Design Decisions

### 2.1 Decoupling Execution from Analysis

- **Decision**: The Matrix Engine must not know about `users.name` or `DESTRUCTIVE_RENAME`.
- **Rationale**: An orchestrator should only coordinate lifecycles (start DB, start app, fire workload). Hardcoding Prisma exception strings inside the Engine would violate single responsibility. We instead emit a `WORKLOAD_FAILURE` and let the downstream `CompatibilityAnalyzer` inspect the JSON bodies for Prisma errors.

### 2.2 Execution Ordering

- **Decision**: The execution occurs in a strict V1 setup -> (OLD, NEW) -> V2 setup -> (OLD, NEW) sequence.
- **Rationale**: Re-creating the Docker sandbox for each quadrant is excessively slow. By moving the database forward in time (`V1` -> `V2`), we can test the `OLD` and `NEW` applications simultaneously against the current database epoch before advancing it, reducing E2E verification time significantly.

### 2.3 The NEW + V1 Requirement

- **Observation**: The `NEW` application queries `full_name`. Against the `V1` schema, this causes a query exception.
- **Decision**: This is a legitimate rolling deployment failure. We classify it as `QUERY_INCOMPATIBILITY` in the Analyzer and explicitly assert it in the CLI tests. This ensures MigrationGuard protects against applications deploying before their required schema migrations run.

## 3. Remaining Limitations

- **Teardown on Fatal Errors**: While `taskkill` correctly reaps the Node.js instances, a fatal crash in the `verify.ts` outer script before the `finally` block could hypothetically strand a Docker container. In CI this is mitigated by runner ephemerality.
- **Database Pollution**: Since the OLD and NEW apps both run against the same live V1 database instance sequentially, a write-heavy Workload could mutate state in the OLD quadrant that breaks assumptions in the NEW quadrant. Workloads currently must be idempotent, or we must introduce snapshot/restore logic in a future milestone.
