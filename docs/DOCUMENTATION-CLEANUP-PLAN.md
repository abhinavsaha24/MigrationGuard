# Documentation Cleanup Plan

## Proposed Actions

### 1. Retention (Core Documentation)

- `README.md` (Root project overview)
- `docs/architecture/DEPLOYMENT.md` (Deployment guide)
- `docs/architecture/FINAL-ARCHITECTURE.md` (System design & core concepts)
- `docs/benchmark/RESULTS.md` (Actual verified metrics: F1=1.00, n=5)
- `docs/benchmark/GROUND-TRUTH.md` (Dataset metadata)
- `docs/security/FINAL-SECURITY-REVIEW.md` (Security constraints & JWT mechanics)
- `docs/FINAL-PREDEPLOYMENT-AUDIT.md` (The final output of this current audit)

### 2. Archival (Historical & Research Material)

These files will be moved strictly to `docs/archive/` (or kept there) for reproducibility without cluttering the active documentation:

- `docs/research/*`
- `docs/benchmark/REPOSITORY-SELECTION.md`
- `docs/benchmark/BASELINE.md`
- `docs/MASTER-HARDENING-BASELINE.md`

### 3. Deletion (Redundant / Temporary Phase Reports)

These files were iterative sign-offs or phase plans that have been entirely superseded by the final artifacts.

- `docs/FINAL-FRONTEND-SIGNOFF.md`
- `docs/FINAL-FRONTEND-VERIFICATION-AUDIT.md`
- `docs/FINAL-RELEASE-GATE.md`
- `docs/FINAL-RELEASE-REPORT.md`
- `docs/FINAL-REPOSITORY-STATE.md`
- `docs/FINAL-RESEARCH-INTEGRITY-AUDIT.md`
- `docs/FINAL-SECURITY-AUDIT.md`
- `docs/FINAL-SENIOR-ENGINEERING-AUDIT.md`
- `docs/FINAL-SENIOR-ENGINEERING-BASELINE.md`
- `docs/FINAL-UI-UX-AUDIT.md`
- `docs/DEPLOYMENT-READINESS.md`
- `docs/LOCAL-DEMO-RUNBOOK.md`
- `docs/DOCUMENTATION-CLEANUP-REPORT.md`
- `docs/PHASE-*.md`
- `docs/VPS-DEPLOYMENT-ARCHITECTURE-AUDIT.md`
- `docs/PRODUCTION-DEPLOYMENT.md`
- Temporary architectural drafts in `docs/architecture/` (e.g. `FINAL-100-RELEASE.md`).

### Rationale

The repository currently contains 5+ "Final Signoff" files from different iterations of the project. Keeping them all causes immense confusion for deployment and maintenance. The single source of truth for deployment readiness will be `FINAL-PREDEPLOYMENT-AUDIT.md`, and the single source of truth for metrics is `docs/benchmark/RESULTS.md`.
