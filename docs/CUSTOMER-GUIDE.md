# MigrationGuard Customer Guide

A comprehensive guide for developers and engineering teams to verify database schema migrations against real application workloads before deploying to production.

---

## Architecture & Verification Flow

```text
CUSTOMER APPLICATION
        ↓
DATABASE SCHEMA
        ↓
MIGRATION FILES
        ↓
APPLICATION WORKLOAD
        ↓
migrationguard.json
        ↓
MigrationGuard CLI
        ↓
Docker PostgreSQL sandbox
        ↓
4-cell compatibility matrix
        ↓
Verdict
        ↓
Evidence artifacts
        ↓
Optional --upload
        ↓
MigrationGuard production dashboard
        ↓
Review result
```

---

## 1. Prerequisites

Before running MigrationGuard on your workstation or in CI/CD, ensure the following are available:

- **Node.js**: Version 20.x or higher (Node 22+ recommended).
- **Docker**: Docker Desktop (macOS/Windows) or Docker Engine (Linux) running with daemon socket access to launch ephemeral containers.
- **Database Engine**: PostgreSQL 14, 15, or 16. (The sandbox orchestrator automatically provisions isolated PostgreSQL containers).
- **Application Runtime**: Node.js applications (e.g., Express, Fastify, NestJS) using Prisma ORM or raw SQL migrations.
- **Migration Files**: A baseline migration (`V1`) and the target migration (`V2`) under test.
- **Hosted Console Access (Optional)**: An account on `https://migrationguard.abhinavsaha.me` if uploading verification runs for team audit and review.

---

## 2. Installation

MigrationGuard CLI can be executed via `npx` or installed as a development dependency in your project:

### Option A: Running via NPX (Recommended for CI & Ad-hoc Runs)

```bash
npx migrationguard verify --config migrationguard.json
```

### Option B: Local Project Dependency

```bash
npm install --save-dev @abhinavsaha24/migrationguard
# or within the monorepo:
npm run build
```

### Option C: Monorepo Development Invocation

```bash
node cli/dist/index.js verify --config migrationguard.json
```

---

## 3. Configuration (`migrationguard.json`)

Place a `migrationguard.json` file in your repository root:

```json
{
  "baseMigration": "./prisma/migrations/20240101000000_v1",
  "migration": "./prisma/migrations/20240102000000_v2",
  "schema": "./prisma/schema.prisma",
  "workload": "./workloads/user-workload.json",
  "appDir": "./apps/poc-app",
  "upload": false
}
```

### Configuration Fields Explained

| Field           | Type      | Required | Description                                                        |
| --------------- | --------- | :------: | ------------------------------------------------------------------ |
| `migration`     | `string`  | **Yes**  | Path to the directory containing target V2 `migration.sql`.        |
| `baseMigration` | `string`  | Optional | Path to the directory containing baseline V1 `migration.sql`.      |
| `schema`        | `string`  | **Yes**  | Path to the active schema definition (e.g., `schema.prisma`).      |
| `workload`      | `string`  | **Yes**  | Path to the JSON workload exercising your application endpoints.   |
| `appDir`        | `string`  | Optional | Root directory of your application package. Defaults to `./`.      |
| `upload`        | `boolean` | Optional | Whether to automatically upload results to the MigrationGuard API. |

### Example Workload (`workloads/user-workload.json`)

```json
{
  "name": "user-service-workload",
  "operations": [
    {
      "id": "get-user-profile",
      "method": "GET",
      "path": "/users/1",
      "expectedStatus": 200,
      "timeoutMs": 5000
    },
    {
      "id": "update-user-status",
      "method": "PUT",
      "path": "/users/1",
      "body": { "status": "ACTIVE" },
      "expectedStatus": 200,
      "timeoutMs": 5000
    }
  ]
}
```

---

## 4. Verification Execution

Run the verification suite:

```bash
npx migrationguard verify --config migrationguard.json
```

### What Happens During Verification:

1. **Ephemeral Sandbox Creation**: Launches an isolated PostgreSQL container on dynamic ephemeral ports with dedicated health checks.
2. **Baseline DB Deployment**: Applies V1 baseline migration SQL to the container.
3. **OLD + V1 Execution**: Boots the pre-migration application code, executes the workload, and establishes baseline telemetry.
4. **NEW + V1 Execution**: Boots the post-migration application code against the unmigrated database to test forward compatibility.
5. **Migration Application**: Executes the target V2 migration SQL inside the running sandbox.
6. **OLD + V2 Execution**: Boots the pre-migration application code against the migrated database to detect backward compatibility breakages.
7. **NEW + V2 Execution**: Boots the post-migration application code against the migrated database to verify target-state functionality.
8. **Differential Analysis**: Compares HTTP status codes, latency, body payloads, and PostgreSQL query error logs across all four states.
9. **Evidence Generation**: Produces tamper-evident JSON and Markdown reports with SHA-256 hashes of inputs and telemetry.
10. **Sandbox Teardown**: Destroys ephemeral PostgreSQL containers and cleans up host ports.

