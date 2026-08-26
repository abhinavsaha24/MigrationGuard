# FINAL SENIOR ENGINEERING BASELINE
## Phase 0 Forensic Audit - MigrationGuard

**Audited:** 2026-08-26
**Commit:** 0fba30b (docs: generate Phase 3A baseline)
**Auditor:** Senior Engineering Audit Pass

---

## 1. Build Results

**`npm run build`**: PASS (exit 0)
- Prisma clients generated for schema-v1 and schema-v2
- TypeScript composite build succeeded across all workspaces

## 2. Lint Results

**`npm run lint`**: PASS (exit 0, no warnings)

## 3. Test Results

**`npm run test`**: FAIL - 6 failed, 27 passed, 3 skipped (10.29s)

### Test Failures

| # | Package | Root Cause | Category |
|---|---------|------------|----------|
| 1-6 | sandbox, migration-engine, application-runner, cli | Docker Desktop not running | Infrastructure (expected in CI) |
| 7-8 | server/app.test.ts - presentation upload (3 cascading) | MinIO not mocked in test env | Real test design issue |

The server presentation tests fail because the storage service makes real S3/MinIO calls without mocking.
Docker-dependent tests (1-6) are expected failures in this environment and pass on Linux/CI.

---

## 4. CRITICAL Security Findings

| Severity | Finding | Location |
|----------|---------|----------|
| CRITICAL | `.env` committed with real credentials | `/.env` line 15: `JWT_SECRET=production_super_secret_key_123!` |
| CRITICAL | Wildcard CORS in committed `.env` | `/.env` line 16: `FRONTEND_ORIGIN=*` |
| CRITICAL | Server `.env` with dev credentials committed | `/apps/server/.env`: `JWT_SECRET="dev_secret_key"` |
| HIGH | Hardcoded S3 fallback credentials | `apps/server/src/config/s3.ts:7-8` |
| MEDIUM | Content-Disposition header unsanitized | `presentationRoutes.ts:173` - user-controlled filename |
| LOW | Vite temp files committed | Two `vite.config.ts.timestamp-*.mjs` files in frontend |

---

## 5. Research Integrity Findings

### n=4 vs n=5 Discrepancy (Research Integrity Violation)

The Benchmark page and Research page display stale n=4 data. The authoritative benchmark is n=5.

Files with incorrect n=4 claims:
- `apps/frontend/src/pages/Research.tsx:181` - "n=4 controlled dataset"
- `apps/frontend/src/pages/Benchmark.tsx:73` - "Dataset: n=4"
- `apps/frontend/src/pages/Benchmark.tsx:177` - "Controlled Dataset Ledger (n=4)"

Authoritative benchmark results (verified):
```
n=5
MigrationGuard: TP=3, TN=2, FP=0, FN=0, Precision=1.00, Recall=1.00, F1=1.00
Atlas:          TP=3, TN=0, FP=2, FN=0, Precision=0.60, Recall=1.00, F1=0.75
```

The Benchmark UI shows TP=2/TN=2 (wrong) and Atlas F1=0.67 (wrong - should be 0.75).

---

## 6. Evidence/Provenance Findings

The `EvidenceBuilder` in `packages/compatibility/src/index.ts`:
- Truncates SHA-256 to 12 characters (`substring(0, 12)`) - should be full 64-char hex
- Uses `Date.now()` in `evidenceId` - makes ID non-deterministic
- Does NOT include `inputHashes` for schemaV1, schemaV2, migration SQL, workload JSON

---

## 7. Deployment Findings

`docker-compose.prod.yml`:
- Port isolation: Correct (127.0.0.1 binding for frontend, no host ports for DB/MinIO)
- Missing: No healthchecks for any service
- Missing: No resource limits
- Missing: `FRONTEND_ORIGIN=*` should be specific domain

---

## 8. Stale/Dead Files

- `test.sql` (root) - stray SQL file
- `apps/server/test.pdf` - stray test artifact
- `scratch/`, `packages/sandbox/scratch/` - scratch dirs not gitignored
- `benchmark-baseline.log`, `mutate-baseline.log`, `run1.log`, `run2.log` - logs in root

---

## 9. Frontend/UX Findings

- Benchmark page: Wrong n=4 metrics displayed
- Research page: Wrong n=4 claim
- Runs page: No sorting/filtering; `compatibility` not loaded for pass/fail count
- No `prefers-reduced-motion` support
- Inconsistent: inline styles mixed with CSS Modules throughout RunDetail

---

## 10. Pre-Hardening Score

| Area | Score | Notes |
|------|-------|-------|
| Core Correctness | 78/100 | Pipeline works; evidence provenance incomplete |
| Security | 45/100 | .env committed; wildcard CORS; hardcoded fallbacks |
| Research Integrity | 60/100 | n=4 displayed instead of n=5 |
| Evidence/Provenance | 55/100 | No inputHashes; non-deterministic evidenceId; truncated SHA-256 |
| Testing | 60/100 | Core tests pass; MinIO tests broken by design |
| Deployment | 70/100 | Port isolation OK; missing healthchecks |
| Documentation | 65/100 | Multiple n=4 claims |
| Frontend/UI/UX | 65/100 | Design system present; research data stale |

**Composite Pre-Hardening Score: 62/100**
