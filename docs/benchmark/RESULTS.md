# MigrationGuard M8 Benchmark Results

**Execution Time:** 134455ms

## Overall Metrics

| Metric               | MigrationGuard | Atlas (SQL-only Baseline) |
| -------------------- | -------------- | ------------------------- |
| True Positives (TP)  | 2              | 2                         |
| True Negatives (TN)  | 2              | 0                         |
| False Positives (FP) | 0              | 2                         |
| False Negatives (FN) | 0              | 0                         |
| Precision            | 1.00           | 0.50                      |
| Recall               | 1.00           | 1.00                      |
| F1 Score             | 1.00           | 0.67                      |

## Detailed Results

### Test: TRACK_B_COLUMN_REMOVAL (Track B)

- **Ground Truth:** UNSAFE (COLUMN_REMOVAL)
- **MigrationGuard Verdict:** UNSAFE (Confidence: CONFIRMED, Fault: COLUMN_REMOVAL)
- **Atlas Verdict:** UNSAFE

### Test: TRACK_B_SAFE_ADD_COLUMN (Track B)

- **Ground Truth:** SAFE (NONE)
- **MigrationGuard Verdict:** SAFE (Confidence: UNKNOWN, Fault: NONE)
- **Atlas Verdict:** UNSAFE

### Test: TRACK_B_TYPE_NARROWING (Track B)

- **Ground Truth:** UNSAFE (TYPE_NARROWING)
- **MigrationGuard Verdict:** UNSAFE (Confidence: UNKNOWN, Fault: TYPE_NARROWING)
- **Atlas Verdict:** UNSAFE

### Test: TRACK_A_EXPRESS_REAL (Track A)

- **Ground Truth:** SAFE (NONE)
- **MigrationGuard Verdict:** SAFE (Confidence: UNKNOWN, Fault: NONE)
- **Atlas Verdict:** UNSAFE
