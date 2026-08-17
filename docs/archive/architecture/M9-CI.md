# MigrationGuard CI Architecture

MigrationGuard uses a secure, minimal-privilege GitHub Actions workflow to run its verification pipeline on every push and pull request to the `main` branch.

## Workflow Pipeline (`.github/workflows/migrationguard.yml`)

1. **Checkout**: Retrieves the code using `actions/checkout@v4`.
2. **Setup Node**: Provisions Node.js 20 using `actions/setup-node@v4`.
3. **Install Dependencies**: Uses `npm ci` for deterministic dependencies.
4. **Build, Lint, Format Check, Test**: Standard continuous integration checks ensuring code quality and unit test stability.
5. **Start Dependencies**: Provisions Docker-compose services if any external dependencies are required by specific workloads.
6. **Verify (`npm run verify`)**: Executes the deterministic `M1` regression fixture using the MigrationGuard CLI.
7. **Report Generation**: Automatically parses the exit status and constructs a concise GitHub Job Summary for immediate developer feedback in the PR.
8. **Artifact Upload**: Generates and uploads the complete JSON and Markdown evidence reports as workflow artifacts (retained for 7 days).

## Verification Strategy

The CI runs the deterministic, controlled MigrationGuard test (`M1` fixture), ensuring:

- **Fast Execution**: Testing does not block PRs unnecessarily.
- **Reliable Regression**: Ensures that `OLD + V1` (PASS) and `OLD + V2` (FAIL) are strictly preserved across PRs.
- **Independence from Benchmarks**: Full academic benchmarks (e.g., `express-real`) are kept strictly decoupled from the deterministic unit/e2e pipeline to prevent CI flakiness.

## Security Posture

- The workflow avoids committing any sensitive configuration to the repository.
- No `DATABASE_URL` or secret values are uploaded in artifacts or outputted to workflow logs.
- The workflow operates entirely inside ephemeral Ubuntu environments.
