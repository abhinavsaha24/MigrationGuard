# FINAL HARDENING CHANGES

This document records the exact changes made to the MigrationGuard repository during the final hardening and remediation phase (Phases 3 and 4 of the Final Release process).

## 1. Dead Code and Artifact Cleanup

- **Finding ID**: REPO-001
- **Root Cause**: Unused script and artifact files left behind from earlier exploration and execution.
- **Files**: `test-10x.ps1`, `test-backup-restore.ps1`, `reports/*.json`, `reports/*.md`
- **Change**: Deleted the unused PowerShell scripts and purged the `reports` directory containing temporary JSON/MD outputs. Verified `.gitignore` is correct.
- **Risk**: Low
- **Test Added**: N/A
- **Verification Result**: Verified cleanup.

## 2. Seed Credential Consistency

- **Finding ID**: CRED-001
- **Root Cause**: The Prisma seed script in `apps/server/src/seed.ts` created `admin@migrationguard.local`, while the production local simulation and documentation used `admin@migrationguard.dev`.
- **Files**: `apps/server/src/seed.ts`, `apps/server/src/app.test.ts`
- **Change**: Updated the seed script and its associated API integration test to explicitly use the `.dev` TLD, ensuring out-of-the-box local production credentials align.
- **Risk**: Low
- **Test Added**: Maintained `app.test.ts` to assert against `.dev`.
- **Verification Result**: Tests modified and executed successfully.

## 3. Dockerfile: argon2 Native Binary Cross-Platform Fix

- **Finding ID**: DOCKER-001
- **Root Cause**: The backend `Dockerfile` copied `node_modules` directly from the Windows host into the Linux container. `argon2` uses a native C binary that must be compiled for the target OS/architecture. The Windows binary (`argon2.node` for `win32-x64`) was silently incompatible on Linux, causing `argon2.verify()` to return `false` for all passwords and making login impossible.
- **Files**: `apps/server/Dockerfile`
- **Change**: Added `RUN npm rebuild argon2` inside the container after copying node_modules. Also added `python3`, `make`, and `g++` to the `apt-get install` step as build tools required for native compilation.
- **Risk**: Low (additive change, does not alter application logic)
- **Test Added**: Verified via live E2E login test.
- **Verification Result**: Login now returns 200 with a valid JWT token.
