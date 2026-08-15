# MigrationGuard Benchmark: Repository Selection

## Objective

To evaluate MigrationGuard against real-world migration patterns, we require a diverse set of open-source repositories utilizing Node.js, TypeScript, PostgreSQL, and Prisma. The selection process filters for reproducibility, verifiable migration histories, and representative application schemas.

## Candidate Repositories

### 1. Prisma Examples (`prisma/prisma-examples`)

- **URL**: https://github.com/prisma/prisma-examples
- **Commit SHA**: pinned to `latest` (cloned locally)
- **License**: MIT
- **Database**: PostgreSQL (via `orm/typescript/rest-express`)
- **ORM**: Prisma
- **Migration Mechanism**: `prisma migrate dev`
- **Representative Workloads**: Standard REST endpoints for Users/Posts.
- **Reproducibility**: **INCLUDED** (Track A). The `rest-express` project inside the monorepo provides a perfectly contained, easily orchestrated benchmark target with clean schema structure.

### 2. Remix Blues Stack (`remix-run/blues-stack`)

- **URL**: https://github.com/remix-run/blues-stack
- **Commit SHA**: pinned to `latest` (cloned locally)
- **License**: MIT
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Migration Mechanism**: `prisma migrate deploy`
- **Representative Workloads**: User authentication, Notes CRUD.
- **Reproducibility**: **INCLUDED** (Track A). A full-stack framework with built-in PostgreSQL/Prisma conventions. Highly reproducible in isolated environments.

### 3. Cal.com (`calcom/cal.com`)

- **URL**: https://github.com/calcom/cal.com
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Reproducibility**: **EXCLUDED**.
  - **Reason**: Cal.com is a massive monolithic monorepo. Reproducing it reliably for thousands of permutations within a sandboxed CI benchmark runner introduces excessive infrastructure flakiness. Dependency installation alone requires substantial RAM overhead unsuitable for lightweight localized fault injection.

### 4. Maybe Finance (`maybe-finance/maybe`)

- **URL**: https://github.com/maybe-finance/maybe
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Reproducibility**: **EXCLUDED**.
  - **Reason**: Requires heavy external infrastructure dependencies (Redis, background queues) that prevent rapid tear-down and spin-up of the test matrices.

### 5. Epic Stack (`epicweb-dev/epic-stack`)

- **URL**: https://github.com/epicweb-dev/epic-stack
- **Database**: SQLite (default)
- **ORM**: Prisma
- **Reproducibility**: **EXCLUDED**.
  - **Reason**: Relies on SQLite heavily by default for the local reproducible environments. Transitioning the full test harness to PostgreSQL for reliable migration execution across our matrix introduces uncontrolled variables into the application layer.

## Conclusion

The benchmark will proceed using **Track A** targets derived from `prisma-examples` and `blues-stack`, combined with isolated **Track B** deterministic fixtures for pure SQL-fault verification.
