# MigrationGuard M9 Security Audit

## Objective

Review the system boundaries, child process executions, file path resolutions, and environment variable handlers introduced in M9 (CLI & CI Integration) to ensure safe execution in hostile environments and CI pipelines.

## Audit Findings

### 1. `child_process.spawn` Security

**Finding:** `packages/application-runner/src/index.ts` previously utilized `shell: process.platform === 'win32'` which resulted in `[DEP0190] DeprecationWarning` regarding unescaped shell interpolation.
**Resolution:** Replaced the unsafe shell delegation with explicit command targeting (`npm.cmd` on Windows, `npm` otherwise) and strictly passed `shell: false`. Arguments are passed as discrete array elements ensuring no shell injection is possible.

### 2. Environment Variables & Secret Leakage

**Finding:** The CLI dynamically generates `DATABASE_URL` for ephemeral PostgreSQL sandboxes.
**Resolution:** The orchestrator exclusively passes this dynamically generated URL in process bounds to the target Applications via `env: { ...process.env, DATABASE_URL }`.

- The CLI output formally omits printing the `DATABASE_URL`.
- The evidence JSON models restrict the captured error details to database messages (`error.message`) and workload HTTP bodies.
- GitHub Actions workflow operates without any repository secrets as it runs locally deterministic fixtures.

### 3. File Path Traversal

**Finding:** The CLI receives `--config`, `--workload`, and `--migration` inputs.
**Resolution:** All user inputs are rigorously passed through `path.resolve(cwd, input)` preventing relative transversal escape and verified using `fs.existsSync()` before execution continues.

### 4. Ephemeral Resource Teardown

**Finding:** Interrupted executions could orphan Node.js background services or Docker containers.
**Resolution:** The CLI verification pipeline is bounded by a rigorous `try/finally` block that synchronously guarantees `sandbox.stop()` is invoked even on fatal exceptions.

## CI Workflow Posture

- Runs entirely on standard `ubuntu-latest` ephemeral runners.
- Employs GitHub native `actions/checkout@v4` with restricted tokens (default GITHUB_TOKEN has read capabilities).
- Does not expose `env` contents to artifacts.
- Utilizes deterministic test sets (`M1` fixture) meaning no untrusted third-party workloads are fetched or executed without deliberate invocation.
