# M12 Production Deployment Architecture

## Deployment Status

MigrationGuard is currently operating in a **LOCAL_PRODUCTION_SIMULATION** state. It has not been publicly deployed to a cloud environment.

## Architecture

The simulated production environment utilizes `docker-compose.prod.yml` to orchestrate four primary services:

1. **Backend Application (`backend`)**:
   - Built from `apps/server/Dockerfile`
   - Node.js 20 Fastify API Server
   - Connects to PostgreSQL and MinIO
   - Serves API routes securely with rate-limiting and JWT

2. **Frontend Application (`frontend`)**:
   - Built from `apps/frontend/Dockerfile`
   - Next.js application served via Nginx (port 80)
   - Statically exported and highly performant

3. **Database (`postgres`)**:
   - `postgres:15-alpine`
   - Managed via Prisma ORM
   - Uses persistent volumes (`pgdata`)
   - Internal network only

4. **Object Storage (`minio`)**:
   - S3-compatible blob storage
   - Port 9000 internally; 9002 mapped to host for CLI access
   - Used for cryptographic evidence artifacts

## Security and Concurrency Considerations

- **Concurrency**: Fastify API utilizes `SERIALIZABLE` transactions combined with optimistic `ON CONFLICT DO NOTHING` inserts to prevent race conditions during parallel uploads.
- **Rate Limiting**: Configured at 100 requests per minute via `@fastify/rate-limit`.
- **JWT Vulerabilities**: The platform uses `@fastify/jwt` which internally references `fast-jwt`. Documented vulnerabilities in `fast-jwt` are considered acceptable for local simulation but must be remediated prior to any public cloud deployment.
