# PHASE 3 IMPLEMENTATION PLAN: LLM Generator Track C

## Implementation Strategy

This document outlines the step-by-step technical plan to implement the LLM Generator Track C Experiment described in `PHASE-3-TRACK-C-DESIGN.md`.

_Important: This plan introduces NO modifications to the underlying `benchmark-runner`, `matrix-engine`, or existing ground truth._

### 1. Provider Agnostic LLM Client (`packages/llm-provider`)

**Goal:** Create a standardized wrapper for LLM interactions.

- Initialize `packages/llm-provider` as a standard internal module.
- Define `interface LLMProvider { generateSchema(prompt: string): Promise<string> }`.
- Implement a single initial adapter (e.g., Gemini SDK or OpenAI SDK) depending on local environment availability.
- Parse the raw LLM response to extract the markdown-fenced `prisma ... ` code block securely.
- Ensure strict timeout handling and validation for API keys loaded from `process.env`.

### 2. Track C Dataset Definition (`benchmark/track-c`)

**Goal:** Establish the 8 baseline schemas and workloads without overlapping the $n=5$ core benchmark.

- Create `benchmark/track-c/manifest.json`.
- Populate 8 isolated sub-directories (e.g., `benchmark/track-c/C1-add-optional-column`).
- Inside each directory, include:
  - `schema-v1.prisma` (Base schema).
  - `workload.json` (Expected application traffic for the scenario).
  - `ground-truth.json` (Expected safety metrics if LLM performs naive mutation).
- _Implementation Note:_ We will reuse the `WorkloadReplayEngine` payloads from the $n=5$ benchmark where possible to avoid redundant logic mapping.

### 3. CLI Orchestrator (`cli/src/llm-experiment.ts`)

**Goal:** Build the runtime loop that connects the LLM provider to the MigrationGuard test matrix.

- Add an `npm run experiment:llm` script to `package.json`.
- The orchestrator will:
  1. Load `benchmark/track-c/manifest.json`.
  2. For each task, read `schema-v1.prisma` and the `task_description`.
  3. Format the strict protocol prompt.
  4. Invoke `LLMProvider.generateSchema()`.
  5. Save the generated string to a temporary `schema-v2.prisma` in `os.tmpdir()`.
  6. Pass `schema-v1.prisma` and the LLM's `schema-v2.prisma` into the existing `PrismaMutationEngine` / `CompatibilityMatrixEngine` pipeline.
  7. Handle failures matching the defined Taxonomy (`GENERATION_FAILURE`, `INVALID_SCHEMA`, etc.).

### 4. Result Recording and Reporting

**Goal:** Persist immutable evidence of the AI's generations.

- Modify the orchestrator to dump a complete forensic log for each experiment to `reports/track-c/`.
- Ensure output structure identical to the mutation experiment table format (with added columns for LLM parse/validity success rate).

### 5. Final Integration Checks

- Run `npm run lint`, `npm run format:check`, and `npm run build`.
- Validate that the addition of the new CLI commands did not accidentally leak into `npm run benchmark` or break `TRACK_B_NATIVE_RENAME`.
- Perform a single end-to-end dry-run using a mock LLM (a static string return) to prove pipeline connectivity before wiring actual network API calls.