---

## 5. The 4-Cell Compatibility Matrix

MigrationGuard tests every combination of code version and schema version:

| Cell         | Application  | Schema      | What It Proves                                                                                                                                |
| ------------ | ------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **OLD + V1** | Baseline App | Baseline DB | Baseline health: Proves the existing application functions on the existing database.                                                          |
| **NEW + V1** | Target App   | Baseline DB | Forward compatibility: Proves whether new application code can boot before the migration runs.                                                |
| **OLD + V2** | Baseline App | Migrated DB | **Critical Backward Compatibility**: Proves whether existing running instances survive during rolling deployment after the DB migration runs. |
| **NEW + V2** | Target App   | Migrated DB | Target state: Proves that the new code functions properly on the new schema once rollout completes.                                           |

### Interpretation Rules:

- If **OLD + V2 fails**, deploying the migration will crash active application instances serving traffic during rolling deployments.
- A safe zero-downtime migration requires **OLD + V1 = PASS**, **OLD + V2 = PASS**, and **NEW + V2 = PASS**.

---

## 6. Verdicts & Status Meanings

MigrationGuard emits explicit status classifications:

| Verdict            | Status Category        | Meaning                                                                                                |
| ------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `PASS`             | Safe                   | All matrix cells passed; the migration is backward compatible.                                         |
| `FAIL`             | Unsafe                 | Incompatibility detected in one or more required matrix cells.                                         |
| `SAFE_VERIFIED`    | Safe (High Confidence) | All modified columns were exercised by the workload and verified safe.                                 |
| `SAFE_UNEXERCISED` | Safe (Unexercised)     | No errors were triggered, but some modified schema fields were not touched by the workload.            |
| `UNSAFE`           | Unsafe                 | Detected destructive operations (e.g., column drop, rename, type change without compatibility bridge). |

### Process Exit Codes:

- `0`: All required compatibility cells passed.
- `1`: Incompatibility verified and causal evidence captured.
- `2`: Configuration or schema syntax error.
- `3`: Infrastructure error (Docker failure, port binding conflict).
- `4`: Unhandled runtime failure.

---

## 7. Evidence Artifacts

Every verification run produces forensic evidence in the `reports/` directory:

- `reports/MG-VERIFY-<timestamp>.json`
- `reports/MG-VERIFY-<timestamp>.md`

### Contents of Evidence JSON:

- **`runId`**: Unique execution identifier (e.g., `MG-VERIFY-1789311598858`).
- **`timestamp`**: UTC ISO timestamp of verification.
- **`faultType`**: Classification of incompatibility (e.g. `DESTRUCTIVE_RENAME`, `COLUMN_DROP`, `TYPE_NARROWING`).
- **`confidence`**: Statistical assessment (`CONFIRMED`, `PROBABLE`, `UNKNOWN`).
- **`operationId`**: Identifier of the exact workload operation that failed.
- **`actualResult`**: Captured HTTP response code, headers, and response body.
- **`databaseError`**: Raw PostgreSQL error code and message (e.g., `column "full_name" does not exist`).
- **`inputHashes`**: Deterministic SHA-256 hashes of V1 schema, V2 schema, migration SQL, and workload JSON.
- **`workloadCoverage`**: Ratio and list of modified database columns queried during the test run.

---

## 8. Uploading to the Hosted Dashboard

You can publish results to the centralized MigrationGuard telemetry console:

### Production Endpoint

```text
https://migrationguard.abhinavsaha.me
```

### Step 1: Obtain API Token

Authenticate with your registered credentials:

```bash
curl -s -X POST https://migrationguard.abhinavsaha.me/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@migrationguard.dev", "password": "<YOUR_PASSWORD>"}'
```

Response:

```json
{
  "token": "<JWT_BEARER_TOKEN>",
  "user": { "id": "...", "email": "admin@migrationguard.dev", "role": "ADMIN" }
}
```

### Step 2: Run Verification with `--upload`

```bash
export MG_API_URL="https://migrationguard.abhinavsaha.me"
export MG_API_TOKEN="<JWT_BEARER_TOKEN>"

npx migrationguard verify --config migrationguard.json --upload
```

---

## 9. Reviewing Results in the Hosted Dashboard

Navigate to `https://migrationguard.abhinavsaha.me`:

1. **Authentication**: Secure login via JWT with role-based permissions (Viewer, Engineer, Admin).
2. **Runs Explorer (`/#/dashboard/runs`)**:
   - Filter by status: `PASS (Safe)` vs. `FAIL (Unsafe)`.
   - Search by migration name or run ID.
   - Paginated table showing durations, timestamps, and overall verdicts.
