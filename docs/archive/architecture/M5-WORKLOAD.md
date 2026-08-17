# M5 Workload Replay Platform Architecture

## Overview

The Workload Replay Platform decouples the definition of compatibility experiments from the CLI implementation. Instead of hardcoding API requests, the system loads a deterministic JSON definition (a Workload) and sequentially executes its Operations against the target application instance.

## Architecture

```
                     CLI
                      │
                      ▼
                Workload Loader
                      │
                      ▼
                Replay Engine
                      │
                      ▼
             Application Runner
                      │
                      ▼
                 Application
                      │
                      ▼
                PostgreSQL
```

## Workload Model

A Workload is represented as a JSON document containing basic metadata and a strict array of operations.

```json
{
  "id": "example-workload",
  "name": "Example Workload",
  "description": "Demonstrates sequential HTTP calls",
  "operations": [
    {
      "id": "op1",
      "method": "GET",
      "path": "/users/1",
      "expect": {
        "status": 200
      }
    }
  ]
}
```

## Validation & Loader

The `WorkloadLoader` strictly validates:

- Presence of required fields (`id`, `name`, `operations`).
- Valid `method` and `path` for each operation.
- Rejects duplicate operation IDs.

It does NOT perform network operations or resolve URLs.

## Replay Engine

The `WorkloadReplayEngine` is responsible for strictly deterministic sequential execution:

- **Sequential Guarantee:** Operations are executed in the exact order defined in the JSON.
- **Native Fetch:** Node's built-in `fetch` is used. No bloated HTTP frameworks are required.
- **Configurable Timeouts:** Implemented via `AbortController`. The default timeout is 5000ms. If an operation hangs, it resolves as a `504 Gateway Timeout` equivalent.
- **Response Capture:** All responses, status codes, and execution durations (`durationMs`) are captured and mapped into a structured `WorkloadResult`.

## Error Handling

- Engine errors (e.g., DNS failures, connection refused) are mapped to `500` status with structured error messages.
- Timeouts are explicitly captured and mapped to `504`.
- The `WorkloadReplayEngine` **does not** judge whether a failure is an unsafe migration (e.g., database column missing). It purely observes and reports HTTP-level execution status.

## Security Restrictions

- Workloads are strictly data structures. No JavaScript evaluation (`eval`) or shell execution is permitted.
- Base URLs are restricted to `http://localhost` or `http://127.0.0.1` during M5 execution to prevent accidental SSRF against external domains in automated CI loops.
- Arbitrary credentials should not be persisted in Workload definitions.
