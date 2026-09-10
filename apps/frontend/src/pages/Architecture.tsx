import { useState, useCallback } from 'react';
import styles from './Architecture.module.css';

const DIAGRAM_TABS = [
  {
    id: 'use-case',
    label: 'Use Case',
    title: 'UML Use Case Diagram',
    description:
      'Actors, system boundary, and use case relationships for the MigrationGuard verification system. Shows Developer, DevOps, and QA Engineer interactions with the 4-quadrant compatibility matrix pipeline.',
    src: `${import.meta.env.BASE_URL}docs/assets/diagrams/migrationguard-use-case.png`,
    alt: 'MigrationGuard UML Use Case Diagram showing actors (Developer/Engineer, DevOps/Release Engineer, QA Engineer/Test Analyst) and use cases including Run Compatibility Verification, Execute 4-Quadrant Compatibility Matrix, Generate Verdict, Build Evidence Record with SHA-256 provenance, and Store Report Artifact.',
  },
  {
    id: 'sequence',
    label: 'Sequence',
    title: 'UML Sequence Diagram',
    description:
      'Runtime execution flow across CompatibilityMatrixEngine, PostgresSandbox, MigrationEngine, ApplicationRunner, WorkloadReplayEngine, ObservationNormalizer, FaultClassifier, CausalAnalyzer, EvidenceBuilder, and Report Storage.',
    src: `${import.meta.env.BASE_URL}docs/assets/diagrams/migrationguard-sequence.png`,
    alt: 'MigrationGuard UML Sequence Diagram showing the 5-phase execution: Start Verification with SHA-256 provenance hashing, Sandbox Setup via Docker, 4-Quadrant Matrix Loop with workload replay and telemetry, Analysis phase producing EvidenceRecord with deterministic evidenceId, and Report Storage.',
  },
  {
    id: 'class',
    label: 'Class',
    title: 'UML Class Diagram',
    description:
      'Actual TypeScript classes from the repository: PostgresSandbox, MigrationEngine, ApplicationRunner, WorkloadReplayEngine, CompatibilityMatrixEngine, CompatibilityAnalyzer, ObservationNormalizer, FaultClassifier, CausalAnalyzer, WorkloadCoverageAnalyzer, TransitionAnalyzer, EvidenceBuilder, and PrismaMutationEngine.',
    src: `${import.meta.env.BASE_URL}docs/assets/diagrams/migrationguard-class.png`,
    alt: 'MigrationGuard UML Class Diagram showing 13 real classes with their actual TypeScript attributes and methods. CompatibilityMatrixEngine orchestrates PostgresSandbox, MigrationEngine, ApplicationRunner, and WorkloadReplayEngine. CompatibilityAnalyzer uses ObservationNormalizer, FaultClassifier, CausalAnalyzer, WorkloadCoverageAnalyzer, TransitionAnalyzer, and EvidenceBuilder to produce EvidenceRecord with deterministic evidenceId.',
  },
];

const SYSTEM_NODES = [
  { id: 'SYS-01', name: 'Nginx Gateway', desc: 'Reverse proxy and static asset delivery.' },
  { id: 'SYS-02', name: 'Fastify API', desc: 'Authentication, RBAC, and core business logic.' },
  { id: 'SYS-03', name: 'PostgreSQL Core', desc: 'Persistent state for users, runs, and metadata.' },
  { id: 'SYS-04', name: 'MinIO Storage', desc: 'S3-compatible immutable evidence artifact storage.' },
  { id: 'SYS-05', name: 'Verification Engine', desc: 'Orchestrates the 4-cell matrix test suite.' },
  { id: 'SYS-06', name: 'Ephemeral Sandbox', desc: 'Isolated Docker containers for runtime evaluation.' },
];

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;

