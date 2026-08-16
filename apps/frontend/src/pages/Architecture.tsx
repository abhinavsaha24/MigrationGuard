import styles from './Architecture.module.css';

const SYSTEM_NODES = [
  { id: 'SYS-01', name: 'Nginx Gateway', desc: 'Reverse proxy and static asset delivery.' },
  { id: 'SYS-02', name: 'Fastify API', desc: 'Authentication, RBAC, and core business logic.' },
  { id: 'SYS-03', name: 'PostgreSQL Core', desc: 'Persistent state for users, runs, and metadata.' },
  { id: 'SYS-04', name: 'MinIO Storage', desc: 'S3-compatible immutable evidence artifact storage.' },
  { id: 'SYS-05', name: 'Verification Engine', desc: 'Orchestrates the 4-cell matrix test suite.' },
  { id: 'SYS-06', name: 'Ephemeral Sandbox', desc: 'Isolated Docker containers for runtime evaluation.' },
];

export default function Architecture() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLabel}>SYSTEM ARCHITECTURE</div>
        <h1 className={styles.title}>Infrastructure Design</h1>
        <p className={styles.subtitle}>
          MigrationGuard isolates untrusted migration execution within ephemeral Docker containers. 
          The verification engine coordinates the state matrix without exposing the host to application-level faults.
        </p>
      </header>

      {/* Hero Architecture Diagram */}
      <section className={styles.diagramSection}>
        <div className={styles.diagramWrap}>
          <svg
            className={styles.diagram}
            viewBox="0 0 1000 700"
            preserveAspectRatio="xMidYMid meet"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="MigrationGuard architecture"
          >
            <defs>
              <marker id="arrowSolid" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--border-strong)" />
              </marker>
              <marker id="arrowBlue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--blue)" />
              </marker>
            </defs>

            {/* Browser */}
            <rect x="400" y="20" width="200" height="50" rx="6" className={styles.svgNode} />
            <text x="500" y="45" className={styles.svgTextStrong}>Browser UI</text>
            <text x="500" y="60" className={styles.svgTextMuted}>React SPA</text>
            <line x1="500" y1="70" x2="500" y2="110" className={styles.svgLine} markerEnd="url(#arrowSolid)" />

            {/* Nginx */}
            <rect x="400" y="115" width="200" height="50" rx="6" className={styles.svgNodeBlue} />
            <text x="500" y="140" className={styles.svgTextBlue}>Nginx Gateway</text>
            <text x="500" y="155" className={styles.svgTextMuted}>:80 Public</text>
            <line x1="500" y1="165" x2="500" y2="205" className={styles.svgLine} markerEnd="url(#arrowSolid)" />

            {/* Fastify */}
            <rect x="350" y="210" width="300" height="60" rx="6" className={styles.svgNode} />
            <text x="500" y="238" className={styles.svgTextStrong}>Fastify API</text>
            <text x="500" y="255" className={styles.svgTextMuted}>Internal :3000 · Auth & Runs</text>

            {/* DB & Storage Lines */}
            <path d="M350 240 L200 240 L200 310" className={styles.svgLine} fill="none" markerEnd="url(#arrowSolid)" />
            <path d="M650 240 L800 240 L800 310" className={styles.svgLine} fill="none" markerEnd="url(#arrowSolid)" />
            <line x1="500" y1="270" x2="500" y2="345" className={styles.svgLineActive} strokeDasharray="6 4" markerEnd="url(#arrowBlue)" />

            {/* Postgres */}
            <rect x="100" y="315" width="200" height="60" rx="6" className={styles.svgNodeSolid} />
            <text x="200" y="343" className={styles.svgTextStrong}>PostgreSQL</text>
            <text x="200" y="360" className={styles.svgTextMuted}>:5432 · Metadata</text>

            {/* MinIO */}
            <rect x="700" y="315" width="200" height="60" rx="6" className={styles.svgNodeSolid} />
            <text x="800" y="343" className={styles.svgTextStrong}>MinIO S3</text>
            <text x="800" y="360" className={styles.svgTextMuted}>:9000 · Evidence</text>

            {/* Verification Engine */}
            <rect x="350" y="350" width="300" height="60" rx="6" className={styles.svgNodeBlue} />
            <text x="500" y="378" className={styles.svgTextBlue}>Verification Engine</text>
            <text x="500" y="395" className={styles.svgTextMuted}>Orchestrator</text>
            <line x1="500" y1="410" x2="500" y2="475" className={styles.svgLineActive} markerEnd="url(#arrowBlue)" />

            {/* Docker Boundry Box */}
            <rect x="250" y="480" width="500" height="190" rx="8" className={styles.svgBoundary} strokeDasharray="8 6" />
            <text x="500" y="505" className={styles.svgTextMuted} fontWeight="600">DOCKER DAEMON</text>

            {/* Matrix Logic */}
            <rect x="350" y="520" width="300" height="40" rx="6" className={styles.svgNode} />
            <text x="500" y="545" className={styles.svgTextStrong}>Compatibility Matrix Engine</text>
            
            <path d="M400 560 L300 560 L300 600" className={styles.svgLine} fill="none" markerEnd="url(#arrowSolid)" />
            <path d="M600 560 L700 560 L700 600" className={styles.svgLine} fill="none" markerEnd="url(#arrowSolid)" />

            {/* Sandboxes */}
            <rect x="200" y="605" width="200" height="40" rx="6" className={styles.svgNodeSolid} />
            <text x="300" y="630" className={styles.svgTextStrong}>V1 Sandbox</text>

            <rect x="600" y="605" width="200" height="40" rx="6" className={styles.svgNodeSolid} />
            <text x="700" y="630" className={styles.svgTextStrong}>V2 Sandbox</text>
          </svg>
        </div>
      </section>

      {/* Components List */}
      <section className={styles.componentsSection}>
        <div className={styles.sectionHeader}>
          <h2>Core Components</h2>
        </div>
        <div className={styles.nodeGrid}>
          {SYSTEM_NODES.map(node => (
            <div key={node.id} className={styles.nodeCard}>
              <div className={styles.nodeId}>{node.id}</div>
              <h3 className={styles.nodeName}>{node.name}</h3>
              <p className={styles.nodeDesc}>{node.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Deployment Specs */}
      <section className={styles.specsSection}>
        <div className={styles.specsPanel}>
          <div className={styles.specsHeader}>LOCAL_PRODUCTION_SIMULATION CONFIGURATION</div>
          <div className={styles.specsBody}>
            <div className={styles.specRow}>
              <span className={styles.specKey}>Network Entry</span>
              <span className={styles.specVal}><code>http://localhost:80</code></span>
            </div>
            <div className={styles.specRow}>
              <span className={styles.specKey}>Internal API</span>
              <span className={styles.specVal}><code>backend:3000</code></span>
            </div>
            <div className={styles.specRow}>
              <span className={styles.specKey}>Auth Strategy</span>
              <span className={styles.specVal}>JWT Bearer · RBAC enforcement</span>
            </div>
            <div className={styles.specRow}>
              <span className={styles.specKey}>Storage Warning</span>
              <span className={styles.specVal}>MinIO <code>:9001</code> exposed for local inspection only</span>
            </div>
          </div>
        </div>
      </section>
      
    </div>
  );
}
