# PHASE 3 DEEP FORENSIC RESEARCH & HARDENING AUDIT

## Executive Summary

MigrationGuard has achieved a forensically proven $n=5$ benchmark and an operational deterministic mutation-testing pipeline. However, beneath the $F1=1.00$ claim lies an architecture heavily reliant on brittle static analysis (regex parsing), aggregated database telemetry (`pg_stat_statements`), and simplified evidence mapping. While the _theoretical_ proposition is sound, the _implementation_ contains significant research limitations and security vulnerabilities.

This audit scores MigrationGuard readiness at **78/100**. To reach true research-grade defensibility, the engine must pivot away from regex heuristics toward deterministic Postgres logging and cryptographic provenance.

---

## Verified Strengths

1. **Deterministic Sandboxing:** The matrix engine reliably provisions isolated PostgreSQL Docker containers for each evaluation quadrant.
2. **Workload Replay Validation:** The simulation of OLD and NEW applications against divergent schema states accurately catches basic crash states.
3. **Reproducible Failure:** `TRACK_B_NATIVE_RENAME` natively crashes the OLD app on the new schema exactly as predicted in real zero-downtime environments.

---

## Verified Defects

1. **Regex-Bound Causal Analysis:** `CausalAnalyzer` uses weak regex (`/DROP\s+COLUMN\s+"?(\w+)"?/gi`) to parse SQL migrations. It cannot understand constraints, composite keys, or complex transactions.
2. **Hardcoded Fault Classifications:** `FaultClassifier` relies on substring matching of Postgres error messages (`includes('cannot be cast automatically')`) to assign `TYPE_NARROWING`, making it fragile to Postgres localization or version changes.
3. **Loss of `SAFE_UNEXERCISED` Granularity:** The mutation orchestrator compresses `SAFE_UNEXERCISED` to `SAFE`. This mathematically preserves F1=1.00 but destroys the semantic distinction between "This migration uses an expand/contract pattern" vs "This column is dead code."

---

## Security Findings

1. **[CRITICAL] Command Injection Risk:** `packages/sandbox/src/index.ts` uses Node's `spawnSync` with shell-like behaviors on user-provided application parameters, exposing the host to arbitrary code execution.
2. **[HIGH] Unhardened Docker Topology:** `docker-compose.prod.yml` runs database services without healthchecks, binds the frontend exclusively to `127.0.0.1:8080`, and lacks SSL termination.
3. **[MEDIUM] Parameter Leakage:** While `pg_stat_statements` normally parameterizes values, captured Postgres log error lines frequently dump raw unmasked parameter data into the evidence JSON payloads.

---

## Correctness Findings

- **False Negative Risk:** Because causality relies on regex, a migration that safely renames a column using complex multi-step PL/pgSQL will likely be misclassified as `UNKNOWN_FAILURE` or falsely assigned to an unrelated column drop.

---

## Telemetry Findings

**Assessment of `pg_stat_statements`:**

- **A. Identification:** YES, but structurally aggregated, not chronologically exact.
- **B. Prisma vs Workload:** NO. Prisma's internal state queries are indistinguishable from workload queries.
- **C. Error Association:** NO. Postgres errors are scraped sequentially from Docker logs and blindly attached to HTTP 500s.
- **D. Simultaneous Request Isolation:** NO.
- **E. Timing/Order:** NO.
- **F. Leakage:** YES, via error logs.
- **G. Matrix Isolation:** YES, matrix engine correctly resets/spawns new containers.
- **H. Cheapest Deterministic Improvement:** Enable PostgreSQL `log_statement='all'` instead of relying on `pg_stat_statements`, parsing sequential text logs to establish exact chronological query execution.

---

## Workload Coverage Findings

**Assessment of `WorkloadCoverageAnalyzer`:**
The coverage analyzer determines "exercised" columns by running a regex `\b${col}\b` against the SQL dump.

- **Defect:** If a workload executes `SELECT * FROM users`, the column name does not appear in the SQL text, causing a false `UNEXERCISED` classification. This is a profound blind spot that could lead to falsely labeling a dangerous DROP as `SAFE_UNEXERCISED`.

---

## Evidence/Provenance Findings

**Assessment of `EvidenceBuilder`:**

