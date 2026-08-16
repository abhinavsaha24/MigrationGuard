import styles from './Milestones.module.css';
import { GitCommit, CheckCircle2 } from 'lucide-react';

const MILESTONES = [
  { id: '01',  title: 'Repository Bootstrap',        date: '01', status: 'COMPLETE', desc: 'Monorepo scaffold, TypeScript configuration, ESLint, Prettier, initial GitHub Actions CI.' },
  { id: '02',  title: 'Database Schema & API',        date: '02', status: 'COMPLETE', desc: 'Prisma schema (User, Run, MatrixCell, Evidence), Fastify API skeleton, authentication routes.' },
  { id: '03',  title: 'Sandbox Package',              date: '03', status: 'COMPLETE', desc: 'Ephemeral PostgreSQL container lifecycle — create, seed, teardown using Docker SDK.' },
  { id: '04',  title: 'Migration Engine',             date: '04', status: 'COMPLETE', desc: 'Applies pg_dump/restore and raw SQL migrations against sandbox instances.' },
  { id: '05',  title: 'Application Runner',           date: '05', status: 'COMPLETE', desc: 'Executes HTTP workloads against containerized application versions and records responses.' },
  { id: '06',  title: 'Compatibility Matrix Engine',  date: '06', status: 'COMPLETE', desc: 'Classifies the four OLD+V1, OLD+V2, NEW+V1, NEW+V2 cells into COMPATIBLE or INCOMPATIBLE.' },
  { id: '07',  title: 'Evidence Package',             date: '07', status: 'COMPLETE', desc: 'Captures request/response artifacts, computes SHA-256 integrity hashes, stores in MinIO.' },
  { id: '08',  title: 'Auth + RBAC',                  date: '08', status: 'COMPLETE', desc: 'JWT authentication, Argon2 password hashing, ADMIN and REVIEWER role enforcement.' },
  { id: '09',  title: 'Benchmark Runner',             date: '09', status: 'COMPLETE', desc: 'Controlled n=4 evaluation suite. Ground truth frozen. MigrationGuard F1=1.00, Atlas F1=0.67.' },
  { id: '10',  title: 'Frontend — Public Site',       date: '10', status: 'COMPLETE', desc: 'React + Vite public website: Home, Project, Architecture, Research, Benchmark, Results, Milestones.' },
  { id: '11', title: 'Frontend — Dashboard',         date: '11', status: 'COMPLETE', desc: 'Protected dashboard with sidebar navigation, Runs list, RunDetail, compatibility matrix view.' },
  { id: '12', title: 'Docker Production Compose',    date: '12', status: 'COMPLETE', desc: 'docker-compose.prod.yml with Nginx, Fastify, PostgreSQL, MinIO. LOCAL_PRODUCTION_SIMULATION verified.' },
  { id: '13', title: 'Final Forensic Hardening',     date: '13', status: 'COMPLETE', desc: 'Repository audit, dead-code removal, security review, FINAL-RELEASE-AUDIT.md, DEMO-RUNBOOK.md.' },
];

export default function Milestones() {
  return (
    <div className={styles.page}>
      
      <header className={styles.header}>
        <div className={styles.headerLabel}>ENGINEERING CHANGELOG</div>
        <h1 className={styles.title}>Project Milestones</h1>
        <p className={styles.subtitle}>
          M0 through M12 represent the complete engineering history of MigrationGuard.
          All milestones are closed and verified.
        </p>
      </header>

      <section className={styles.timelineSection}>
        <div className={styles.timelineContainer}>
          {/* Vertical line running through the center/left */}
          <div className={styles.timelineAxis}></div>
          
          {MILESTONES.map((m) => (
            <div key={m.id} className={styles.timelineNode}>
              
              <div className={styles.nodeDate}>
                {m.date}
              </div>
              
              <div className={styles.nodeMarker}>
                <GitCommit size={20} className={styles.commitIcon} />
              </div>
              
              <div className={styles.nodeContent}>
                <div className={styles.nodeCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.idBadge}>{m.id}</div>
                    <h3 className={styles.cardTitle}>{m.title}</h3>
                    <div className={styles.statusBadge}>
                      <CheckCircle2 size={12} /> {m.status}
                    </div>
                  </div>
                  <div className={styles.cardBody}>
                    <p>{m.desc}</p>
                  </div>
                </div>
              </div>

            </div>
          ))}

          {/* End marker */}
          <div className={`${styles.timelineNode} ${styles.timelineEnd}`}>
            <div className={styles.nodeDate}></div>
            <div className={styles.nodeMarker}>
              <div className={styles.endDot}></div>
            </div>
            <div className={styles.nodeContent}>
              <div className={styles.endText}>END OF LOG</div>
            </div>
          </div>
          
        </div>
      </section>

    </div>
  );
}
