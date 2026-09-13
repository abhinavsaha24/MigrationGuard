# MigrationGuard M8 Benchmark Results

**Execution Time:** 20868ms

## Overall Metrics

| Metric | MigrationGuard | Atlas (SQL-only Baseline) |
|---|---|---|
| True Positives (TP) | 0 | 0 |
| True Negatives (TN) | 1 | 0 |
| False Positives (FP) | 0 | 1 |
| False Negatives (FN) | 0 | 0 |
| Precision | NOT_APPLICABLE | 0.00 |
| Recall | NOT_APPLICABLE | NOT_APPLICABLE |
| F1 Score | NOT_APPLICABLE | NOT_APPLICABLE |

## Detailed Results

### Test: TRACK_B_SAFE_ADD_COLUMN (Track B)
- **Ground Truth:** SAFE (NONE)
- **MigrationGuard Verdict:** SAFE_UNEXERCISED (Confidence: UNKNOWN, Fault: NONE)
- **Atlas Verdict:** UNSAFE

