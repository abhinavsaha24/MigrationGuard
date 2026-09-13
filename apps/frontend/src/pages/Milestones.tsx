import styles from './Milestones.module.css';
import { GitCommit, CheckCircle2 } from 'lucide-react';

const MILESTONES = [
  { id: 'M00', title: 'Repository Bootstrap & Toolchain',       phase: 'CORE',       status: 'COMPLETE', desc: 'Monorepo scaffold, npm workspaces, strict TypeScript configuration, ESLint, Prettier, and CI.' },
  { id: 'M01', title: 'Database Schema & Server API',          phase: 'BACKEND',    status: 'COMPLETE', desc: 'Prisma schema (User, VerificationRun, MatrixCell, Evidence), Fastify API server, and authentication routes.' },
  { id: 'M02', title: 'Ephemeral Sandbox Engine',              phase: 'SANDBOX',    status: 'COMPLETE', desc: 'Dockerized PostgreSQL lifecycle management — dynamic provisioning, schema seeding, and teardown.' },
  { id: 'M03', title: 'Migration & Schema Transition Engine',   phase: 'MIGRATION',  status: 'COMPLETE', desc: 'Applies pg_dump baseline snapshots and raw SQL migrations against isolated sandbox instances.' },
  { id: 'M04', title: 'Application Workload Runner',           phase: 'EXECUTION',  status: 'COMPLETE', desc: 'Executes parameterized HTTP workloads against containerized application versions and records responses.' },
  { id: 'M05', title: '2×2 Compatibility Matrix Engine',        phase: 'MATRIX',     status: 'COMPLETE', desc: 'Evaluates the 4 deployment permutations (OLD+V1, OLD+V2, NEW+V1, NEW+V2) to classify migration safety.' },
  { id: 'M06', title: 'Evidence Artifact & Integrity Engine',   phase: 'EVIDENCE',   status: 'COMPLETE', desc: 'Captures request/response logs, computes SHA-256 integrity hashes, and persists artifacts in MinIO/S3.' },
  { id: 'M07', title: 'Authentication & RBAC Enforcement',      phase: 'SECURITY',   status: 'COMPLETE', desc: 'JWT authentication, Argon2 password hashing, and server-enforced ADMIN and REVIEWER roles.' },
  { id: 'M08', title: 'Controlled Comparative Benchmark',       phase: 'BENCHMARK',  status: 'COMPLETE', desc: 'Ground-truth evaluation suite (n=5). Confirmed MigrationGuard F1 = 1.00 (0 false positives) vs Atlas Static F1 = 0.75.' },
  { id: 'M09', title: 'Research & Public Documentation Site',   phase: 'FRONTEND',   status: 'COMPLETE', desc: 'Technical web interface: System Overview, Architecture, Research Methodology, Benchmark, Results, and Changelog.' },
  { id: 'M10', title: 'Operational Dashboard & Runs Explorer',  phase: 'DASHBOARD',  status: 'COMPLETE', desc: 'Protected telemetry console with search, filtering, run detail inspect, and evidence artifact download.' },
  { id: 'M11', title: 'Production Containerization & Gateway',  phase: 'DEPLOYMENT', status: 'COMPLETE', desc: 'Production Docker Compose stack with Nginx reverse proxy, health checks, and Cloudflare Tunnel integration.' },
  { id: 'M12', title: 'System Hardening & Pre-Deployment Audit',phase: 'AUDIT',      status: 'COMPLETE', desc: 'Full monorepo verification, dead-code elimination, security review, and reproducibility runbooks.' },
];

export default function Milestones() {
  return (
    <div className={styles.page}>
      
      <header className={styles.header}>
        <div className={styles.headerLabel}>ENGINEERING CHANGELOG</div>
        <h1 className={styles.title}>Project Milestones</h1>
        <p className={styles.subtitle}>
          M00 through M12 represent the complete engineering history of MigrationGuard.
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
                {m.phase}
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


