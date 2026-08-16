import { Link } from 'react-router-dom';
import { ArrowRight, Activity, Database, GitMerge, FileCheck, ShieldCheck } from 'lucide-react';
import styles from './Home.module.css';

const PIPELINE = [
  { step: '01', icon: <Activity size={18} />, label: 'Application', desc: 'Execute live HTTP workloads against endpoints.' },
  { step: '02', icon: <Database size={18} />, label: 'Sandbox', desc: 'Ephemeral isolated PostgreSQL containers.' },
  { step: '03', icon: <GitMerge size={18} />, label: 'Migration', desc: 'Apply baseline schema and structural diff.' },
  { step: '04', icon: <ShieldCheck size={18} />, label: 'Matrix', desc: 'Evaluate the 4-cell deployment permutations.' },
  { step: '05', icon: <FileCheck size={18} />, label: 'Evidence', desc: 'Generate immutable SHA-256 research artifacts.' },
];

export default function Home() {
  return (
    <div className={styles.page}>
      
      {/* Editorial Hero */}
      <section className={styles.heroSection}>
        <div className={styles.heroLayout}>
          <div className={styles.heroContent}>
            <div className={styles.researchLabel}>
              <span className={styles.pulseNode} />
              Research Prototype · Application-Aware Verification
            </div>
            
            <h1 className={styles.heroTitle}>
              DATABASE MIGRATIONS <br />
              YOU CAN ACTUALLY <span className={styles.heroHighlight}>VERIFY</span>
            </h1>
            
            <p className={styles.heroText}>
              Schema-only static analysis cannot detect application-level incompatibilities 
              that emerge during rolling deployments. MigrationGuard runs real HTTP workloads 
              against ephemeral database instances, capturing causal evidence of breaking changes.
            </p>
            
            <div className={styles.heroActions}>
              <Link to="/research" className={styles.primaryBtn}>
                Explore Methodology <ArrowRight size={16} />
              </Link>
              <Link to="/benchmark" className={styles.secondaryBtn}>
                View Benchmark
              </Link>
            </div>
          </div>
          
          <div className={styles.heroMetricsPane}>
            <div className={styles.paneHeader}>
              <span className={styles.paneLabel}>EVALUATION METRICS</span>
              <span className={styles.paneScope}>n=4 dataset</span>
            </div>
            
            <div className={styles.metricsGrid}>
              <div className={styles.metricBlock}>
                <div className={styles.metricVal}>1.00</div>
                <div className={styles.metricName}>MigrationGuard F1</div>
              </div>
              
              <div className={styles.metricBlock}>
                <div className={styles.metricVal}>0.67</div>
                <div className={styles.metricName}>Atlas Static Analysis F1</div>
              </div>
              
              <div className={styles.metricBlock}>
                <div className={styles.metricVal}>100%</div>
                <div className={styles.metricName}>Causal Evidence</div>
              </div>
              
              <div className={styles.metricBlock}>
                <div className={styles.metricVal}>0</div>
                <div className={styles.metricName}>False Positives</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The 2x2 Compatibility Matrix Diagram */}
      <section className={styles.matrixSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>The Compatibility Matrix</h2>
          <p className={styles.sectionDesc}>
            Every migration must be evaluated across the four discrete permutations that exist 
            during a zero-downtime rolling deployment.
          </p>
        </div>
        
        <div className={styles.matrixDiagram}>
          {/* Axis Labels */}
          <div className={styles.diagramCorner}></div>
          <div className={styles.diagramColLabel}>V1 DATABASE</div>
          <div className={styles.diagramColLabel}>V2 DATABASE</div>
          
          <div className={styles.diagramRowLabel}>OLD APP</div>
          <div className={`${styles.diagramCell} ${styles.cellNeutral}`}>
            <div className={styles.cellHeader}>
              <span className={styles.cellTitle}>BASELINE</span>
            </div>
            <p className={styles.cellBody}>Control group. Old application interacting with the pre-migration schema.</p>
          </div>
          <div className={`${styles.diagramCell} ${styles.cellActive}`}>
            <div className={styles.cellHeader}>
              <span className={styles.cellTitle}>FORWARD</span>
            </div>
            <p className={styles.cellBody}>Old application code interacting with the newly migrated schema.</p>
          </div>
          
          <div className={styles.diagramRowLabel}>NEW APP</div>
          <div className={`${styles.diagramCell} ${styles.cellActive}`}>
            <div className={styles.cellHeader}>
              <span className={styles.cellTitle}>ROLLBACK</span>
            </div>
            <p className={styles.cellBody}>New application code interacting with the old schema.</p>
          </div>
          <div className={`${styles.diagramCell} ${styles.cellNeutral}`}>
            <div className={styles.cellHeader}>
              <span className={styles.cellTitle}>TARGET</span>
            </div>
            <p className={styles.cellBody}>Final state. New application code interacting with the new schema.</p>
          </div>
        </div>
      </section>

      {/* Verification Pipeline */}
      <section className={styles.pipelineSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Verification Workflow</h2>
          <p className={styles.sectionDesc}>
            An engineered, deterministic process for testing every state boundary.
          </p>
        </div>
        
        <div className={styles.pipelineWorkflow}>
          <div className={styles.pipelineTrack}></div>
          
          {PIPELINE.map((item) => (
            <div key={item.step} className={styles.pipelineNode}>
              <div className={styles.nodeMarker}>{item.step}</div>
              <div className={styles.nodeCard}>
                <div className={styles.nodeHeader}>
                  {item.icon}
                  <h3>{item.label}</h3>
                </div>
                <p>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Research Limitation */}
      <section className={styles.limitationSection}>
        <div className={styles.limitationBox}>
          <strong>Methodological Limitation:</strong> All performance metrics (F1 = 1.00) are 
          derived strictly from the controlled n=4 benchmark dataset simulating standard fault classes. 
          This is a research prototype and does not represent generalized production accuracy guarantees.
        </div>
      </section>
      
    </div>
  );
}
