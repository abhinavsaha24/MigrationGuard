# M11 Security Architecture

## Overview

MigrationGuard M11 implements defense-in-depth across authentication, authorization, input validation, rate limiting, and transport security.

## Authentication

- **Mechanism**: JSON Web Tokens (JWT) signed with `HS256`
- **Secret**: Configurable via `JWT_SECRET` environment variable
- **Token expiry**: `7d` (configurable)
- **Validation hook**: `app.authenticate` pre-validation hook on all protected routes

## Authorization (RBAC)

| Role       | Capabilities                                                                |
| ---------- | --------------------------------------------------------------------------- |
| `ADMIN`    | Login, upload presentation versions, publish versions, all reviewer actions |
| `REVIEWER` | Login, create reviewer decisions (ACCEPTED/REJECTED), read all data         |
| (public)   | Read published presentations, read verification runs                        |

## Input Validation (Zod)

All routes with user-supplied input are validated with Zod schemas before processing:

- **Auth routes**: email format, password minimum length
- **Run routes**: decision enum constrained to `ACCEPTED | REJECTED`, comment optional string
- **Presentation routes**: route param IDs must be non-empty strings; MIME type allow-list enforced at upload

Global Zod error handler in `app.ts` returns standardized `HTTP 400` with structured error body on validation failure.

## Rate Limiting

Configured via `@fastify/rate-limit`:

- **Max requests**: 100 requests per window
- **Window**: 1 minute
- **Scope**: Global (all routes)
- **Response on breach**: `HTTP 429 Too Many Requests`

## CORS

Configured via `@fastify/cors`:

- **Allowed origin**: controlled by `FRONTEND_ORIGIN` environment variable (defaults to configured frontend URL)
- **Credentials**: allowed
- **Methods**: GET, POST, PUT, DELETE, PATCH

## File Upload Security

- **MIME type allow-list**: `application/pdf`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `application/json`
- **Maximum file size**: 50 MB (enforced at multipart level)
- **Empty file rejection**: 0-byte files rejected with `HTTP 400`
- **Path traversal prevention**: file extension sanitized to `[a-zA-Z0-9]` only before use in storage key

## Password Hashing

Passwords hashed with **Argon2id** via the `@node-rs/argon2` package. Seed passwords in development use the same hashing pipeline.

## Known Limitations (LOCAL_PRODUCTION_SIMULATION)

- No TLS/HTTPS — HTTP only in local simulation
- JWT secret in `.env.example` is a placeholder — must be replaced before any real deployment
- MinIO credentials in `docker-compose.prod.yml` are development defaults
