# MigrationGuard M12 Performance

## Execution Overview

This document records the performance characteristics of the MigrationGuard benchmark execution on the M12 release codebase.

## Measurements

- **Total Benchmark Execution Time**: ~85.6 seconds (85672ms average over isolated runs)
- **Engine Overhead**: <500ms per schema evaluation
- **PostgreSQL Sandbox Spin-up**: ~1-2 seconds per isolated run

## Breakdown by Phase

- **Initialization**: Validating the 4 benchmark test cases. (~10ms)
- **Container Provisioning**: Starting isolated PostgreSQL 15 containers for the baseline and target schemas. (~1500ms)
- **Application Workload Simulation**: Generating schema states and executing the test payload. (~2000ms)
- **Compatibility Analysis**: Analyzing discrepancies. (<100ms)
- **Evidence Generation**: Generating cryptographic evidence and uploading to MinIO. (~50ms)

## Performance Findings

The execution is predominantly I/O-bound by Docker container lifecycle management rather than CPU-bound by the compatibility analysis algorithms. The concurrency limits in the M4 runner successfully prevented Docker daemon saturation during parallel test execution.