export default function Architecture() {
  const [activeTab, setActiveTab] = useState('use-case');
  const [zoom, setZoom] = useState(1.0);
  const [imgError, setImgError] = useState<Record<string, boolean>>({});

  const activeDiagram = DIAGRAM_TABS.find((t) => t.id === activeTab)!;

  const zoomIn = useCallback(() => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2))), []);
  const resetZoom = useCallback(() => setZoom(1.0), []);

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setZoom(1.0);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTabChange(id);
    }
  };

  const handleViewportKey = (e: React.KeyboardEvent) => {
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn(); }
    if (e.key === '-') { e.preventDefault(); zoomOut(); }
    if (e.key === '0') { e.preventDefault(); resetZoom(); }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLabel}>UML DIAGRAMS & SYSTEM ARCHITECTURE</div>
        <h1 className={styles.title}>Architecture & Design</h1>
        <p className={styles.subtitle}>
          Three professional UML diagrams generated from the actual MigrationGuard source code.
          All classes, methods, and relationships are derived from the repository implementation.
        </p>
      </header>

      {/* Tab Bar */}
      <div className={styles.tabBar} role="tablist" aria-label="UML diagram type">
        {DIAGRAM_TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
            onClick={() => handleTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Diagram Panel */}
      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className={styles.diagramPanel}
      >
        <div className={styles.diagramHeader}>
          <div>
            <div className={styles.diagramTitle}>{activeDiagram.title}</div>
            <p className={styles.diagramDesc}>{activeDiagram.description}</p>
          </div>
          <div className={styles.zoomControls} aria-label="Zoom controls">
            <button
              className={styles.zoomBtn}
              onClick={zoomOut}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
              title="Zoom out (−)"
            >
              −
            </button>
            <span className={styles.zoomLevel} aria-label={`Zoom level ${Math.round(zoom * 100)}%`}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              className={styles.zoomBtn}
              onClick={zoomIn}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in"
              title="Zoom in (+)"
            >
              +
            </button>
            <button
              className={styles.zoomBtn}
              onClick={resetZoom}
              aria-label="Reset zoom to 100%"
              title="Reset zoom (0)"
            >
              ⊙
            </button>
          </div>
        </div>

        <div
          className={styles.diagramViewport}
          tabIndex={0}
          onKeyDown={handleViewportKey}
          aria-label={`${activeDiagram.title} — use + / − / 0 keys to zoom`}
        >
          {imgError[activeTab] ? (
            <div className={styles.diagramError} role="alert">
              <span>Diagram image not available.</span>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                {activeDiagram.src}
              </span>
            </div>
          ) : (
            <div className={styles.diagramImgWrap} style={{ transform: `scale(${zoom})` }}>
              <img
                key={activeTab}
                src={activeDiagram.src}
                alt={activeDiagram.alt}
                className={styles.diagramImg}
                onError={() => setImgError((prev) => ({ ...prev, [activeTab]: true }))}
                loading="lazy"
                draggable={false}
              />
            </div>
          )}
        </div>
      </div>

      {/* Infrastructure Section */}
      <section className={styles.infraSection} aria-labelledby="infra-heading">
        {/* Hero Architecture Diagram */}
        <div className={styles.sectionHeader}>
          <h2 id="infra-heading">Infrastructure Topology</h2>
        </div>
        <div className={styles.diagramSection}>
          <div className={styles.diagramWrap}>
            <svg
              className={styles.diagram}
              viewBox="0 0 1000 700"
              preserveAspectRatio="xMidYMid meet"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="MigrationGuard infrastructure topology diagram"
              role="img"
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

              {/* Docker Boundary Box */}
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
        </div>

        {/* Components List */}
        <div className={styles.componentsSection}>
          <div className={styles.sectionHeader}>
            <h2>Core Components</h2>
          </div>
          <div className={styles.nodeGrid}>
            {SYSTEM_NODES.map((node) => (
              <div key={node.id} className={styles.nodeCard}>
                <div className={styles.nodeId}>{node.id}</div>
                <h3 className={styles.nodeName}>{node.name}</h3>
                <p className={styles.nodeDesc}>{node.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Deployment Specs */}
        <div className={styles.specsSection}>
          <div className={styles.specsPanel}>
            <div className={styles.specsHeader}>PRODUCTION DEPLOYMENT CONFIGURATION</div>
            <div className={styles.specsBody}>
              <div className={styles.specRow}>
                <span className={styles.specKey}>Network Entry</span>
                <span className={styles.specVal}><code>https://yourdomain.com</code> — Host Nginx + Let's Encrypt</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specKey}>Docker Frontend</span>
                <span className={styles.specVal}><code>127.0.0.1:8080:80</code> — HTTP only, TLS at host</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specKey}>Internal API</span>
                <span className={styles.specVal}><code>backend:3000</code> — Internal Docker network</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specKey}>Auth Strategy</span>
                <span className={styles.specVal}>JWT Bearer · RBAC enforcement · fail-fast on missing secret</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specKey}>Evidence Storage</span>
                <span className={styles.specVal}>MinIO (local) or AWS S3 (production) · credentials server-side only</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
