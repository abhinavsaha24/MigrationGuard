import styles from './Page.module.css';
import mStyles from './Milestones.module.css';

const MILESTONES = [
  { id: 'M0',  title: 'Repository Bootstrap',        status: 'COMPLETE', desc: 'Monorepo scaffold, TypeScript configuration, ESLint, Prettier, initial GitHub Actions CI.' },
  { id: 'M1',  title: 'Database Schema & API',        status: 'COMPLETE', desc: 'Prisma schema (User, Run, MatrixCell, Evidence), Fastify API skeleton, authentication routes.' },
  { id: 'M2',  title: 'Sandbox Package',              status: 'COMPLETE', desc: 'Ephemeral PostgreSQL container lifecycle — create, seed, teardown using Docker SDK.' },
  { id: 'M3',  title: 'Migration Engine',             status: 'COMPLETE', desc: 'Applies pg_dump/restore and raw SQL migrations against sandbox instances.' },
  { id: 'M4',  title: 'Application Runner',           status: 'COMPLETE', desc: 'Executes HTTP workloads against containerized application versions and records responses.' },
  { id: 'M5',  title: 'Compatibility Matrix Engine',  status: 'COMPLETE', desc: 'Classifies the four OLD+V1, OLD+V2, NEW+V1, NEW+V2 cells into COMPATIBLE or INCOMPATIBLE.' },
  { id: 'M6',  title: 'Evidence Package',             status: 'COMPLETE', desc: 'Captures request/response artifacts, computes SHA-256 integrity hashes, stores in MinIO.' },
  { id: 'M7',  title: 'Auth + RBAC',                  status: 'COMPLETE', desc: 'JWT authentication, Argon2 password hashing, ADMIN and REVIEWER role enforcement.' },
  { id: 'M8',  title: 'Benchmark Runner',             status: 'COMPLETE', desc: 'Controlled n=4 evaluation suite. Ground truth frozen. MigrationGuard F1=1.00, Atlas F1=0.67.' },
  { id: 'M9',  title: 'Frontend — Public Site',       status: 'COMPLETE', desc: 'React + Vite public website: Home, Project, Architecture, Research, Benchmark, Results, Milestones.' },
  { id: 'M10', title: 'Frontend — Dashboard',         status: 'COMPLETE', desc: 'Protected dashboard with sidebar navigation, Runs list, RunDetail, compatibility matrix view.' },
  { id: 'M11', title: 'Docker Production Compose',    status: 'COMPLETE', desc: 'docker-compose.prod.yml with Nginx, Fastify, PostgreSQL, MinIO. LOCAL_PRODUCTION_SIMULATION verified.' },
  { id: 'M12', title: 'Final Forensic Hardening',     status: 'COMPLETE', desc: 'Repository audit, dead-code removal, security review, FINAL-RELEASE-AUDIT.md, DEMO-RUNBOOK.md.' },
];

export default function Milestones() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.pageLabel}>Project History</div>
        <h1 className={styles.pageTitle}>Milestones</h1>
        <p className={styles.pageSubtitle}>
          M0 through M12 represent the complete engineering history of MigrationGuard.
          All milestones are closed. There is no M13.
        </p>
      </div>

      {/* Timeline strip */}
      <section className={mStyles.timelineSection}>
        <div className={mStyles.timelineTrack}>
          {MILESTONES.map((m, i) => (
            <div key={m.id} className={mStyles.timelineNode}>
              <div className={mStyles.timelineDot} />
              <div className={mStyles.timelineId}>{m.id}</div>
              {i < MILESTONES.length - 1 && <div className={mStyles.timelineLine} />}
            </div>
          ))}
        </div>
      </section>

      {/* Detailed cards */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Milestone Detail</div>
        <div className={mStyles.milestoneList}>
          {MILESTONES.map(m => (
            <div key={m.id} className={mStyles.milestoneCard}>
              <div className={mStyles.milestoneLeft}>
                <span className={mStyles.milestoneId}>{m.id}</span>
              </div>
              <div className={mStyles.milestoneBody}>
                <div className={mStyles.milestoneHeader}>
                  <span className={mStyles.milestoneTitle}>{m.title}</span>
                  <span className={mStyles.milestoneStatus}>✓ {m.status}</span>
                </div>
                <p className={mStyles.milestoneDesc}>{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
