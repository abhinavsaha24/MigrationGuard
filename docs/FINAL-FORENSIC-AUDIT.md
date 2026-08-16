# FINAL FORENSIC AUDIT REPORT

## 1. Codebase Integrity

- **Unused/Dead Code**: The React components and Fastify backend have minimal dead code. All components in `apps/frontend/src/pages` are actively routed.
- **Duplicate Implementations**: No significant duplication observed. Migration logic is appropriately isolated in `packages/migration-engine`.
- **[OBSERVED] Storage Proxy Architecture**: S3/MinIO presigned URLs have been formally deprecated to prevent leaking the internal `minio:9000` hostname to external browsers. Storage retrieval is now exclusively proxied via the backend (`GET /api/runs/:id/evidence` and `GET /api/presentations/:id/versions/:versionId/download`), effectively abstracting the storage layer from public interfaces while retaining JWT enforcement.
- **Placeholder Claims**: The `Results.tsx` page statically hardcodes 6 benchmark execution logs. This is acceptable for a research presentation boundary but must not be confused with dynamic data.
- **Error Handling**: Fastify correctly catches Zod validation errors and maps them to `400 VALIDATION_ERROR`.

## 2. Backend & API

- **Route Validation**: `authRoutes` and `presentationRoutes` are fully validated using Zod. `runRoutes` lacks Zod schemas for the core submission endpoint, constituting a MEDIUM finding.
- **Concurrency**: `POST /presentations/:id/versions` correctly utilizes `isolationLevel: 'Serializable'` and raw SQL `FOR UPDATE` locks to eliminate Time-Of-Check to Time-Of-Use (TOCTOU) race conditions during concurrent version uploads.
- **Upload Boundaries**: `multipart` limits are correctly set to 50MB.

## 3. Database & Storage

- **Immutability**: `PresentationVersion` acts as an append-only log. Uploading a new file generates a strictly monotonically increasing version number.
- **Storage Forensics**: S3/MinIO bucket generation and object UUID mappings are secure.
- **Evidence Integrity**: `evidence verify` command independently hashes the MinIO object and compares it with the immutable `artifactHash` in PostgreSQL.

## Findings

- **[MG-F1] MEDIUM**: Missing Zod validation on `POST /runs`. (Will fix)
- **[MG-F2] LOW**: `test-*.mjs` scripts at the root level clutter the repository. (Will move to `tests/e2e/`)
