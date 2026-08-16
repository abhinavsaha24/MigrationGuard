import styles from './Results.module.css';
import { AlertTriangle, Terminal, Code2, Database, ShieldAlert, ShieldCheck } from 'lucide-react';

const RUN_LOGS = [
  {
    id: 'RUN-0xA1B2',
    timestamp: '2023-11-20T14:32:01Z',
    scenario: 'SAFE_ADD_COLUMN',
    target: 'public.users',
    verdict: 'SAFE',
    tool: 'MigrationGuard',
    diff: '+ bio text NULL',
    note: 'HTTP workload completed 200 OK across 4/4 matrix cells. No downstream application failure detected.',
  },
  {
    id: 'RUN-0xA1B3',
    timestamp: '2023-11-20T14:32:05Z',
    scenario: 'SAFE_ADD_COLUMN',
    target: 'public.users',
    verdict: 'UNSAFE',
    tool: 'Atlas (Static)',
    diff: '+ bio text NULL',
    note: '[FALSE POSITIVE] Static analysis flagged additive change as potentially breaking. Missing execution context.',
  },
  {
    id: 'RUN-0xB8C4',
    timestamp: '2023-11-20T14:35:22Z',
    scenario: 'DESTRUCTIVE_RENAME',
    target: 'public.users',
    verdict: 'UNSAFE',
    tool: 'MigrationGuard',
    diff: '- name text\n+ full_name text',
    note: 'V1 workload failed. 500 Internal Server Error. "column \'name\' does not exist". Integrity hash verified.',
  },
  {
    id: 'RUN-0xB8C5',
    timestamp: '2023-11-20T14:35:25Z',
    scenario: 'DESTRUCTIVE_RENAME',
    target: 'public.users',
    verdict: 'UNSAFE',
    tool: 'Atlas (Static)',
    diff: '- name text\n+ full_name text',
    note: 'Static analysis successfully detected destructive column drop/rename operation.',
  },
  {
    id: 'RUN-0xC9D5',
    timestamp: '2023-11-20T14:40:11Z',
    scenario: 'TYPE_NARROWING',
    target: 'public.accounts',
    verdict: 'UNSAFE',
    tool: 'MigrationGuard',
    diff: '- status varchar(255)\n+ status varchar(10)',
    note: 'V1 workload payload rejected by database during runtime insert. String truncation error.',
  },
  {
    id: 'RUN-0xC9D6',
    timestamp: '2023-11-20T14:40:14Z',
    scenario: 'TYPE_NARROWING',
    target: 'public.accounts',
    verdict: 'UNSAFE',
    tool: 'Atlas (Static)',
    diff: '- status varchar(255)\n+ status varchar(10)',
    note: 'Statically detected domain narrowing.',
  }
];

export default function Results() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLabel}>EXECUTION LOGS</div>
        <h1 className={styles.title}>Results Analysis</h1>
        <p className={styles.subtitle}>
          Raw technical output of the benchmark execution. Review the runtime logs to understand the 
          discrepancy between causal execution results (MigrationGuard) and static schema analysis (Atlas).
        </p>
      </header>

      {/* Aggregate Score Strip */}
      <section className={styles.scoreStrip}>
        <div className={styles.scoreBlock}>
          <div className={styles.scoreLabel}>MigrationGuard F1</div>
          <div className={styles.scoreValGreen}>1.00</div>
          <div className={styles.scoreSub}>Zero False Positives</div>
        </div>
        <div className={styles.scoreDivider}></div>
        <div className={styles.scoreBlock}>
          <div className={styles.scoreLabel}>Atlas F1</div>
          <div className={styles.scoreValRed}>0.67</div>
          <div className={styles.scoreSub}>Penalized by False Positives</div>
        </div>
      </section>

      {/* Primary finding callout */}
      <section className={styles.findingSection}>
        <div className={styles.terminalBox}>
          <div className={styles.termHeader}>
            <Terminal size={14} />
            <span>CRITICAL_FINDING.log</span>
          </div>
          <div className={styles.termBody}>
            <p><span className={styles.termYellow}>[WARN]</span> Static analysis systems exhibit a fundamental limitation when evaluating additive schema changes (e.g., <code>SAFE_ADD_COLUMN</code>).</p>
            <p><span className={styles.termBlue}>[INFO]</span> Because static tools lack visibility into the application's query construction logic, they must defensively classify additive changes as UNSAFE.</p>
            <p><span className={styles.termGreen}>[SUCCESS]</span> MigrationGuard's causal execution approach verifies that the legacy application code simply ignores the new column, correctly yielding a SAFE verdict.</p>
          </div>
        </div>
      </section>

      {/* Dense Execution Log */}
      <section className={styles.logSection}>
        <div className={styles.sectionHeader}>
          <Database size={18} />
          <h2>Execution Log</h2>
        </div>
        
        <div className={styles.logContainer}>
          {RUN_LOGS.map((log, i) => (
            <div key={i} className={styles.logEntry}>
              <div className={styles.logMeta}>
                <span className={styles.logId}>{log.id}</span>
                <span className={styles.logTime}>{log.timestamp}</span>
                <span className={styles.logTool}>{log.tool}</span>
              </div>
              
              <div className={styles.logContent}>
                <div className={styles.logHeader}>
                  <div className={styles.logScenario}>
                    <Code2 size={14} />
                    {log.scenario}
                  </div>
                  <div className={styles.logTarget}>{log.target}</div>
                  <div className={styles.logVerdict}>
                    {log.verdict === 'SAFE' 
                      ? <span className={styles.badgeSafe}><ShieldCheck size={12} /> SAFE</span>
                      : <span className={styles.badgeUnsafe}><ShieldAlert size={12} /> UNSAFE</span>
                    }
                  </div>
                </div>
                
                <div className={styles.logDetails}>
                  <pre className={styles.logDiff}>{log.diff}</pre>
                  <p className={styles.logNote}>{log.note}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Scope Disclaimer */}
      <section className={styles.disclaimerSection}>
        <div className={styles.disclaimerBox}>
          <AlertTriangle size={16} className={styles.disclaimerIcon} />
          <div className={styles.disclaimerText}>
            <strong>Research Boundary Acknowledgment</strong>
            <p>
              MigrationGuard classified all four controlled benchmark cases correctly. These results do not 
              establish generalized production accuracy and are not a substitute for comprehensive testing. 
              The benchmark is a proof-of-concept evaluation on a controlled n=4 dataset.
            </p>
          </div>
        </div>
      </section>
      
    </div>
  );
}
