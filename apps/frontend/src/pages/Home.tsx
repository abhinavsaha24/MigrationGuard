import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Database, Activity, AlertTriangle } from 'lucide-react';
import styles from './Home.module.css';

const PIPELINE = [
  { step: '01', label: 'Application', sub: 'Real HTTP workloads' },
  { step: '02', label: 'Sandbox', sub: 'Ephemeral containers' },
  { step: '03', label: 'Migration', sub: 'V1 → V2 schema diff' },
  { step: '04', label: 'Matrix', sub: '4-cell compatibility' },
  { step: '05', label: 'Evidence', sub: 'Integrity-checked artifacts' },
];

export default function Home() {
  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          <ShieldCheck size={12} />
          Research Prototype · LOCAL_PRODUCTION_SIMULATION
        </div>
        <h1 className={styles.heroTitle}>
          Database Migrations<br />
          <span className={styles.heroAccent}>You Can Actually Verify</span>
        </h1>
        <p className={styles.heroSub}>
          Schema-only static analysis cannot detect application-level incompatibilities
          that emerge only when real code is executed against a migrated schema.
          MigrationGuard runs actual HTTP workloads across all four deployment-boundary
          permutations and captures causal evidence.
        </p>
        <div className={styles.heroActions}>
          <Link to="/research" className={styles.primaryBtn}>
            Explore Research <ArrowRight size={15} />
          </Link>
          <Link to="/benchmark" className={styles.secondaryBtn}>
            Benchmark Results
          </Link>
          <Link to="/login" className={styles.ghostBtn}>
            Open Dashboard <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Key metrics strip */}
      <section className={styles.metricsStrip}>
        <div className={styles.metricItem}>
          <div className={styles.metricVal}>1.00</div>
          <div className={styles.metricDesc}>MigrationGuard F1</div>
        </div>
        <div className={styles.metricDivider} />
        <div className={styles.metricItem}>
          <div className={styles.metricVal}>0.67</div>
          <div className={styles.metricDesc}>Atlas F1</div>
        </div>
        <div className={styles.metricDivider} />
        <div className={styles.metricItem}>
          <div className={styles.metricVal}>4</div>
          <div className={styles.metricDesc}>Controlled benchmark cases</div>
        </div>
        <div className={styles.metricDivider} />
        <div className={styles.metricItem}>
          <div className={styles.metricVal}>0</div>
          <div className={styles.metricDesc}>False positives (MG)</div>
        </div>
      </section>

      {/* Why section */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>
          <AlertTriangle size={12} />
          The Problem
        </div>
        <h2 className={styles.sectionTitle}>Why schema-only analysis is insufficient</h2>
        <div className={styles.problemGrid}>
          <div className={styles.problemCard}>
            <div className={styles.problemIcon}><Database size={20} /></div>
            <h3>Static analysis only sees structure</h3>
            <p>Tools like Atlas examine schema diffs and can flag destructive operations, but cannot know
              whether your application code depends on the renamed column.</p>
          </div>
          <div className={styles.problemCard}>
            <div className={styles.problemIcon}><Activity size={20} /></div>
            <h3>Rolling deployments create transient states</h3>
            <p>During a real deployment, old and new application versions temporarily coexist.
              A migration may be safe for the new app but break the old app still receiving traffic.</p>
          </div>
          <div className={styles.problemCard}>
            <div className={styles.problemIcon}><ShieldCheck size={20} /></div>
            <h3>Causal evidence is required</h3>
            <p>Stores request/response evidence artifacts integrity-checked using SHA-256 hashes. Not static guessing.</p>
          </div>
        </div>
      </section>

      {/* 2x2 Compatibility Matrix */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>Core Concept</div>
        <h2 className={styles.sectionTitle}>The 2×2 Compatibility Matrix</h2>
        <p className={styles.sectionDesc}>
          Every migration is evaluated across four combinations of application version and database version —
          modeling every node state that can exist during a rolling deployment window.
        </p>
        <div className={styles.matrixOuter}>
          <div className={styles.matrixHeader}>
            <div />
            <div className={styles.matrixColLabel}>V1 Database</div>
            <div className={styles.matrixColLabel}>V2 Database</div>
          </div>
          <div className={styles.matrixRow}>
            <div className={styles.matrixRowLabel}>Old App</div>
            <div className={`${styles.matrixCell} ${styles.cellGreen}`}>
              <div className={styles.cellName}>Baseline</div>
              <div className={styles.cellDesc}>Old app + old schema</div>
            </div>
            <div className={`${styles.matrixCell} ${styles.cellBlue}`}>
              <div className={styles.cellName}>Forward</div>
              <div className={styles.cellDesc}>Old app, new schema</div>
            </div>
          </div>
          <div className={styles.matrixRow}>
            <div className={styles.matrixRowLabel}>New App</div>
            <div className={`${styles.matrixCell} ${styles.cellBlue}`}>
              <div className={styles.cellName}>Rollback</div>
              <div className={styles.cellDesc}>New app, old schema</div>
            </div>
            <div className={`${styles.matrixCell} ${styles.cellGreen}`}>
              <div className={styles.cellName}>Target</div>
              <div className={styles.cellDesc}>New app + new schema</div>
            </div>
          </div>
        </div>
        <div className={styles.matrixNotice}>
          Classification depends on which cells fail — not just whether the migration runs.
        </div>
      </section>

      {/* Verification Pipeline */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>Methodology</div>
        <h2 className={styles.sectionTitle}>Verification pipeline</h2>
        <div className={styles.pipeline}>
          {PIPELINE.map((s, i) => (
            <div key={s.step} className={styles.pipelineItem}>
              <div className={styles.pipelineStep}>{s.step}</div>
              <div className={styles.pipelineLabel}>{s.label}</div>
              <div className={styles.pipelineSub}>{s.sub}</div>
              {i < PIPELINE.length - 1 && <div className={styles.pipelineArrow}>→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Research limitation callout */}
      <div className={styles.limitationNotice}>
        <AlertTriangle size={15} />
        <span>
          <strong>Research scope:</strong> These results are derived from a controlled n=4 benchmark dataset.
          They do not establish generalized production accuracy. The benchmark is intentionally limited and
          explicitly documented.
        </span>
      </div>
    </div>
  );
}
