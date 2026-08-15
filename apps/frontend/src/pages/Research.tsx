import styles from './Page.module.css';
import rStyles from './Research.module.css';
import { AlertTriangle } from 'lucide-react';

const STEPS = [
  { n: '01', title: 'Sandbox',        desc: 'Spin up an ephemeral PostgreSQL container seeded with the V1 schema and representative data.' },
  { n: '02', title: 'V1 Application', desc: 'Deploy the old application version. Execute an HTTP workload to establish the baseline compatibility state.' },
  { n: '03', title: 'V2 Migration',   desc: 'Apply the target migration to produce a V2 database schema inside the sandbox.' },
  { n: '04', title: 'HTTP Workload',  desc: 'Run the same workload against all four permutations: OLD+V1, OLD+V2, NEW+V1, NEW+V2.' },
  { n: '05', title: 'Classification', desc: 'Classify each cell as COMPATIBLE or INCOMPATIBLE based on HTTP response codes and response bodies.' },
  { n: '06', title: 'Evidence',       desc: 'Collect byte-level request/response logs. Compute SHA-256 integrity hashes. Store in MinIO.' },
];

const FAULT_CLASSES = [
  { code: 'DESTRUCTIVE_RENAME',  desc: 'Column renamed without backward compatibility — old app queries fail on new schema.',  severity: 'unsafe' },
  { code: 'TYPE_NARROWING',      desc: 'Column type changed to a narrower domain — existing data or queries may be rejected.', severity: 'unsafe' },
  { code: 'NOT_NULL_ADDITION',   desc: 'NOT NULL constraint added without a default — inserts from old app fail.',              severity: 'unsafe' },
  { code: 'SAFE_ADD_COLUMN',     desc: 'Nullable column added — no existing query is broken.',                                 severity: 'safe'   },
  { code: 'SAFE_ADD_TABLE',      desc: 'New table added — has no effect on existing queries.',                                 severity: 'safe'   },
];

const MATRIX = [
  { combo: 'OLD + V1', label: 'Baseline',  desc: 'Should always pass. If this fails, the test setup is invalid.' },
  { combo: 'OLD + V2', label: 'Forward',   desc: 'Tests whether the old app still works after migration is applied.' },
  { combo: 'NEW + V1', label: 'Rollback',  desc: 'Tests whether the new app can tolerate rollback to the old schema.' },
  { combo: 'NEW + V2', label: 'Target',    desc: 'Should always pass. Confirms the migration succeeds for the new app.' },
];

export default function Research() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.pageLabel}>Research</div>
        <h1 className={styles.pageTitle}>Verification Methodology</h1>
        <p className={styles.pageSubtitle}>
          Controlled evaluation of application-level migration compatibility via causal execution
          rather than schema-level static analysis.
        </p>
      </div>

      {/* Research question */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Research Question</div>
        <div className={rStyles.questionCard}>
          <p>
            Can a tool that executes real HTTP workloads against ephemeral database containers
            detect migration-induced application incompatibilities that schema-only static analysis
            tools systematically miss?
          </p>
        </div>
      </section>

      {/* Hypothesis */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Hypothesis</div>
        <div className={rStyles.hypothesisCard}>
          <p>
            A tool that exercises actual application code against all four combinations of
            old/new application version and old/new database schema will produce fewer false negatives
            on application-level fault classes than tools restricted to static schema comparison.
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            Schema-only static analysis may miss application-level incompatibilities that emerge
            only when application code is exercised against the migrated schema.
          </p>
        </div>
      </section>

      {/* Methodology Steps */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Methodology — Verification Pipeline</div>
        <div className={rStyles.stepsGrid}>
          {STEPS.map(s => (
            <div key={s.n} className={rStyles.step}>
              <div className={rStyles.stepNum}>{s.n}</div>
              <div className={rStyles.stepBody}>
                <div className={rStyles.stepTitle}>{s.title}</div>
                <p className={rStyles.stepDesc}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Compatibility Matrix cells */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Compatibility Matrix Cells</div>
        <p className={rStyles.matrixIntro}>
          The 2×2 compatibility matrix tests every application/database version combination that
          can exist during a rolling deployment window. An incompatibility in any non-baseline cell
          constitutes a migration risk.
        </p>
        <div className={styles.cardGrid}>
          {MATRIX.map(m => (
            <div key={m.combo} className={styles.card}>
              <code style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>{m.combo}</code>
              <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: '0.375rem' }}>{m.label}</div>
              <p style={{ fontSize: '0.875rem' }}>{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fault classes */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Fault Classes</div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fault Class</th>
                <th>Classification</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {FAULT_CLASSES.map(f => (
                <tr key={f.code}>
                  <td><code>{f.code}</code></td>
                  <td>
                    {f.severity === 'safe'
                      ? <span className={styles.badgeSafe}>SAFE</span>
                      : <span className={styles.badgeUnsafe}>UNSAFE</span>}
                  </td>
                  <td style={{ color: 'var(--text)' }}>{f.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Evaluation boundary */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Evaluation Boundary</div>
        <div className={`${styles.notice} ${styles.noticeAmber}`}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>n=4 controlled dataset.</strong> This research evaluates MigrationGuard against a
            controlled benchmark of four migration scenarios (two UNSAFE, two SAFE) across two
            application stacks. These results confirm correct classification within the controlled
            dataset. They do <em>not</em> establish generalized production accuracy, and no such claim
            is made. The benchmark is a proof-of-concept evaluation, not a production validation suite.
          </div>
        </div>
      </section>
    </div>
  );
}