- **Defect:** Evidence IDs are generated via `EVD-${Date.now()}-${Math.floor(Math.random() * 10000)}`.
- **Impact:** There is zero cryptographic provenance linking the Evidence file to the exact schema hash or workload payload. If a researcher alters the `migration.sql` text inside the JSON report, the system cannot detect the tampering.

---

## Benchmark Integrity

- **NOT_EVALUATED vs SAFE:** Correctly separated.
- **INFRASTRUCTURE_FAILURE vs COMPATIBILITY:** Correctly separated.
- **n=5 Limitation:** The benchmark is statistically tiny. F1=1.00 is mathematically true for the executed payload, but highly misleading if presented without the "preliminary n=5" qualifier.

---

## Mutation Experiment Assessment

- **Assessment:** The mutation engine works deterministically. However, it currently supports only 4 basic operations (`DROP_COLUMN`, `NATIVE_RENAME`, `TYPE_NARROWING`, `SAFE_ADD_COLUMN`).
- **Recommendations:** The highest value additions are `ADD_REQUIRED_COLUMN` (fails old app inserts) and `DROP_USED_TABLE` (fails everything).

---

## Research Methodology Assessment

**Weaknesses:**

1. F1=1.00 is a function of the incredibly constrained $n=5$ dataset.
2. "Causal Attribution" claims in the research documentation overstate the system's ability; the engine currently performs rudimentary string-matching rather than true AST-based semantic causality.

---

## Production Deployment Assessment

- **Assessment:** `docker-compose.prod.yml` lacks an independent Nginx reverse proxy for SSL, exposes no backend port for debugging, lacks volumes for persistent logging, and uses `latest` or generic `alpine` tags which risk breaking on ARM64 architectures.

---

## Documentation Truth Audit

| Document                           | Claim     | Current Truth         | Action                        |
| ---------------------------------- | --------- | --------------------- | ----------------------------- |
| `MIGRATIONGUARD-RESEARCH-PAPER.md` | `n=4`     | Benchmark is `n=5`    | Update limitation boundaries  |
| `FINAL-RELEASE-REPORT.md`          | `n=4`     | Benchmark is `n=5`    | Deprecate as Phase 1 artifact |
| `README.md`                        | `F1=1.00` | True but small sample | Keep, but add disclaimer      |

---

## Performance Assessment

- **Bottlenecks:**
  1. Docker Container Provisioning (`waitForReadiness` polling).
  2. Sequential matrix execution (4 complete application lifecycles per test).
  3. Prisma schema generation per step.

---

## Research Opportunities (Top 5 Improvements)

### 1. PostgreSQL Native Log Telemetry (P0 - Critical)

- **Problem:** `pg_stat_statements` aggregates queries, losing chronological execution and failing to capture implicitly queried columns (`SELECT *`).
- **Solution:** Configure PostgreSQL with `log_statement='all'` and `log_min_error_statement='error'`. Parse the chronological log stream directly.
- **Research Value:** Proves exact, causally-linked execution paths.

### 2. Cryptographic Evidence Provenance (P1 - High-Value)

- **Problem:** Evidence records can be easily tampered with, undermining research defensibility.
- **Solution:** Hash `schema-v1`, `schema-v2`, and `workload.json` using SHA-256 and embed the resulting signature as the `evidenceId`.
- **Research Value:** Provides immutable, academically verifiable proof of execution.

### 3. Granular `SAFE` Resolution (P1 - High-Value)

- **Problem:** `SAFE_VERIFIED` and `SAFE_UNEXERCISED` are squashed into `SAFE`.
- **Solution:** Retain the trinary state in experimental metrics to prove that MigrationGuard can distinguish between safe engineering practices (Expand/Contract) and "dead code."
- **Research Value:** Crucial for proving dynamic deployment awareness.

### 4. Expansion of Mutation Corpus (P2 - Useful)

- **Problem:** 4 mutations is too small to claim generalized compatibility detection.
- **Solution:** Add `ADD_REQUIRED_COLUMN` and `MAKE_NON_NULL`.
- **Research Value:** Tests INSERT boundaries rather than just SELECT failures.

### 5. AST-Based Migration Parsing (P2 - Useful)

- **Problem:** Regex parsing of SQL causes false attributions.
- **Solution:** Use a lightweight SQL AST parser (like `pgsql-ast-parser`) to extract affected columns and tables accurately.
- **Research Value:** Significantly hardens the Causal Analyzer.
