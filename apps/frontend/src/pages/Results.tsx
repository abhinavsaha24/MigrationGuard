import styles from './Page.module.css';
import rStyles from './Results.module.css';
import { AlertTriangle } from 'lucide-react';

const KEY_FINDING = {
  scenario: 'SAFE_ADD_COLUMN',
  desc:
    'A nullable column is added to the schema. The old application has no awareness of this column, so its queries continue to work. Static analysis tools that lack execution context may classify this as UNSAFE, producing a false positive.',
};

const SCENARIOS = [
  {
    code: 'SAFE_ADD_COLUMN',
    expected: 'SAFE',
    mg: { verdict: 'SAFE', correct: true },
    atlas: { verdict: 'UNSAFE', correct: false },
    note: 'Atlas generates a false positive. Schema-only analysis may classify nullable column additions as unsafe without verifying that no application query is broken.',
  },
  {
    code: 'DESTRUCTIVE_RENAME',
    expected: 'UNSAFE',
    mg: { verdict: 'UNSAFE', correct: true },
    atlas: { verdict: 'UNSAFE', correct: true },
    note: 'Both tools correctly identify the renamed column as incompatible. MigrationGuard additionally captures the exact HTTP request/response evidence.',
  },
  {
    code: 'TYPE_NARROWING',
    expected: 'UNSAFE',
    mg: { verdict: 'UNSAFE', correct: true },
    atlas: { verdict: 'UNSAFE', correct: true },
    note: 'Type narrowing is detectable statically. Both tools classify correctly.',
  },
];

export default function Results() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.pageLabel}>Analysis</div>
        <h1 className={styles.pageTitle}>Benchmark Results Analysis</h1>
        <p className={styles.pageSubtitle}>
          Comparison of MigrationGuard and Atlas across the n=4 controlled benchmark.
          Differences in precision arise from Atlas's false positives on SAFE migrations.
        </p>
      </div>

      {/* Primary F1 comparison */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Primary Metric Comparison</div>
        <div className={rStyles.f1Row}>
          <div className={rStyles.f1Card}>
            <div className={rStyles.toolLabel}>MigrationGuard</div>
            <div className={rStyles.f1Score} style={{ color: 'var(--green)' }}>1.00</div>
            <div className={rStyles.f1Sub}>F1 Score</div>
            <div className={rStyles.f1Detail}>TP=2 · TN=2 · FP=0 · FN=0</div>
          </div>
          <div className={rStyles.f1Vs}>vs</div>
          <div className={rStyles.f1Card}>
            <div className={rStyles.toolLabel}>Atlas</div>
            <div className={rStyles.f1Score} style={{ color: 'var(--red)' }}>0.67</div>
            <div className={rStyles.f1Sub}>F1 Score</div>
            <div className={rStyles.f1Detail}>TP=2 · TN=0 · FP=2 · FN=0</div>
          </div>
        </div>
      </section>

      {/* Key finding */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Key Finding</div>
        <div className={rStyles.findingCard}>
          <code className={rStyles.findingCode}>{KEY_FINDING.scenario}</code>
          <p>{KEY_FINDING.desc}</p>
          <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            This demonstrates that schema-only static analysis may produce false positives on safe
            additive migrations, potentially leading teams to block safe deployments unnecessarily.
          </p>
        </div>
      </section>

      {/* Scenario breakdown */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Scenario Breakdown</div>
        <div className={rStyles.scenarioList}>
          {SCENARIOS.map(s => (
            <div key={s.code} className={rStyles.scenarioCard}>
              <div className={rStyles.scenarioHeader}>
                <code>{s.code}</code>
                <span className={styles.badgeAmber}>Expected: {s.expected}</span>
              </div>
              <div className={rStyles.scenarioVerdicts}>
                <div className={rStyles.verdictItem}>
                  <div className={rStyles.verdictTool}>MigrationGuard</div>
                  {s.mg.verdict === 'SAFE'
                    ? <span className={styles.badgeSafe}>{s.mg.correct ? '✓ ' : '✗ '}{s.mg.verdict}</span>
                    : <span className={`${styles.badgeUnsafe} ${!s.mg.correct ? rStyles.fp : ''}`}>{s.mg.correct ? '✓ ' : '✗ '}{s.mg.verdict}</span>}
                </div>
                <div className={rStyles.verdictItem}>
                  <div className={rStyles.verdictTool}>Atlas</div>
                  {s.atlas.verdict === 'SAFE'
                    ? <span className={styles.badgeSafe}>{s.atlas.correct ? '✓ ' : '✗ '}{s.atlas.verdict}</span>
                    : <span className={`${styles.badgeUnsafe} ${!s.atlas.correct ? rStyles.fp : ''}`}>{s.atlas.correct ? '✓ ' : '✗ '}{s.atlas.verdict}</span>}
                </div>
              </div>
              <p className={rStyles.scenarioNote}>{s.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <div className={`${styles.notice} ${styles.noticeAmber}`}>
        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Scope of results:</strong> MigrationGuard classified all four controlled benchmark cases
          correctly. These results do not establish generalized production accuracy and are not a
          substitute for comprehensive testing. The benchmark is a proof-of-concept evaluation on a
          controlled n=4 dataset.
        </div>
      </div>
    </div>
  );
}
