import styles from './Benchmark.module.css';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

const CASES = [
  {
    id: 'TRACK_A_DESTRUCTIVE_RENAME',
    track: 'A',
    description: 'Column renamed: name → full_name',
    fault: 'DESTRUCTIVE_RENAME',
    expected: 'UNSAFE',
    mg: { verdict: 'UNSAFE', correct: true },
    atlas: { verdict: 'UNSAFE', correct: true },
  },
  {
    id: 'TRACK_A_SAFE_ADD_COLUMN',
    track: 'A',
    description: 'Nullable bio column added',
    fault: 'NONE (SAFE)',
    expected: 'SAFE',
    mg: { verdict: 'SAFE', correct: true },
    atlas: { verdict: 'UNSAFE', correct: false },
  },
  {
    id: 'TRACK_B_TYPE_NARROWING',
    track: 'B',
    description: 'Integer type narrowed to smallint',
    fault: 'TYPE_NARROWING',
    expected: 'UNSAFE',
    mg: { verdict: 'UNSAFE', correct: true },
    atlas: { verdict: 'UNSAFE', correct: true },
  },
  {
    id: 'TRACK_A_EXPRESS_REAL',
    track: 'A',
    description: 'Express baseline reference test',
    fault: 'NONE (SAFE)',
    expected: 'SAFE',
    mg: { verdict: 'SAFE', correct: true },
    atlas: { verdict: 'UNSAFE', correct: false },
  },
];

function Verdict({ verdict, correct }: { verdict: string; correct: boolean }) {
  if (verdict === 'SAFE') {
    return (
      <span className={styles.badgeSafe}>
        <CheckCircle2 size={14} /> SAFE
      </span>
    );
  }
  if (verdict === 'UNSAFE' && correct) {
    return (
      <span className={styles.badgeUnsafe}>
        <CheckCircle2 size={14} /> UNSAFE
      </span>
    );
  }
  return (
    <span className={styles.badgeFalsePositive}>
      <XCircle size={14} /> FP: UNSAFE
    </span>
  );
}

