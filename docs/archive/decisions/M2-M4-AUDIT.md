# M2–M4 Engineering Audit

## Summary

This audit inspects the MigrationGuard M0/M1 implementation to identify weaknesses, hardcoded values, and architectural limitations before refactoring into the generic M2–M4 components. The review focuses on modularity, error handling, lifecycle management (Docker/Node processes), and platform-specific behaviour (Windows).

## Critical Findings

- **Finding:** Windows process leakage in `application-runner`.
  - **Severity:** CRITICAL
  - **Affected module:** `packages/application-runner`
  - **Reason:** Node's `childProcess.kill('SIGKILL')` on Windows does not terminate process trees properly. If the app spawned children, or sometimes even the main process itself, it can leak.
  - **Action taken:** Will implement Windows-safe cleanup using `taskkill /pid <PID> /t /f` or a reliable cross-platform termination module.
  - **Verification:** Integration tests will verify no `node.exe` instances are leaked.

- **Finding:** Hardcoded Migration Fixtures in `migration-engine`.
  - **Severity:** CRITICAL
  - **Affected module:** `packages/migration-engine`
  - **Reason:** The engine strictly hardcodes `applyV1()` and `applyV2()` mapping to specific fixture folders. It cannot accept arbitrary migrations.
  - **Action taken:** Will refactor to an `applyMigrations(sourceDir)` strategy that dynamically reads migration sets.
  - **Verification:** M1 E2E tests must still pass using the generalized engine.

## High Findings

- **Finding:** Sandbox cleanup swallows errors.
  - **Severity:** HIGH
  - **Affected module:** `packages/sandbox`
  - **Reason:** `stop()` uses an empty `catch` block. If `docker rm -f` fails, the container leaks, causing subsequent runs to fail on port collisions.
  - **Action taken:** Will implement proper error logging and structured cleanup guarantees.
  - **Verification:** Sandbox tests will assert container removal and timeout cleanup.

- **Finding:** Hardcoded Database Ports.
  - **Severity:** HIGH
  - **Affected module:** `packages/sandbox`, `cli`
  - **Reason:** Assuming `54321` is free can cause race conditions or CI failures.
  - **Action taken:** Will implement dynamic port allocation for PostgreSQL (finding a free port via Node's `net` module before binding Docker).
  - **Verification:** Ensure `DATABASE_URL` accurately reflects the dynamically assigned port.

## Medium Findings

- **Finding:** Incomplete Error Models.
  - **Severity:** MEDIUM
  - **Affected module:** Entire Monorepo
  - **Reason:** `throw new Error('...')` is used everywhere. Sandbox and Migration failures aren't categorized, making programmatic detection by the CLI brittle.
  - **Action taken:** Will introduce typed domain errors (e.g., `SandboxError`, `MigrationError`).
  - **Verification:** E2E test accurately asserts on causal failures rather than string matching.

- **Finding:** Application runner uses arbitrary waits.
  - **Severity:** MEDIUM
  - **Affected module:** `packages/application-runner`
  - **Reason:** `waitForHealthCheck` uses a manual loop. While it hits `/health`, a structured timeout and retry policy is cleaner.
  - **Action taken:** Extract retry logic into a reusable utility.
  - **Verification:** Runner tests confirm exact timeout behaviour.

## Low Findings

- **Finding:** Migration workspace staging isn't isolated per run.
  - **Severity:** LOW
  - **Affected module:** `packages/migration-engine`
  - **Reason:** Staging happens in `fixtures/prisma-workspace`, which could clash if tests run concurrently.
  - **Action taken:** Use `os.tmpdir()` or uniquely named local folders for staging Prisma environments.
  - **Verification:** Ensure temporary directories are fully removed in `finally` blocks.

- **Finding:** Prisma Client pathing and reproducibility.
  - **Severity:** INFORMATIONAL
  - **Affected module:** `apps/poc-app`
  - **Reason:** The current M1 solution outputs the generated clients to `../../node_modules/@prisma/client-v1`. Audit confirms this is clean, completely reproducible from a fresh clone (`npm run build`), avoids committing artifacts, and avoids machine-specific absolute paths.
  - **Action taken:** No change required. The approach is approved for M2-M4.
  - **Verification:** `npm install` and `npm run build` will continue to seamlessly generate clients.

## Changes Made

(To be updated during execution)

## Tests Added

(To be updated during execution)

## Remaining Limitations

(To be updated during execution)

## Verification

(To be updated during execution)
