# PHASE 2 FORENSIC VALIDATION: FINAL AUDIT REPORT

This report constitutes the final read-only and reproducibility audit for Phase 2 of MigrationGuard, conducted prior to any implementation in Phase 3 (LLM Generator Track C). Its objective is to document the exact, proven state of the system, addressing ambiguities and establishing research-grade truth.

## 1. Authoritative Benchmark (`n=5`)

The `TRACK_B_NATIVE_RENAME` fixture was explicitly evaluated in the latest execution of `npm run benchmark`. The system successfully orchestrated the manifest pipeline without treating it as `NOT_EVALUATED`.

**Exact Benchmark Results:**

- **Execution Time:** 125808ms
- **Total Benchmark Cases:** 5
- **Evaluated Cases:** 5
- **NOT_EVALUATED Cases:** 0
- **Infrastructure Failures:** 0

**MigrationGuard Metrics:**

- **TP:** 3
- **TN:** 2
- **FP:** 0
- **FN:** 0
- **Precision:** 1.00
- **Recall:** 1.00
- **F1:** 1.00

**Atlas Metrics:**

- **TP:** 3
- **TN:** 0
- **FP:** 2
- **FN:** 0
- **Precision:** 0.60
- **Recall:** 1.00
- **F1:** 0.75

**Conclusion:** The authoritative operational baseline is officially **$n=5$**. `TRACK_B_NATIVE_RENAME` successfully navigated the pipeline.

## 2. Native Rename Verification

The `TRACK_B_NATIVE_RENAME` correctly produced an `UNSAFE` verdict (Confidence: CONFIRMED, Fault: DESTRUCTIVE_RENAME). Old/New tracking captured the crash where V1 (`APP OLD`) fails to locate the natively renamed column `name` (which was changed to `name_new` in V2) on port 65199, exactly simulating zero-downtime downtime scenarios.

## 3. Mutation Experiment Determinism

`npm run experiment:mutate` was run twice from a clean experimental state.

**Run 1 vs Run 2 Comparison:**

- **Mutation IDs:** Different between runs (e.g., `mut-81fec63a` vs `mut-22cd45b0`). IDs intentionally use `randomBytes(4).toString('hex')`.
- **Operators:** Identical (`DROP_COLUMN`, `NATIVE_RENAME`, `TYPE_NARROWING`, `SAFE_ADD_COLUMN`).
- **Expected Labels:** Identical.
- **Actual Verdicts:** Identical.
- **Execution Statuses:** Identical (`SUCCESS`).
- **Metrics (TP/TN/FP/FN/Precision/Recall/F1):** Identical (`1.00` across the board).

**Conclusion:** The experiment is semantically deterministic. Randomly generated workspace IDs do not alter the deterministic execution of the schema or migration testing.

## 4. `SAFE_UNEXERCISED` Semantics

For the `SAFE_ADD_COLUMN` mutation case:

- **Expected:** `SAFE_UNEXERCISED`
- **Actual:** `SAFE`

**Analysis:**

1. **Intentional Binary Mapping:** Yes. `cli/src/mutate.ts` explicitly maps safe cases (`isUnsafe == false`) to `SAFE` with the note `// Simplifying for the experiment`.
2. **Where Implemented:** `cli/src/mutate.ts`, line 168.
3. **Coverage Retention:** `SAFE_UNEXERCISED` is derived from coverage overlap analysis (which columns are touched during workload replay). In the current mutate orchestration script, the matrix output maps the absence of compatibility failure to `SAFE`.
4. **Distinguishing VERIFIED from UNEXERCISED:** A reviewer reading the mutate experiment console output cannot distinguish `SAFE_VERIFIED` from `SAFE_UNEXERCISED`.
5. **Mathematical Validity:** Binary Precision and Recall remain mathematically valid because both conditions map correctly to True Negative (TN), reflecting an accurate absence of a crash (safe deployment).

**Conclusion:** The mapping is correct for calculating binary F1 but drops granularity. No modifications will be made merely to score higher.

## 5. Evidence Chain

For `SAFE_ADD_COLUMN` (e.g., `mut-44b1bacc`):

