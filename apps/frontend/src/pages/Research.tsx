import styles from './Research.module.css';
import { AlertTriangle, Info } from 'lucide-react';

const STEPS = [
  { n: '01', title: 'Sandbox Initialization', desc: 'Spin up an ephemeral PostgreSQL container seeded with the V1 schema and representative dataset.' },
  { n: '02', title: 'V1 Application Baseline', desc: 'Deploy the legacy application version. Execute an HTTP workload to establish the baseline compatibility state.' },
  { n: '03', title: 'V2 Migration Execution', desc: 'Apply the target migration to produce a V2 database schema inside the sandbox environment.' },
  { n: '04', title: 'HTTP Workload Evaluation', desc: 'Run the exact same HTTP workload against all four permutations: OLD+V1, OLD+V2, NEW+V1, NEW+V2.' },
  { n: '05', title: 'Deterministic Classification', desc: 'Classify each cell as COMPATIBLE or INCOMPATIBLE strictly based on HTTP response codes and identical response bodies.' },
  { n: '06', title: 'Evidence Generation', desc: 'Collect byte-level request/response logs. Compute SHA-256 integrity hashes. Store artifacts in immutable MinIO storage.' },
];

const FAULT_CLASSES = [
  { code: 'DESTRUCTIVE_RENAME',  desc: 'Column renamed without backward compatibility — old app queries fail on new schema.',  severity: 'unsafe' },
  { code: 'TYPE_NARROWING',      desc: 'Column type changed to a narrower domain — existing data or queries may be rejected.', severity: 'unsafe' },
  { code: 'NOT_NULL_ADDITION',   desc: 'NOT NULL constraint added without a default — inserts from old app fail.',              severity: 'unsafe' },
  { code: 'SAFE_ADD_COLUMN',     desc: 'Nullable column added — no existing query is broken.',                                 severity: 'safe'   },
  { code: 'SAFE_ADD_TABLE',      desc: 'New table added — has no effect on existing queries.',                                 severity: 'safe'   },
];

