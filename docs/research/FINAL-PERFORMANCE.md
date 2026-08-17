# FINAL PERFORMANCE METRICS

## Measured Performance Data

_Data recorded on standard local execution context (Windows 11 / Node 20.20.2)._

| Operation                     | Metric (Actual)    | Notes                                                                                                         |
| :---------------------------- | :----------------- | :------------------------------------------------------------------------------------------------------------ |
| **Clean Stack Startup**       | ~20 - 25 seconds   | Cold start for Postgres, MinIO, Frontend, and Backend containers via `docker-compose up --build`.             |
| **Backend Startup (API)**     | ~1.5 - 2.5 seconds | Time from container launch to Fastify listening on port 3000, including Prisma generate and migration checks. |
| **Verification Runtime (M9)** | ~30 - 32 seconds   | Time to run `npm run verify`, orchestrating the matrix engine against the M1 schema.                          |
| **Benchmark Runtime (M8)**    | ~111.6 seconds     | Execution time to iterate the 4-case ground truth matrix, orchestrating multiple sandboxes.                   |
| **Reconciliation (M12)**      | < 100 milliseconds | Storage/Database reconciliation scanning over a small dataset.                                                |
| **Artifact Upload**           | < 200 milliseconds | Transfer and S3 (MinIO) persist of small (PDF/JSON) files.                                                    |
| **Core Test Suite**           | ~29.6 seconds      | Execution of 31 tests across 9 files using Vitest (`npm run test`).                                           |

## Detailed Phase Breakdown (M12)

| Phase                      | Duration | Details                                                                         |
| :------------------------- | :------- | :------------------------------------------------------------------------------ |
| **Initialization**         | ~10ms    | Validating the 4 benchmark test cases.                                          |
| **Container Provisioning** | ~1500ms  | Starting isolated PostgreSQL 15 containers for the baseline and target schemas. |
| **Application Workload**   | ~2000ms  | Generating schema states and executing the test payload.                        |
| **Compatibility Analysis** | <100ms   | Analyzing discrepancies.                                                        |
| **Evidence Generation**    | ~50ms    | Generating cryptographic evidence and uploading to MinIO.                       |

## Analysis

The execution is predominantly I/O-bound by Docker container lifecycle management rather than CPU-bound by the compatibility analysis algorithms. The concurrency limits in the M4 runner successfully prevented Docker daemon saturation during parallel test execution.

The performance overhead is heavily dominated by the sandbox initialization (Docker container spinning) and the Prisma Engine initialization for each application runner instance. This is expected and acceptable for a validation platform running asynchronous/batch CI tasks rather than real-time synchronous UI requests.