1. **Schema Mutation:** `schema-v2.prisma` received `age Int?` using `PrismaMutationEngine`.
2. **Migration Generation:** `npx prisma migrate diff` created SQL to `ALTER TABLE "users" ADD COLUMN "age" INTEGER`.
3. **Migration Execution:** `MigrationEngine.applyMigration` successfully applied the mutation to the `PostgresSandbox`.
4. **Application Execution:** `APP OLD` and `APP NEW` successfully loaded and ran against the mutant schema.
5. **Workload Replay:** `get-user-1` ran and succeeded (no application crashes, because neither app accessed the unexercised `age` column, while maintaining existing `bio String?` references).
6. **Verdict:** Correctly scored as True Negative (TN = SAFE).

## 6. Infrastructure Failure Accounting

`cli/src/mutate.ts` correctly isolates:

- `MIGRATION_EXECUTION_FAILURE` (Schema parsing/diff validation) -> `NOT_EVALUATED` (Line 166).
- Unhandled Engine Exceptions -> `INFRASTRUCTURE_FAILURE` (Line 176).

These failures increment `infraFailures` and subtract from the `Evaluated` count, preventing them from corrupting the TP/TN/FP/FN metrics.

## 7. Baseline / Experiment Separation

- The primary benchmark continues to read `benchmark/manifest.json` and evaluates the exact configured list ($n=5$).
- The mutation experiment (`mutate.ts`) dynamically copies schemas into temporary `os.tmpdir()` folders.
- The mutation experiment does NOT overwrite `RESULTS.md` or any static `json` data in the original `benchmark/fixtures` directories.

## 8. Security and Code Review

- **No arbitrary SQL execution:** Mutations use strict regex matching and Prisma operations rather than executing unsafe arbitrary SQL injection scripts.
- **Path Traversal:** Handled strictly via `os.tmpdir()` and standard isolated directory generation for each mutate ID.
- **Hardcoded Verdicts:** No verdicts are hardcoded except for the experimental evaluation expectations (`c.expectedLabel`).

## 9. Test Coverage

Running the full CI suite:

- `lint`: Passed.
- `format:check`: Failed initially on `RESULTS.md` and `PHASE-2-HARDENING-REPORT.md` (fixed via `prettier --write`).
- `test`: Passed (11 files, 35 tests, 100% execution).
- `verify`: Explicitly returned `exit code 1` due to the test fixture proving MigrationGuard accurately catches the unsafe `DESTRUCTIVE_RENAME`.

## 10. Performance

- **Benchmark Runtime:** `125.8s` (up from prior $n=4$ benchmarks due to the addition of `native-rename`).
- **Mutation Experiment Runtime:** `~58s` for $n=4$ concurrent mutation evaluations using independent container allocations.
- **Performance Rating:** Nominal overhead for comprehensive isolated Docker evaluation mapping perfectly to Phase 1 estimates.

## 11. Documentation Integrity

An explicit search for `n=4` vs `n=5` reveals:

- **Stale Phase 1 Docs:** `FINAL-RELEASE-REPORT.md`, `MASTER-HARDENING-BASELINE.md`, and `MIGRATIONGUARD-RESEARCH-PAPER.md` explicitly bound the baseline to $n=4$.
- **New Phase 2 Docs:** `PHASE-2-HARDENING-REPORT.md` rightfully upgrades the baseline to $n=5$.

_Warning:_ The old Phase 1 documentation must be explicitly categorized or updated in Phase 3 to prevent readers from simultaneously interpreting the current state as $n=4$ and $n=5$.

## 12. Final Classification

**PHASE 2: PASS**

The system accurately, rigorously, and deterministically evaluates standard benchmarks and experimental mutations using an architecture built on actual executable evidence rather than static analysis.

## Remaining Limitations

- `SAFE_UNEXERCISED` granularity is lost in the binary output of the mutate experiment.
- The repository documentation has stale Phase 1 claims of `n=4` that require lifecycle management.

## Recommended Next Phase

Proceed to **Phase 3 (LLM Generator Track C)**, securely sandboxed behind this finalized experimental pipeline.
