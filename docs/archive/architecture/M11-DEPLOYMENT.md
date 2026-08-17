# M11 Deployment Architecture

## Deployment Status

**LOCAL_PRODUCTION_SIMULATION**

This stack is production-structured and reproducible, but is NOT publicly deployed. No remote server, cloud provider, VPS, DNS, or real TLS certificate is involved.

## Stack Overview

```
┌───────────────────────────────────────────────────────┐
│                    HOST (localhost:80)                 │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │            Nginx Reverse Proxy                  │  │
│  │  /api/* → backend:3001                          │  │
│  │  /*     → frontend static files                 │  │
│  └─────────────────────────────────────────────────┘  │
│           │                       │                   │
│  ┌────────┴────────┐   ┌──────────┴────────┐          │
│  │  React + Vite   │   │  Fastify + Node   │          │
│  │  Frontend (SPA) │   │  Backend API      │          │
│  │  (Nginx static) │   │  Port: 3001       │          │
│  └─────────────────┘   └──────────┬────────┘          │
│                                   │                   │
│                    ┌──────────────┴──────────────┐    │
│                    │         PostgreSQL 15        │    │
│                    │         Port: 5432           │    │
│                    └──────────────────────────────┘    │
│                    ┌──────────────────────────────┐    │
│                    │         MinIO (S3-compat)    │    │
│                    │         Port: 9000/9001      │    │
│                    └──────────────────────────────┘    │
└───────────────────────────────────────────────────────┘
```

## Services

| Service    | Image                | Port (host) | Role                         |
| ---------- | -------------------- | ----------- | ---------------------------- |
| `frontend` | `nginx:alpine` + SPA | 80          | Static file serving + proxy  |
| `backend`  | `node:20-alpine`     | (internal)  | Fastify REST API             |
| `postgres` | `postgres:15-alpine` | (internal)  | Relational persistence       |
| `minio`    | `minio/minio`        | 9000, 9001  | S3-compatible object storage |

## Starting the Stack

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

## Environment Configuration

Copy `.env.example` to configure the backend environment variables. In this simulation, secrets are embedded in `docker-compose.prod.yml`. In a real production deployment, these must be injected via a secrets manager.

## Key Design Decisions

1. **Nginx as reverse proxy**: Single port ingress (80) routes `/api/*` to backend; serves the React SPA for all other paths with `try_files` fallback for client-side routing.
2. **Multi-stage Docker builds**: Builder stage compiles TypeScript; production stage copies only `dist/` and production `node_modules` — minimizes image size and attack surface.
3. **MinIO for S3-compatible storage**: Drop-in replacement for AWS S3. Production deployment would swap `S3_ENDPOINT` to an AWS endpoint.
4. **No mock TLS**: Simulated as HTTP-only locally. Real deployment requires a TLS termination layer (e.g., Caddy, Let's Encrypt, or cloud load balancer).
