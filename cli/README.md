# MigrationGuard (`@abhinavsaha24/migrationguard`)

> Autonomous continuous compatibility verifier for database migrations across application versions.

MigrationGuard eliminates database migration surprises in zero-downtime rolling deployments. While static SQL linters only check migration syntax or obvious schema hazards, MigrationGuard executes a full **4-cell dual-version compatibility matrix** against dynamic PostgreSQL sandboxes to verify cross-version compatibility between old and new application instances and database states.

---

## 1. Requirements

- **Node.js**: `>= 20.0.0`
- **Docker**: Running Docker daemon with permissions to spawn ephemeral PostgreSQL containers
- **Database**: PostgreSQL (currently tested and supported)
- **Application**: Node.js/TypeScript application providing old (`start:old`) and new (`start:new`) launch targets and a health endpoint (`/health`)

---

## 2. Installation

Install MigrationGuard as a development dependency in your project:

```bash
npm install --save-dev @abhinavsaha24/migrationguard
```

Verify installation:

```bash
npx migrationguard --help
```

---

## 3. Configuration (`migrationguard.json`)

Create a `migrationguard.json` file in your project root:

```json
{
  "baseMigration": "./prisma/migrations/20240101000000_v1",
  "migration": "./prisma/migrations/20240102000000_v2",
  "schema": "./prisma/schema.prisma",
  "workload": "./workloads/user-workload.json",
  "appDir": "./",
  "upload": false
}
```

### Configuration Fields

| Field           | Type      | Required | Description                                                                               |
| :-------------- | :-------- | :------: | :---------------------------------------------------------------------------------------- |
| `migration`     | `string`  | **Yes**  | Path to the directory containing target V2 `migration.sql`.                               |
| `baseMigration` | `string`  | Optional | Path to the directory containing baseline V1 `migration.sql`.                             |
| `schema`        | `string`  | **Yes**  | Path to the schema definition (e.g., `schema.prisma`).                                    |
| `workload`      | `string`  | **Yes**  | Path to the workload JSON definition exercising endpoints.                                |
| `appDir`        | `string`  | Optional | Root directory of your application package (containing `package.json`). Defaults to `./`. |
| `upload`        | `boolean` | Optional | Whether to upload results to the hosted review dashboard. Defaults to `false`.            |

All relative paths are automatically resolved relative to the directory containing `migrationguard.json`.

---

## 4. The 4-Cell Compatibility Matrix

During rolling deployments, instances running older application code and newer application code concurrently interact with the database before and after the migration is applied. MigrationGuard systematically exercises all four execution states:

| Quadrant   | Application Version | Database Schema | Deployment Significance                                                                                                                         |
| :--------- | :-----------------: | :-------------: | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cell 1** |       **OLD**       |     **V1**      | Pre-deployment baseline. Confirms application operates correctly under baseline conditions.                                                     |
| **Cell 2** |       **NEW**       |     **V1**      | Forward compatibility. Evaluates whether a new application can tolerate an unmigrated database.                                                 |
| **Cell 3** |       **OLD**       |     **V2**      | Backward compatibility. Evaluates whether the existing application continues functioning when the database is migrated before older pods drain. |
| **Cell 4** |       **NEW**       |     **V2**      | Post-deployment steady state. Verifies new application operates correctly on the upgraded schema.                                               |

---

## 5. Running Verification

Execute verification with:

```bash
npx migrationguard verify --config migrationguard.json
```

You can also override configuration values via CLI flags:

```bash
npx migrationguard verify \
  --migration ./prisma/migrations/20240102000000_v2 \
  --schema ./prisma/schema.prisma \
  --workload ./workloads/user-workload.json \
  --app-dir ./
```

### Exit Codes

