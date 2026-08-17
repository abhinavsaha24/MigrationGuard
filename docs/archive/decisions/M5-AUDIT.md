# M5 Audit Log: Workload Replay Platform

## 1. Summary

Prior to implementing the M5 Workload Replay platform, a comprehensive audit of the M2-M4 hardened architecture, current CLI orchestration, and existing `poc-app` application fixtures was conducted. The goal of this audit is to identify integration friction, establish boundaries for the new `packages/workload`, and ensure M1 E2E regression behavior is strictly preserved.

## 2. Findings

### 2.1 Hardcoded Application Logic in `packages/compatibility`

- **Severity**: High
- **Affected Module**: `packages/compatibility/src/index.ts`
- **Observation**: The `CompatibilityRunner` class currently hardcodes `GET /users/1` and relies on specific Prisma error strings (`The column 'users.name' does not exist`) in its `isCausalFailure` logic.
- **Action Required**: The new `packages/workload` Replay Engine will replace this network logic. The causal failure detection (i.e. "MIGRATION UNSAFE") must be extracted to the CLI orchestrator (`verify.ts`), as the workload package should only observe and report HTTP state and raw bodies, not decide on migration safety. The `packages/compatibility` package can be deprecated or repurposed as a lightweight domain logic layer used by the CLI.

### 2.2 Limited Evidence System Arity

- **Severity**: Medium
- **Affected Module**: `packages/evidence/src/index.ts`
- **Observation**: The `Evidence` interface expects a single `operation: { method: string, path: string }`. A Workload consists of _multiple_ operations.
- **Action Required**: Integrate minimally. The CLI orchestrator will log a single Evidence record representing the Workload session for that application/database state. We will modify the `Evidence` interface slightly to capture the `workloadId`, and the `operation` field will represent the specific operation that failed (or the last operation executed if successful).

### 2.3 `poc-app` Endpoint Limitations

- **Severity**: Low
- **Affected Module**: `apps/poc-app/src/old.ts` and `new.ts`
- **Observation**: The application fixture only has a hardcoded strict equality check for `req.url === '/users/1'`.
- **Action Required**: To support a "Multiple Read Workload" fixture, modify the route matcher to accept `/users/1` and `/users/2` (or a regex `^\/users\/\d+$`). No major architectural changes are needed for this application fixture.

### 2.4 Lack of HTTP Timeout Logic in Current Runner

- **Severity**: Medium
- **Affected Module**: `packages/compatibility/src/index.ts`
- **Observation**: The existing runner does not have bounded timeouts for the HTTP request, risking infinite hangs if the application freezes.
- **Action Required**: The M5 `WorkloadReplayEngine` will implement strict configurable timeouts (e.g. 5 seconds) using Node's `AbortController` and `setTimeout`.

## 3. Security Review

The new `WorkloadLoader` will parse JSON files from the filesystem. Since this runs in a trusted CLI context, basic schema validation (checking types of `method`, `path`, `headers`) is sufficient. We will ensure the `path` does not contain malicious characters, and we will restrict the base URL to `http://localhost:*` as provided by the `ApplicationRunner` to avoid SSRF to external services.

## 4. Remaining Limitations

- **Concurrency**: Workload execution will remain strictly sequential. No load testing or parallel execution logic will be introduced.
- **Protocol**: Only REST/HTTP operations are supported. GraphQL, gRPC, and direct SQL replays are out of scope.
- **State Cleanup**: Replay operations do not have native rollback. Side-effects of a workload (e.g., POSTing new records) will persist in the sandbox database. Tests should use fresh sandboxes.

## 5. Verification Plan

The final verification will run the full E2E verify sequence to ensure the CLI produces the exact same M1 verdict matrix (OLD+OLD=PASS, OLD+NEW=FAIL, NEW+NEW=PASS) using the new `packages/workload` foundation instead of hardcoded API requests.
