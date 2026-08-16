# FINAL SECURITY REVIEW

## 1. Authentication & JWT

- **Mechanism**: The backend uses `@fastify/jwt` to issue tokens.
- **Roles (RBAC)**: Two roles exist (`ADMIN` and `REVIEWER`). Endpoints correctly enforce these roles via custom `preValidation` hooks (e.g., publishing requires `ADMIN`, adding a decision requires `REVIEWER` or `ADMIN`).
- **Secret Management**: `JWT_SECRET` is appropriately injected via environment variables.

## 2. Password Security

- **Hashing**: Argon2 is utilized for all password hashing (`apps/server/src/routes/authRoutes.ts`), providing excellent resistance to GPU-based attacks.

## 3. Storage & Upload Security

- **File Upload Limits**: `@fastify/multipart` is configured with a strict 50MB ceiling, rejecting oversized payloads with `413 PAYLOAD_TOO_LARGE`. Empty payloads (0 bytes) are rejected with `400 VALIDATION_ERROR`.
- **Storage Isolation**: MinIO is strictly bound to `127.0.0.1` and internal Docker networking. Artifact downloads are authenticated and proxied through the backend instead of using direct S3 presigned URLs, completely shielding the storage layer from direct public access.
- **MIME Verification**: The server strictly enforces allowed MIME types (`application/pdf`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `application/json`).
- **Path Traversal Protection**: Filename extensions are strictly sanitized: `ext = ext.replace(/[^a-zA-Z0-9]/g, '')`, preventing directory traversal payloads like `../../../etc/passwd`.

## 4. API & Network Security

- **CORS**: Correctly configured to respect the `FRONTEND_ORIGIN` environment variable.
- **Rate Limiting**: Configured globally on the Fastify instance (100 requests per minute per IP).

## Findings

- **[SEC-1] INFO**: The `seed.ts` file contains hardcoded passwords (`admin123!`, `reviewer123!`). This is acceptable for local generation but must not be executed in true production.
