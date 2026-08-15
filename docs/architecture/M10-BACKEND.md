# M10: Backend Architecture

The M10 backend transforms MigrationGuard from a purely local CLI verification tool into a persistent hosted service, capable of storing verification runs, evidence, compatibility matrices, presentations, and reviewer decisions.

## Guiding Principles

1. **Decoupled Verification Engine:** The verification engine (Runner, MigrationEngine, MatrixEngine) remains stateless and executes within the `cli` or CI context. The backend does not duplicate verification execution logic. It serves purely as the system of record.
2. **Real-world Backend Foundation:** Node.js, Fastify, TypeScript, and Prisma are utilized for robust typing and performance.
3. **Immutability of Runs and Presentations:** Verification runs and evidence are immutable once created. Presentations are versioned explicitly, preventing destructive overwrites.

## Tech Stack

- **API Framework:** Fastify
- **Language:** TypeScript
- **Database:** PostgreSQL (via Prisma ORM)
- **Object Storage:** S3-compatible API (MinIO for local development)
- **Authentication:** JWT and Argon2 for password hashing.
- **Validation:** Zod (via Fastify schemas and plugins)

## Services and Integrations

- **AuthService:** Validates user credentials against the persistent database, returning JWTs. Role-Based Access Control (RBAC) supports `ADMIN` and `REVIEWER` roles.
- **StorageService:** Abstracts uploads and presigned URL generation for presentation files and massive JSON evidence reports, isolating database size bloat.
- **RunService:** Stores the `CompatibilityMatrix` and associated `EvidenceRecords`.
- **ReviewerDecisionService:** Tracks async approval workflows where a human must review the generated evidence before authorizing a deployment in an external system.

## Deployment Strategy

For local development, `docker-compose.yml` provides a localized PostgreSQL instance and MinIO container. In production, this architecture will be deployed on a standard cloud VM or Kubernetes cluster (to be completed in M12), mapping the PostgreSQL and S3 configuration to managed services.
