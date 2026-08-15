# MIGRATIONGUARD SPECIFICATION

## Core Problem

A PostgreSQL migration can execute successfully while still breaking an application during a rolling deployment because old and new application versions may temporarily interact with different database schema states.

MigrationGuard must therefore verify:

> Whether old and new versions of an application remain compatible with the old and new PostgreSQL schemas during a migration transition.

## Frozen Project Scope

- **Database**: PostgreSQL only.
- **Application ecosystem**: Node.js + TypeScript + Prisma.
- **Environment**: Docker-based isolated PostgreSQL environments.
- **CI**: GitHub Actions.
- **Primary interface**: CLI.
- **Detection**: Deterministic. An LLM must NEVER determine whether a migration is safe or unsafe.
- **Research positioning**: Application-aware compatibility verification, adding Application version + Database version + Representative workload + Observed compatibility behaviour + Evidence.

## Core Compatibility Model

| Application | Database | Purpose                |
| ----------- | -------- | ---------------------- |
| OLD         | OLD      | Baseline               |
| OLD         | NEW      | Backward compatibility |
| NEW         | OLD      | Forward compatibility  |
| NEW         | NEW      | Final-state control    |

The most important state is **OLD APPLICATION × NEW DATABASE**.