export default function Benchmark() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLabel}>EVALUATION BENCHMARK</div>
        <h1 className={styles.title}>Comparative Analysis</h1>
        <p className={styles.subtitle}>
          Controlled evaluation of MigrationGuard against Atlas (schema-only static analysis)
          on four benchmark migration cases. Dataset: n=4.
        </p>
      </header>

      {/* Hero Metrics Comparison */}
      <section className={styles.comparisonSection}>
        <div className={styles.compareGrid}>
          
          {/* MigrationGuard Panel */}
          <div className={`${styles.toolPanel} ${styles.panelBlue}`}>
            <div className={styles.toolHeader}>
              <h2 className={styles.toolName}>MigrationGuard</h2>
              <div className={styles.f1Score}>
                <span className={styles.f1Label}>F1 SCORE</span>
                <span className={styles.f1Value}>1.00</span>
              </div>
            </div>
            
            <div className={styles.metricsGrid}>
              <div className={styles.metricItem}>
                <div className={styles.metricVal}>2</div>
                <div className={styles.metricLabel}>True Positives</div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricVal}>0</div>
                <div className={styles.metricLabel}>False Positives</div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricVal}>2</div>
                <div className={styles.metricLabel}>True Negatives</div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricVal}>0</div>
                <div className={styles.metricLabel}>False Negatives</div>
              </div>
            </div>

            <div className={styles.confusionBox}>
              <div className={styles.cbTitle}>Confusion Matrix</div>
              <div className={styles.cbGrid}>
                <div className={styles.cbEmpty}></div>
                <div className={styles.cbColHead}>Pred UNSAFE</div>
                <div className={styles.cbColHead}>Pred SAFE</div>
                <div className={styles.cbRowHead}>Actual UNSAFE</div>
                <div className={`${styles.cbCell} ${styles.cbTrue}`}>TP=2</div>
                <div className={`${styles.cbCell} ${styles.cbZero}`}>FN=0</div>
                <div className={styles.cbRowHead}>Actual SAFE</div>
                <div className={`${styles.cbCell} ${styles.cbZero}`}>FP=0</div>
                <div className={`${styles.cbCell} ${styles.cbTrue}`}>TN=2</div>
              </div>
            </div>
          </div>

          {/* Atlas Panel */}
          <div className={`${styles.toolPanel} ${styles.panelRed}`}>
            <div className={styles.toolHeader}>
              <h2 className={styles.toolName}>Atlas (Static)</h2>
              <div className={styles.f1Score}>
                <span className={styles.f1Label}>F1 SCORE</span>
                <span className={styles.f1Value}>0.67</span>
              </div>
            </div>

            <div className={styles.metricsGrid}>
              <div className={styles.metricItem}>
                <div className={styles.metricVal}>2</div>
                <div className={styles.metricLabel}>True Positives</div>
              </div>
              <div className={styles.metricItem}>
                <div className={`${styles.metricVal} ${styles.textRed}`}>2</div>
                <div className={styles.metricLabel}>False Positives</div>
              </div>
              <div className={styles.metricItem}>
                <div className={`${styles.metricVal} ${styles.textRed}`}>0</div>
                <div className={styles.metricLabel}>True Negatives</div>
              </div>
              <div className={styles.metricItem}>
                <div className={styles.metricVal}>0</div>
                <div className={styles.metricLabel}>False Negatives</div>
              </div>
            </div>

            <div className={styles.confusionBox}>
              <div className={styles.cbTitle}>Confusion Matrix</div>
              <div className={styles.cbGrid}>
                <div className={styles.cbEmpty}></div>
                <div className={styles.cbColHead}>Pred UNSAFE</div>
                <div className={styles.cbColHead}>Pred SAFE</div>
                <div className={styles.cbRowHead}>Actual UNSAFE</div>
                <div className={`${styles.cbCell} ${styles.cbTrue}`}>TP=2</div>
                <div className={`${styles.cbCell} ${styles.cbZero}`}>FN=0</div>
                <div className={styles.cbRowHead}>Actual SAFE</div>
                <div className={`${styles.cbCell} ${styles.cbFalse}`}>FP=2</div>
                <div className={`${styles.cbCell} ${styles.cbZero}`}>TN=0</div>
              </div>
            </div>
          </div>
          
        </div>
      </section>

      {/* Dataset Ledger */}
      <section className={styles.ledgerSection}>
        <div className={styles.sectionHeader}>
          <h2>Controlled Dataset Ledger (n=4)</h2>
        </div>
        
        <div className={styles.tableWrap}>
          <table className={styles.ledgerTable}>
            <thead>
              <tr>
                <th>Test Identifier</th>
                <th>Scenario Description</th>
                <th>Expected Verdict</th>
                <th>MigrationGuard</th>
                <th>Atlas (Static)</th>
              </tr>
            </thead>
            <tbody>
              {CASES.map(c => (
                <tr key={c.id}>
                  <td className={styles.monoCell}>{c.id}</td>
                  <td>
                    <div className={styles.cellDesc}>{c.description}</div>
                    <div className={styles.cellSub}>{c.fault}</div>
                  </td>
                  <td>
                    <span className={c.expected === 'SAFE' ? styles.badgeSafe : styles.badgeUnsafe}>
                      {c.expected}
                    </span>
                  </td>
                  <td><Verdict verdict={c.mg.verdict} correct={c.mg.correct} /></td>
                  <td><Verdict verdict={c.atlas.verdict} correct={c.atlas.correct} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Limitation Notice */}
      <section className={styles.limitationSection}>
        <div className={styles.limitationBox}>
          <AlertTriangle size={18} className={styles.limitationIcon} />
          <div className={styles.limitationContent}>
            <strong>Dataset limitation explicitly acknowledged.</strong>
            <p>
              These results confirm correct classification within the
              controlled benchmark. They do not establish generalized production accuracy.
              Atlas's two false positives arise from schema-only analysis flagging nullable column
              additions as unsafe without verifying application behavior.
            </p>
          </div>
        </div>
      </section>
      
    </div>
  );
}