export default function Research() {
  return (
    <div className={styles.page}>
      
      <header className={styles.paperHeader}>
        <div className={styles.metaStrip}>
          <span className={styles.metaItem}>MigrationGuard Project</span>
          <span className={styles.metaItem}>Research Division</span>
          <span className={styles.metaItem}>Version 1.0.0</span>
        </div>
        <h1 className={styles.paperTitle}>Verification Methodology</h1>
        <p className={styles.paperAbstract}>
          <strong>Abstract:</strong> Controlled evaluation of application-level migration compatibility via causal execution 
          rather than schema-level static analysis. This paper outlines the theoretical framework and experimental 
          pipeline used to prove the efficacy of application-aware verification.
        </p>
      </header>

      <div className={styles.paperBody}>
        
        {/* Thesis block */}
        <section className={styles.paperSection}>
          <div className={styles.sectionMargin}>
            <span className={styles.marginNumber}>§1</span>
            <span className={styles.marginLabel}>Research Question</span>
          </div>
          <div className={styles.sectionContent}>
            <h2 className={styles.sectionHeading}>The Static Analysis Limitation</h2>
            <p className={styles.paragraph}>
              Can a tool that executes real HTTP workloads against ephemeral database containers
              detect migration-induced application incompatibilities that schema-only static analysis
              tools systematically miss?
            </p>
            <div className={styles.calloutBox}>
              <Info size={16} />
              <span>Static analysis examines database schemas in a vacuum, completely oblivious to how the application actually constructs queries or relies on underlying data types.</span>
            </div>
          </div>
        </section>

        <section className={styles.paperSection}>
          <div className={styles.sectionMargin}>
            <span className={styles.marginNumber}>§2</span>
            <span className={styles.marginLabel}>Hypothesis</span>
          </div>
          <div className={styles.sectionContent}>
            <h2 className={styles.sectionHeading}>Causal Execution Superiority</h2>
            <p className={styles.paragraph}>
              A tool that exercises actual application code against all four combinations of
              old/new application version and old/new database schema will produce fewer false negatives
              on application-level fault classes than tools restricted to static schema comparison.
            </p>
            <p className={styles.paragraph}>
              Schema-only static analysis may miss application-level incompatibilities that emerge
              only when application code is exercised against the migrated schema.
            </p>
          </div>
        </section>

        <section className={styles.paperSection}>
          <div className={styles.sectionMargin}>
            <span className={styles.marginNumber}>§3</span>
            <span className={styles.marginLabel}>Methodology</span>
          </div>
          <div className={styles.sectionContent}>
            <h2 className={styles.sectionHeading}>The Verification Pipeline</h2>
            <p className={styles.paragraph}>
              To test the hypothesis, we constructed a deterministic, six-stage pipeline that eliminates environmental variables.
            </p>
            <div className={styles.stepList}>
              {STEPS.map(s => (
                <div key={s.n} className={styles.stepItem}>
                  <div className={styles.stepMarker}>{s.n}</div>
                  <div className={styles.stepData}>
                    <h3 className={styles.stepTitle}>{s.title}</h3>
                    <p className={styles.stepDesc}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.paperSection}>
          <div className={styles.sectionMargin}>
            <span className={styles.marginNumber}>§4</span>
            <span className={styles.marginLabel}>Compatibility Matrix</span>
          </div>
          <div className={styles.sectionContent}>
            <h2 className={styles.sectionHeading}>The 2x2 Evaluation Model</h2>
            <p className={styles.paragraph}>
              The 2×2 compatibility matrix tests every application/database version combination that
              can exist during a rolling deployment window. An incompatibility in any non-baseline cell
              constitutes a migration risk.
            </p>
            <div className={styles.matrixTable}>
              <div className={styles.matrixRow}>
                <div className={styles.matrixCellHeader}>OLD + V1</div>
                <div className={styles.matrixCellData}><strong>Baseline.</strong> Should always pass. If this fails, the test setup is invalid.</div>
              </div>
              <div className={styles.matrixRow}>
                <div className={styles.matrixCellHeader}>OLD + V2</div>
                <div className={styles.matrixCellData}><strong>Forward.</strong> Tests whether the old app still works after migration is applied.</div>
              </div>
              <div className={styles.matrixRow}>
                <div className={styles.matrixCellHeader}>NEW + V1</div>
                <div className={styles.matrixCellData}><strong>Rollback.</strong> Tests whether the new app can tolerate rollback to the old schema.</div>
              </div>
              <div className={styles.matrixRow}>
                <div className={styles.matrixCellHeader}>NEW + V2</div>
                <div className={styles.matrixCellData}><strong>Target.</strong> Should always pass. Confirms the migration succeeds for the new app.</div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.paperSection}>
          <div className={styles.sectionMargin}>
            <span className={styles.marginNumber}>§5</span>
            <span className={styles.marginLabel}>Fault Classes</span>
          </div>
          <div className={styles.sectionContent}>
            <h2 className={styles.sectionHeading}>Taxonomy of Breaking Changes</h2>
            <div className={styles.faultTableWrap}>
              <table className={styles.faultTable}>
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
                      <td className={styles.faultDesc}>{f.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className={styles.paperSection}>
          <div className={styles.sectionMargin}>
            <span className={styles.marginNumber}>§6</span>
            <span className={styles.marginLabel}>Evaluation Boundary</span>
          </div>
          <div className={styles.sectionContent}>
            <h2 className={styles.sectionHeading}>Research Scope Limitations</h2>
            <div className={styles.limitationNotice}>
              <AlertTriangle size={16} className={styles.limitationIcon} />
              <div className={styles.limitationText}>
                <strong>n=4 controlled dataset.</strong> This research evaluates MigrationGuard against a
                controlled benchmark of four migration scenarios (two UNSAFE, two SAFE) across two
                application stacks. These results confirm correct classification within the controlled
                dataset. They do <em>not</em> establish generalized production accuracy, and no such claim
                is made. The benchmark is a proof-of-concept evaluation, not a production validation suite.
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
