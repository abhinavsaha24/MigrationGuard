import styles from './Architecture.module.css';
import pageStyles from './Page.module.css';

const PACKAGES = [
  { id: 'M2', name: 'Sandbox',           desc: 'Ephemeral PostgreSQL container lifecycle management' },
  { id: 'M3', name: 'Migration Engine',  desc: 'Applies schema migrations against sandbox instances' },
  { id: 'M4', name: 'App Runner',        desc: 'Executes HTTP workloads against running app versions' },
  { id: 'M5', name: 'Matrix Engine',     desc: 'Classifies 2×2 compatibility outcomes' },
  { id: 'M6', name: 'Evidence',          desc: 'Captures and integrity-checks artifacts via SHA-256' },
  { id: 'M8', name: 'Benchmark Runner',  desc: 'Executes controlled evaluation against ground truth' },
];

export default function Architecture() {
  return (
    <div className={pageStyles.page}>
      <div className={pageStyles.pageHeader}>
        <div className={pageStyles.pageLabel}>System Design</div>
        <h1 className={pageStyles.pageTitle}>Architecture</h1>
        <p className={pageStyles.pageSubtitle}>
          MigrationGuard is a Fastify API monorepo with a React frontend, deployed behind Nginx.
          The verification engine runs schema migrations and HTTP workloads inside ephemeral Docker
          containers to produce causal compatibility evidence.
        </p>
      </div>

      {/* Architecture Diagram */}
      <section className={pageStyles.section}>
        <div className={pageStyles.sectionTitle}>System Diagram</div>
        <div className={styles.diagramWrap}>
          <svg
            className={styles.diagram}
            viewBox="0 0 800 620"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="MigrationGuard system architecture diagram"
          >
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#3b3b48" />
              </marker>
              <marker id="arrowBlue" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
              </marker>
            </defs>

            {/* === USER TIER === */}
            <rect x="280" y="20" width="240" height="52" rx="8" fill="#18181c" stroke="#2a2a30" strokeWidth="1.5"/>
            <text x="400" y="42" textAnchor="middle" fill="#e8e8ed" fontSize="13" fontWeight="600" fontFamily="Inter,sans-serif">Browser / User</text>
            <text x="400" y="58" textAnchor="middle" fill="#6b6b78" fontSize="11" fontFamily="Inter,sans-serif">React + Vite</text>

            {/* Arrow: User → Nginx */}
            <line x1="400" y1="72" x2="400" y2="108" stroke="#2a2a30" strokeWidth="1.5" markerEnd="url(#arrowhead)"/>

            {/* === NGINX === */}
            <rect x="300" y="110" width="200" height="52" rx="8" fill="#1f1f24" stroke="#3b82f6" strokeWidth="1.5"/>
            <text x="400" y="132" textAnchor="middle" fill="#e8e8ed" fontSize="13" fontWeight="600" fontFamily="Inter,sans-serif">Nginx</text>
            <text x="400" y="148" textAnchor="middle" fill="#3b82f6" fontSize="11" fontFamily="Inter,sans-serif">:80 · Public entry point</text>

            {/* Arrow: Nginx → Fastify */}
            <line x1="400" y1="162" x2="400" y2="198" stroke="#2a2a30" strokeWidth="1.5" markerEnd="url(#arrowhead)"/>

            {/* === FASTIFY API === */}
            <rect x="250" y="200" width="300" height="72" rx="8" fill="#1f1f24" stroke="#2a2a30" strokeWidth="1.5"/>
            <text x="400" y="226" textAnchor="middle" fill="#e8e8ed" fontSize="13" fontWeight="600" fontFamily="Inter,sans-serif">Fastify API</text>
            <text x="400" y="242" textAnchor="middle" fill="#6b6b78" fontSize="11" fontFamily="Inter,sans-serif">Auth · RBAC · Runs · Presentations</text>
            <text x="400" y="258" textAnchor="middle" fill="#3b82f6" fontSize="10" fontFamily="Inter,sans-serif">:3000 · Internal only</text>

            {/* Arrows: Fastify → PostgreSQL / MinIO */}
            <line x1="310" y1="272" x2="160" y2="330" stroke="#2a2a30" strokeWidth="1.5" markerEnd="url(#arrowhead)"/>
            <line x1="490" y1="272" x2="640" y2="330" stroke="#2a2a30" strokeWidth="1.5" markerEnd="url(#arrowhead)"/>

            {/* === POSTGRESQL === */}
            <rect x="60" y="332" width="200" height="60" rx="8" fill="#18181c" stroke="#2a2a30" strokeWidth="1.5"/>
            <text x="160" y="357" textAnchor="middle" fill="#e8e8ed" fontSize="12" fontWeight="600" fontFamily="Inter,sans-serif">PostgreSQL</text>
            <text x="160" y="373" textAnchor="middle" fill="#6b6b78" fontSize="11" fontFamily="Inter,sans-serif">Metadata · Users · Runs</text>
            <text x="160" y="385" textAnchor="middle" fill="#3b82f6" fontSize="10" fontFamily="Inter,sans-serif">:5432 · Internal</text>

            {/* === MINIO === */}
            <rect x="540" y="332" width="200" height="60" rx="8" fill="#18181c" stroke="#2a2a30" strokeWidth="1.5"/>
            <text x="640" y="357" textAnchor="middle" fill="#e8e8ed" fontSize="12" fontWeight="600" fontFamily="Inter,sans-serif">MinIO</text>
            <text x="640" y="373" textAnchor="middle" fill="#6b6b78" fontSize="11" fontFamily="Inter,sans-serif">Evidence artifacts</text>
            <text x="640" y="385" textAnchor="middle" fill="#3b82f6" fontSize="10" fontFamily="Inter,sans-serif">:9001 · Local demo only</text>

            {/* Arrow: Fastify → Verification Engine */}
            <line x1="400" y1="272" x2="400" y2="408" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#arrowBlue)"/>

            {/* === VERIFICATION ENGINE === */}
            <rect x="250" y="410" width="300" height="52" rx="8" fill="#1f1f24" stroke="#3b82f6" strokeWidth="1.5"/>
            <text x="400" y="432" textAnchor="middle" fill="#e8e8ed" fontSize="13" fontWeight="600" fontFamily="Inter,sans-serif">Verification Engine</text>
            <text x="400" y="448" textAnchor="middle" fill="#6b6b78" fontSize="11" fontFamily="Inter,sans-serif">Sandbox · Runner · Matrix · Evidence</text>

            {/* Arrow: Engine → Compatibility Matrix */}
            <line x1="400" y1="462" x2="400" y2="498" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#arrowBlue)"/>

            {/* === COMPATIBILITY MATRIX === */}
            <rect x="280" y="500" width="240" height="44" rx="8" fill="#18181c" stroke="#34d399" strokeWidth="1.5"/>
            <text x="400" y="521" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="600" fontFamily="Inter,sans-serif">Compatibility Matrix</text>
            <text x="400" y="537" textAnchor="middle" fill="#6b6b78" fontSize="11" fontFamily="Inter,sans-serif">OLD+V1 · OLD+V2 · NEW+V1 · NEW+V2</text>

            {/* Arrows to Docker Sandboxes */}
            <line x1="330" y1="544" x2="180" y2="582" stroke="#2a2a30" strokeWidth="1.5" markerEnd="url(#arrowhead)"/>
            <line x1="470" y1="544" x2="620" y2="582" stroke="#2a2a30" strokeWidth="1.5" markerEnd="url(#arrowhead)"/>

            {/* === V1 SANDBOX === */}
            <rect x="80" y="584" width="200" height="28" rx="6" fill="#18181c" stroke="#2a2a30" strokeWidth="1"/>
            <text x="180" y="601" textAnchor="middle" fill="#6b6b78" fontSize="11" fontFamily="Inter,sans-serif">V1 Docker Sandbox</text>

            {/* === V2 SANDBOX === */}
            <rect x="520" y="584" width="200" height="28" rx="6" fill="#18181c" stroke="#2a2a30" strokeWidth="1"/>
            <text x="620" y="601" textAnchor="middle" fill="#6b6b78" fontSize="11" fontFamily="Inter,sans-serif">V2 Docker Sandbox</text>
          </svg>
        </div>
      </section>

      {/* Core Packages */}
      <section className={pageStyles.section}>
        <div className={pageStyles.sectionTitle}>Core Packages</div>
        <div className={styles.packageGrid}>
          {PACKAGES.map(p => (
            <div key={p.id} className={styles.packageCard}>
              <div className={styles.packageId}>{p.id}</div>
              <div className={styles.packageName}>{p.name}</div>
              <div className={styles.packageDesc}>{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Deployment notes */}
      <section className={pageStyles.section}>
        <div className={pageStyles.sectionTitle}>Deployment Configuration</div>
        <div className={styles.deployGrid}>
          <div className={styles.deployCard}>
            <div className={styles.deployKey}>Public Entry Point</div>
            <code>http://localhost:80</code>
          </div>
          <div className={styles.deployCard}>
            <div className={styles.deployKey}>API (internal)</div>
            <code>backend:3000</code>
          </div>
          <div className={styles.deployCard}>
            <div className={styles.deployKey}>Database (internal)</div>
            <code>postgres:5432</code>
          </div>
          <div className={styles.deployCard}>
            <div className={styles.deployKey}>Storage (local demo only)</div>
            <code>minio:9000 / :9001</code>
          </div>
          <div className={styles.deployCard}>
            <div className={styles.deployKey}>Auth</div>
            <code>JWT · RBAC (ADMIN / REVIEWER)</code>
          </div>
          <div className={styles.deployCard}>
            <div className={styles.deployKey}>Status</div>
            <code>LOCAL_PRODUCTION_SIMULATION</code>
          </div>
        </div>
      </section>

      <div className={`${pageStyles.notice} ${pageStyles.noticeAmber}`}>
        <strong>Note:</strong> MinIO port :9001 (console) is intentionally exposed in the local demo configuration
        for storage inspection. In a production deployment this port should not be publicly accessible.
      </div>
    </div>
  );
}
