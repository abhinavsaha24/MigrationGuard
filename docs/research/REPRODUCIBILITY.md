# RESEARCH REPRODUCIBILITY

This document outlines the exact methodology required to reproduce the MigrationGuard evaluation benchmark and verify the results stated in the `MIGRATIONGUARD-RESEARCH-PAPER.md`.

## 1. Environment Setup

The evaluation benchmark does not require a full production deployment. It requires:

- Node.js (v20+)
- Docker Desktop / Daemon (active and able to bind ports)
- Windows PowerShell / WSL / Bash

```bash
git clone <repository_url> migrationguard
cd migrationguard
npm install
npm run build
```

## 2. Benchmark Execution

To reproduce the evaluation, execute the benchmark suite from the CLI:

```bash
npm run benchmark
```

## 3. Expected Execution Flow

The orchestrator will:

1. Spin up an ephemeral PostgreSQL sandbox for **Track A**.
2. Run the `express-real` workload (which adds a nullable column `bio`).
3. Evaluator will classify this as `SAFE`.
4. Spin up an ephemeral PostgreSQL sandbox for **Track B**.
5. Run the `type-narrowing` workload (which alters an `Integer` to a `SmallInt`).
6. Evaluator will classify this as `UNSAFE` (Type Narrowing fault).
7. Spin up an ephemeral PostgreSQL sandbox for **Track C**.
8. Run the `add-non-null-column` workload.
9. Evaluator will classify this as `UNSAFE`.
10. Spin up an ephemeral PostgreSQL sandbox for **Track D**.
11. Run the `drop-column` workload.
12. Evaluator will classify this as `UNSAFE`.

## 4. Expected Output

At the conclusion of the test, the CLI will output:

```json
{
  "tp": 2,
  "tn": 2,
  "fp": 0,
  "fn": 0,
  "precision": "1.00",
  "recall": "1.00",
  "f1": "1.00"
}
```

## 5. Artifact Verification

The generated markdown report (`docs/benchmark/RESULTS.md`) will contain a detailed breakdown of the exact faults detected by the engine and how they correlate to the ground truth constraints defined in `docs/benchmark/GROUND-TRUTH.md`.