| Exit Code | Meaning                                                                                                        | Action Required                                                             |
| :-------: | :------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
|    `0`    | **VERIFIED PASS**: Migration is backward-compatible across the 4-cell matrix.                                  | Safe to merge and deploy.                                                   |
|    `1`    | **VERIFIED FAIL**: Incompatibility detected (e.g., destructive column rename, type narrowing, missing column). | Block deployment; rewrite migration into multi-phase expand/contract steps. |
|    `2`    | **CONFIGURATION ERROR**: Missing configuration file, invalid JSON, or missing paths.                           | Correct configuration arguments.                                            |
|    `3`    | **INFRASTRUCTURE FAILURE**: Docker container startup error or database connection failure.                     | Check Docker daemon and system resources.                                   |
|    `4`    | **UNKNOWN ERROR**: Unhandled exception during execution.                                                       | Inspect error message and stack trace.                                      |

---

## 6. Guided Repair Workflow (`migrationguard repair`)

When verification fails due to a detected schema incompatibility (such as `DESTRUCTIVE_RENAME` or `NOT_NULL_INCOMPATIBILITY`), MigrationGuard provides a deterministic repair planning system.

The repair engine computes a **minimal compatibility-preserving change set** (e.g. Expand/Contract intermediate representation, nullable backfill) with exact unified diffs, multi-phase migration rollout plans, and risk assessments.

### Inspecting Repair Proposals (`--show`)

To inspect a proposed repair without making any local modifications:

```bash
npx migrationguard repair --show
```

Output displays:

- Fault taxonomy classification (e.g. `DESTRUCTIVE_RENAME`)
- Directly affected and dependent schema objects
- Unified schema diff (`+` / `-` additions and modifications)
- Full proposed schema
- 4-phase rollout plan (Expand, Dual Write, Backfill, Contract)
- Compatibility risks, assumptions, and SHA-256 integrity digest

### Interactive Review & Application

```bash
npx migrationguard repair
```

MigrationGuard will present the complete proposal and prompt for explicit user authority approval:

```
Apply this compatibility repair to schema and re-verify? [y/N]
```

### Automation & CI Modes

To approve and apply via flags:

```bash
# Non-interactive approval
npx migrationguard repair --yes

# Or explicitly by proposal ID:
npx migrationguard repair --approve PRP-df721b242160d255
```

### Absolute Safety Guarantees

1. **Zero Silent Edits**: Neither `verify` nor `repair --show` will ever modify local files. Files are touched only upon explicit authority approval (`--approve` or `--yes` or answering `y`).
2. **Staleness Protection**: Every proposal is cryptographically bound to `sourceSchemaHash`. If the local schema is modified after proposal generation, application is rejected as stale (`CURRENT_SCHEMA_HASH != sourceSchemaHash`).
3. **Independent Post-Repair Re-Verification**: Applying a repair automatically triggers an independent 4-cell matrix re-verification. Success is declared only when all 4 states pass deterministically.

---

## 7. Generated Evidence Reports

Following verification, MigrationGuard generates structured artifacts in the local `reports/` directory:

- **JSON Report** (`reports/<run-id>.json`): Machine-readable verification data including individual quadrant statuses, durations, schema telemetry, and evidence records.
- **Markdown Report** (`reports/<run-id>.md`): Human-readable summary suitable for pull request comments or CI audit trails.

### Optional Hosted Review Dashboard

If you wish to upload verification results to your MigrationGuard telemetry console for collaborative review, pass `--upload` and set `MG_API_TOKEN`:

```bash
export MG_API_URL="https://migrationguard.abhinavsaha.me"
export MG_API_TOKEN="<your-auth-token>"

npx migrationguard verify --config migrationguard.json --upload
```

Uploading is entirely optional. Local verification is 100% autonomous and requires no network connectivity or hosted account.

---

## 8. Scope & Research-Prototype Limitations

- **Hash Integrity**: Artifact hashes are computed as SHA-256 cryptographic digests for tamper detection and evidence integrity. They represent content hashes, not asymmetric cryptographic digital signatures.
- **Scope**: MigrationGuard currently evaluates schema migrations against specified synthetic workloads and application endpoints in isolated Docker sandboxes. It does not replace comprehensive integration testing or performance load testing.
- **Zero-Downtime Design**: For backward compatibility (preventing Cell 3 failures), destructive operations such as column drops or renames must follow an expand-and-contract pattern (add column -> dual write -> backfill -> read new -> drop old).

---

## 9. License

MIT License. See [LICENSE](./LICENSE) for details.
