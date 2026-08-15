# M11 Audit (M11-AUDIT)

## 1. Current Architecture

- Backend: Fastify + Node.js + TypeScript (`apps/server`).
- CLI/Engines: Independent `packages/*` and `cli/`.
- Database: PostgreSQL (via Prisma).
- Storage: S3/MinIO compatible object storage.
- Auth: JWT + Argon2 hashing, RBAC (ADMIN, REVIEWER).

## 2. Reusable M10 Components

- Fastify server configuration (`app.ts`, `server.ts`).
- Prisma schema (`apps/server/prisma/schema.prisma`).
- Upload handlers (`presentationRoutes.ts`, `runRoutes.ts`).
- JWT authentication logic (`authRoutes.ts`).
- MinIO/S3 storage service (`storageService.ts`).

## 3. Frontend Gaps

- Completely missing. Requires a new Vite + React + TypeScript SPA.
- Needs routing (React Router) for Public Website (`/`, `/research`, `/architecture`, etc.) and Dashboard (`/dashboard`, `/dashboard/runs`, etc.).
- Missing UI components, API integration layer, and state management.

## 4. Backend Deployment Gaps

- Missing production PostgreSQL hosting.
- Missing production S3 compatible storage.
- Missing reverse proxy / HTTPS termination configuration (Nginx/Caddy).
- Missing server startup scripts / PM2 / Docker production configurations.

## 5. Security & Observability Gaps

- Fastify rate limiting not implemented.
- CORS is present but needs explicit production origin constraints.
- Logging (Pino) needs structural tuning for production.

## 6. Technical Debt

- Storage/Database partial failure (orphan S3 objects) remains deferred to M12.

## 7. Deployment Risks

- Exposing undocumented endpoints.
- Uncontrolled cost from large uploads / excessive benchmark runs.

---

## 8. M11 Implementation Decisions

### D-M11-001: Deployment Status — LOCAL_PRODUCTION_SIMULATION

No remote server, cloud credentials, VPS, DNS, or real TLS available. Stack is production-structured but runs locally only.

### D-M11-002: @fastify/rate-limit downgrade to v7

Fastify v4 is installed; `@fastify/rate-limit@9` requires Fastify v5. Downgraded to v7 (Fastify v4 compatible). No functional difference.

### D-M11-003: Zod param validation — min(1) not uuid()

Route IDs use formats like `MG-TEST-<timestamp>` and `PRES-<timestamp>`. UUID enforcement would break existing tests and CLI. `min(1)` prevents empty string injection while allowing all valid application ID formats.

### D-M11-004: ESLint/Prettier ignore benchmark corpus

`benchmark/fixtures/**`, `benchmark/repositories/**`, `benchmark/tmp-prisma-examples/**` excluded from linting. These are third-party test corpora with intentional patterns that violate project lint rules.

### D-M11-005: ReviewDecision enum — ACCEPTED not APPROVED

The Prisma schema defines `enum ReviewDecision { PENDING, ACCEPTED, REJECTED }`. Zod validation corrected to match. Schema not modified.

### D-M11-006: Docker build — network timeout

`npm install` inside Docker builder fails intermittently with `ECONNRESET`. Added `--network-timeout=1000000`. Documented as local network limitation, not architecture defect.
