import { Link } from 'react-router-dom';
import styles from './Page.module.css';
import pStyles from './Project.module.css';
import { ShieldCheck, ArrowRight } from 'lucide-react';

const TECH_STACK = [
  { layer: 'Frontend',    tech: 'React 19, Vite 8, React Router 7, TypeScript' },
  { layer: 'Backend',     tech: 'Fastify 5, Prisma ORM, Zod validation, JWT auth' },
  { layer: 'Database',    tech: 'PostgreSQL 17 (metadata), Prisma schema migrations' },
  { layer: 'Storage',     tech: 'MinIO (S3-compatible object storage for evidence)' },
  { layer: 'Security',    tech: 'Argon2id password hashing, RBAC (ADMIN / REVIEWER)' },
  { layer: 'Deployment',  tech: 'Docker Compose, Nginx reverse proxy, production simulation' },
  { layer: 'CI/CD',       tech: 'GitHub Actions — build, lint, test, benchmark pipeline' },
];

export default function Project() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.pageLabel}>Project Overview</div>
        <h1 className={styles.pageTitle}>MigrationGuard</h1>
        <p className={styles.pageSubtitle}>
          A research prototype for application-aware PostgreSQL migration compatibility verification.
          Determines deployment safety by executing real workloads — not static schema analysis.
        </p>
      </div>

      {/* Status block */}
      <section className={pStyles.statusRow}>
        <div className={pStyles.statusCard}>
          <div className={pStyles.statusKey}>Status</div>
          <div className={pStyles.statusVal}>READY FOR LOCAL DEMONSTRATION</div>
        </div>
        <div className={pStyles.statusCard}>
          <div className={pStyles.statusKey}>Deployment</div>
          <div className={pStyles.statusVal}>LOCAL_PRODUCTION_SIMULATION</div>
        </div>
        <div className={pStyles.statusCard}>
          <div className={pStyles.statusKey}>Public URL</div>
          <div className={pStyles.statusVal}><code>http://localhost/</code></div>
        </div>
        <div className={pStyles.statusCard}>
          <div className={pStyles.statusKey}>Milestones</div>
          <div className={pStyles.statusVal}>M0–M12 COMPLETE</div>
        </div>
      </section>

      {/* What it is */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>What MigrationGuard Does</div>
        <div className={pStyles.descCard}>
          <ShieldCheck size={24} style={{ color: 'var(--blue)', marginBottom: '0.875rem' }} />
          <p>
            MigrationGuard executes real HTTP workloads against ephemeral PostgreSQL instances to
            determine whether a database migration is safe to deploy across all application versions
            that will coexist during a rolling deployment window. It produces a 2×2 compatibility matrix
            classifying each combination of old/new application against old/new schema, and stores
            byte-level evidence artifacts for auditing.
          </p>
        </div>
      </section>

      {/* Technology stack */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Technology Stack</div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Layer</th>
                <th>Technology</th>
              </tr>
            </thead>
            <tbody>
              {TECH_STACK.map(t => (
                <tr key={t.layer}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)', width: '160px' }}>{t.layer}</td>
                  <td>{t.tech}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Research context */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Research Context</div>
        <div className={pStyles.researchGrid}>
          <div className={pStyles.researchCard}>
            <div className={pStyles.researchNum}>n=4</div>
            <div className={pStyles.researchLabel}>Controlled benchmark cases</div>
          </div>
          <div className={pStyles.researchCard}>
            <div className={pStyles.researchNum}>1.00</div>
            <div className={pStyles.researchLabel}>MigrationGuard F1 (benchmark)</div>
          </div>
          <div className={pStyles.researchCard}>
            <div className={pStyles.researchNum}>0.67</div>
            <div className={pStyles.researchLabel}>Atlas F1 (benchmark)</div>
          </div>
          <div className={pStyles.researchCard}>
            <div className={pStyles.researchNum}>0</div>
            <div className={pStyles.researchLabel}>False positives (MigrationGuard)</div>
          </div>
        </div>
        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: 600 }}>
          These figures are derived from a controlled n=4 benchmark and do not establish generalized
          production accuracy. The benchmark is a proof-of-concept evaluation explicitly scoped to
          the cases described in the research documentation.
        </p>
      </section>

      {/* Quick links */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Explore</div>
        <div className={styles.cardGrid}>
          <Link to="/architecture" className={pStyles.exploreCard}>
            <div className={pStyles.exploreTitle}>Architecture <ArrowRight size={14} /></div>
            <p>System diagram, packages, deployment configuration.</p>
          </Link>
          <Link to="/research" className={pStyles.exploreCard}>
            <div className={pStyles.exploreTitle}>Research <ArrowRight size={14} /></div>
            <p>Methodology, fault classes, evaluation boundary.</p>
          </Link>
          <Link to="/benchmark" className={pStyles.exploreCard}>
            <div className={pStyles.exploreTitle}>Benchmark <ArrowRight size={14} /></div>
            <p>Confusion matrices, test cases, score comparison.</p>
          </Link>
          <Link to="/milestones" className={pStyles.exploreCard}>
            <div className={pStyles.exploreTitle}>Milestones <ArrowRight size={14} /></div>
            <p>M0–M12 engineering history and deliverables.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
