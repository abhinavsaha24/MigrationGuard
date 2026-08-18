# Phase 3A Baseline

## 1. Immutable Baseline Context
*   **Git SHA:** 925684e598e50921ff80bafb967f0375a73d6f72
*   **Total Tests:** 35 passed
*   **Time of Baseline:** At start of Phase 3A

## 2. Benchmark Ground Truth (n=5)
The authoritative baseline consists of 5 evaluated cases.

*   **Evaluated Cases:** 5
*   **Not Evaluated:** 0
*   **Infrastructure Failures:** 0

### MigrationGuard Metrics
*   **True Positives (TP):** 3
*   **True Negatives (TN):** 2
*   **False Positives (FP):** 0
*   **False Negatives (FN):** 0
*   **Precision:** 1.00
*   **Recall:** 1.00
*   **F1 Score:** 1.00

### Atlas Metrics
*   **True Positives (TP):** 3
*   **True Negatives (TN):** 0
*   **False Positives (FP):** 2
*   **False Negatives (FN):** 0
*   **Precision:** 0.60
*   **Recall:** 1.00
*   **F1 Score:** 0.75

## 3. Mutation Experiment (n=4)
The experimental corpus contains 4 programmatic mutations.
*   DROP_COLUMN: UNSAFE (TP)
*   NATIVE_RENAME: UNSAFE (TP)
*   TYPE_NARROWING: UNSAFE (TP)
*   SAFE_ADD_COLUMN: SAFE (TN)

*This baseline is locked for the duration of Phase 3A. Ground truth and matrix semantics will not be altered.*