3. **Run Detail View (`/#/dashboard/runs/:id`)**:
   - Visual 4-cell compatibility matrix with execution durations for each cell.
   - Interactive evidence cards showing HTTP failures, PostgreSQL error traces, and causal analysis.
   - Engineering decisions: Record approval, rejection, or waiver notes for compliance auditing.
   - **Assistant Drawer**: Click _"Explain this result"_ or any failed matrix cell's _"[Explain this state]"_ to query the MigrationGuard Assistant. The assistant explains observed errors, cites exact evidence IDs, and provides contextual remediation suggestions without ever altering deterministic verdicts.
   - **Repair Review Modal**: Click _"Review repair proposal"_ to inspect the minimal compatibility-preserving change set, unified schema diffs, 4-phase rollout plan, and risks.

---

## 10. Guided Repair Workflow

When a verification fails with an incompatibility (such as a destructive column rename or NOT NULL constraint addition), MigrationGuard's Guided Repair engine generates a non-breaking, minimal change proposal.

### Workflow:

1. **Failure Observation**:
   Run verification:

   ```bash
   npx migrationguard verify
   ```

   If a backward compatibility failure occurs (e.g., in `OLD_APP + NEW_SCHEMA`), MigrationGuard flags the fault taxonomy.

2. **Inspect Repair Proposal**:
   Inspect proposed modifications without changing any files:

   ```bash
   npx migrationguard repair --show
   ```

   Displays:
   - Current schema hash vs. proposed schema hash
   - Affected schema models and properties
   - Unified line-by-line diff (`+` / `-`)
   - 4-phase rollout strategy (Phase 1 Expand, Phase 2 Backfill, Phase 3 Dual-Write, Phase 4 Contract)
   - Identified operational risks and assumptions

3. **Authority Approval & Application**:
   To apply the repair to your local schema:

   ```bash
   npx migrationguard repair
   ```

   Review the prompt and confirm with `y`. For automated scripts, pass `--yes` or `--approve <proposalId>`.

4. **Independent Post-Repair Re-Verification**:
   The repair tool automatically re-executes the 4-cell matrix to confirm all states pass (`PASS / SAFE`). The repair is marked `VERIFIED` only if the deterministic engine independently validates it.

---

## 11. CI/CD Pipeline Integration

Add MigrationGuard to GitHub Actions, GitLab CI, or Jenkins to block breaking migrations automatically:

```yaml
name: Migration Compatibility Verification

on:
  pull_request:
    paths:
      - 'prisma/migrations/**'
      - 'prisma/schema.prisma'

jobs:
  verify-migration:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install Dependencies
        run: npm ci

      - name: Build Application
        run: npm run build

      - name: Run MigrationGuard Verification
        env:
          MG_API_URL: https://migrationguard.abhinavsaha.me
          MG_API_TOKEN: ${{ secrets.MIGRATIONGUARD_API_TOKEN }}
        run: |
          # Verify Docker daemon is accessible
          docker info

          # Execute verification and upload report
          npx migrationguard verify --config migrationguard.json --upload
```

If an incompatibility is detected, the command exits with code `1`, blocking merge and alerting the pull request author.

---

## 11. Troubleshooting Guide

### Docker Daemon Connectivity

- **Symptom**: `Cannot connect to the Docker daemon` or `connect ENOENT //./pipe/docker_engine`.
- **Remedy**: Ensure Docker Desktop is running and that your user has permissions to interact with the Docker socket.

### Port Binding Conflict

- **Symptom**: `bind: address already in use`.
- **Remedy**: Ephemeral ports are bound dynamically. If a port collision occurs, inspect active processes with `netstat` or shut down orphaned test containers with `docker rm -f $(docker ps -aq --filter label=migrationguard)`.

### Application Boot Timeout

- **Symptom**: `Application failed to start within timeout (15000ms)`.
- **Remedy**: Ensure the target application has been compiled (`npm run build` in `appDir`) and that its entrypoint script responds to `GET /health` or starts listening promptly.

### Authentication & Upload Errors

- **Symptom**: `REMOTE PERSISTENCE FAILED (401 Unauthorized)`.
- **Remedy**: Verify that `MG_API_TOKEN` is set, unexpired, and properly formed. Ensure `MG_API_URL` points to `https://migrationguard.abhinavsaha.me`.

---

## 12. Security & Data Privacy

When `--upload` is used:

- **Transmitted Data**: Migration name, total duration, matrix cell statuses, HTTP status codes, captured SQL error text, SHA-256 schema hashes, and column coverage statistics.
- **Never Transmitted**: Application source code, database passwords, customer user data, or production connection strings.
- **Transport Security**: All API communication is strictly encrypted over HTTPS via TLS 1.3.
- **Storage Security**: Run records are stored in PostgreSQL with parameterized queries. Evidence payloads in S3/MinIO are strictly access-controlled behind JWT authentication.

---

## 13. Scope & Current Limitations

- **Database Engine**: Supports **PostgreSQL** (PostgreSQL 14, 15, and 16). MySQL, SQLite, and CockroachDB are roadmap items.
- **Application Runner**: Currently supports **Node.js** applications. Python, Go, and Ruby runners are under development.
- **Local/CI Docker Execution**: The verification engine executes Docker sandboxes locally or within your CI runner. The hosted website functions solely as a review, telemetry, and audit console; it does not execute arbitrary untrusted Docker workloads on remote servers.
