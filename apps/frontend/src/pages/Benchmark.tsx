import styles from './Page.module.css';
import bStyles from './Benchmark.module.css';
import { AlertTriangle } from 'lucide-react';

const MG_METRICS = [
  { label: 'True Positives',  value: '2', color: 'green' },
  { label: 'True Negatives',  value: '2', color: 'green' },
  { label: 'False Positives', value: '0', color: 'green' },
  { label: 'False Negatives', value: '0', color: 'green' },
  { label: 'Precision',       value: '1.00', color: 'green' },
  { label: 'Recall',          value: '1.00', color: 'green' },
  { label: 'F1 Score',        value: '1.00', color: 'green' },
];

const ATLAS_METRICS = [
  { label: 'True Positives',  value: '2', color: 'green' },
  { label: 'True Negatives',  value: '0', color: 'red'   },
  { label: 'False Positives', value: '2', color: 'red'   },
  { label: 'False Negatives', value: '0', color: 'green' },
  { label: 'Precision',       value: '0.50', color: 'red'   },
  { label: 'Recall',          value: '1.00', color: 'green' },
  { label: 'F1 Score',        value: '0.67', color: 'red'   },
];

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
  if (verdict === 'SAFE')
    return <span className={styles.badgeSafe}>✓ SAFE</span>;
  if (verdict === 'UNSAFE' && correct)
    return <span className={styles.badgeUnsafe}>✓ UNSAFE</span>;
  return <span className={styles.badgeUnsafe} style={{ opacity: 0.7 }}>✗ UNSAFE (FP)</span>;
}

export default function Benchmark() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.pageLabel}>Evaluation</div>
        <h1 className={styles.pageTitle}>Benchmark Results</h1>
        <p className={styles.pageSubtitle}>
          Controlled evaluation of MigrationGuard against Atlas (schema-only static analysis)
          on four benchmark migration cases. Dataset: n=4.
        </p>
      </div>

      {/* Side-by-side comparison */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Score Comparison</div>
        <div className={bStyles.compareGrid}>
          {/* MigrationGuard */}
          <div className={`${bStyles.toolCard} ${bStyles.toolCardMG}`}>
            <div className={bStyles.toolHeader}>
              <div className={bStyles.toolName}>MigrationGuard</div>
              <span className={styles.badgeSafe}>F1 = 1.00</span>
            </div>
            <div className={bStyles.miniMetrics}>
              {MG_METRICS.map(m => (
                <div key={m.label} className={bStyles.miniMetric}>
                  <div className={`${bStyles.mmVal} ${m.color === 'green' ? bStyles.green : bStyles.red}`}>{m.value}</div>
                  <div className={bStyles.mmLabel}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Atlas */}
          <div className={`${bStyles.toolCard} ${bStyles.toolCardAtlas}`}>
            <div className={bStyles.toolHeader}>
              <div className={bStyles.toolName}>Atlas (static)</div>
              <span className={styles.badgeUnsafe}>F1 = 0.67</span>
            </div>
            <div className={bStyles.miniMetrics}>
              {ATLAS_METRICS.map(m => (
                <div key={m.label} className={bStyles.miniMetric}>
                  <div className={`${bStyles.mmVal} ${m.color === 'green' ? bStyles.green : bStyles.red}`}>{m.value}</div>
                  <div className={bStyles.mmLabel}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Confusion matrices */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Confusion Matrices</div>
        <div className={bStyles.confusionRow}>
          <div className={bStyles.confusionWrap}>
            <div className={bStyles.confusionTitle}>MigrationGuard</div>
            <div className={bStyles.confusionGrid}>
              <div className={bStyles.confusionEmpty}/>
              <div className={bStyles.confusionHead}>Pred UNSAFE</div>
              <div className={bStyles.confusionHead}>Pred SAFE</div>
              <div className={bStyles.confusionHead}>Actual UNSAFE</div>
              <div className={`${bStyles.confusionCell} ${bStyles.tp}`}>TP = 2</div>
              <div className={`${bStyles.confusionCell} ${bStyles.fn}`}>FN = 0</div>
              <div className={bStyles.confusionHead}>Actual SAFE</div>
              <div className={`${bStyles.confusionCell} ${bStyles.fp}`}>FP = 0</div>
              <div className={`${bStyles.confusionCell} ${bStyles.tn}`}>TN = 2</div>
            </div>
          </div>
          <div className={bStyles.confusionWrap}>
            <div className={bStyles.confusionTitle}>Atlas</div>
            <div className={bStyles.confusionGrid}>
              <div className={bStyles.confusionEmpty}/>
              <div className={bStyles.confusionHead}>Pred UNSAFE</div>
              <div className={bStyles.confusionHead}>Pred SAFE</div>
              <div className={bStyles.confusionHead}>Actual UNSAFE</div>
              <div className={`${bStyles.confusionCell} ${bStyles.tp}`}>TP = 2</div>
              <div className={`${bStyles.confusionCell} ${bStyles.fn}`}>FN = 0</div>
              <div className={bStyles.confusionHead}>Actual SAFE</div>
              <div className={`${bStyles.confusionCell} ${bStyles.fp} ${bStyles.fpActive}`}>FP = 2</div>
              <div className={`${bStyles.confusionCell} ${bStyles.tn} ${bStyles.tnMissed}`}>TN = 0</div>
            </div>
          </div>
        </div>
      </section>

      {/* Test cases */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Test Cases (n=4)</div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Track</th>
                <th>Scenario</th>
                <th>Expected</th>
                <th>MigrationGuard</th>
                <th>Atlas</th>
              </tr>
            </thead>
            <tbody>
              {CASES.map(c => (
                <tr key={c.id}>
                  <td><code>{c.track}</code></td>
                  <td>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{c.description}</div>
                    <code style={{ fontSize: '0.75rem', marginTop: '0.2rem', display: 'block', background: 'transparent', border: 'none', padding: 0, color: 'var(--text-secondary)' }}>{c.fault}</code>
                  </td>
                  <td>
                    {c.expected === 'SAFE'
                      ? <span className={styles.badgeSafe}>SAFE</span>
                      : <span className={styles.badgeUnsafe}>UNSAFE</span>}
                  </td>
                  <td><Verdict verdict={c.mg.verdict} correct={c.mg.correct} /></td>
                  <td><Verdict verdict={c.atlas.verdict} correct={c.atlas.correct} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className={`${styles.notice} ${styles.noticeAmber}`}>
        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Dataset size: n=4.</strong> These results confirm correct classification within the
          controlled benchmark. They do not establish generalized production accuracy.
          Atlas's two false positives arise from schema-only analysis flagging nullable column
          additions as unsafe without verifying application behavior.
        </div>
      </div>
    </div>
  );
}
