# MigrationGuard CLI Architecture

The MigrationGuard CLI is the developer-facing entry point for orchestrating database migration compatibility analysis.

## Commands

### `migrationguard verify`

The core verification workflow. Executes a workload against a local matrix of applications and database states to determine compatibility regressions safely in an ephemeral sandbox.

**Options:**

- `-c, --config <path>`: Path to a JSON configuration file.
- `-w, --workload <path>`: Path to a workload JSON file (overrides config).
- `-m, --migration <path>`: Path to the new migration directory (overrides config).
- `-s, --schema <path>`: Path to the Prisma schema (overrides config).
- `-a, --app-dir <path>`: Path to the application root containing startup scripts.

**Configuration File (`migrationguard.config.json`):**

```json
{
  "migration": "prisma/migrations/20260810_remove_user_name",
  "baseMigration": "prisma/migrations/20260801_base",
  "schema": "prisma/schema.prisma",
  "workload": "workload.json",
  "appDir": "./"
}
```

### `migrationguard benchmark`

Executes the MigrationGuard M8 benchmark suite comparing dynamic analysis against static baseline tools like Atlas.

**Options:**

- `--filter <testId>`: Run a specific benchmark test by ID.

## Exit Codes

The CLI strictly uses the following exit codes for CI deterministic evaluation:

| Code | Status                             | Description                                                                                                                                                                      |
| ---- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0`  | **SUCCESS**                        | Verification completed successfully and no compatibility regressions were detected.                                                                                              |
| `1`  | **VERIFIED_COMPATIBILITY_FAILURE** | A genuine application compatibility regression was discovered during verification, or an unsafe database migration execution failure occurred (e.g., data constraint violation). |
| `2`  | **CONFIGURATION_ERROR**            | Invalid CLI inputs, missing files, or bad configuration format.                                                                                                                  |
| `3`  | **INFRASTRUCTURE_FAILURE**         | A required dependency or environment state failed (e.g., Docker not available, PostgreSQL failed to start, application `start:old` crashed on startup).                          |
| `4`  | **UNKNOWN_FAILURE**                | An unexpected exception crashed the verification pipeline.                                                                                                                       |

## Terminal Output Format

The output is formatted for deterministic reading and CI logging:

```
MigrationGuard
────────────────────────────

Migration:
20260810_remove_user_name

Environment:
PostgreSQL
Node.js
Prisma

Compatibility Matrix:

OLD + V1     PASS
NEW + V1     FAIL
OLD + V2     FAIL
NEW + V2     PASS

Result:
VERIFICATION FAILED

Fault:
DESTRUCTIVE_RENAME

Confidence:
CONFIRMED

Evidence:
GET /users/1

Observed:
Invalid `prisma.users.findUnique()` invocation:
The column `users.name` does not exist in the current database.

Reports:
reports/MG-VERIFY-1786759028200.json
reports/MG-VERIFY-1786759028200.md
```

## Security Design

The CLI uses the following security constraints:

- **Child Processes:** Safe arrays using `child_process.spawn` without `shell: true` interpolation, except for required CMD wrappings strictly managed by Node.js.
- **Sanitization:** `DATABASE_URL` credentials are only exposed via localized `process.env` bounds and never `console.log`ed.
- **Cleanup:** All PostgreSQL sandboxes, application processes, and ephemeral volumes are guaranteed to clean up through defensive `try/finally` orchestration, ensuring no orphan environments remain.
