import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Activity, CheckCircle, XCircle, ArrowRight, ShieldCheck, ShieldAlert, Terminal } from 'lucide-react';
import styles from './Dashboard.module.css';

interface Run {
  id: string;
  migrationName: string;
  status: string;
  durationMs: number;
  timestamp: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/runs')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setRuns(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const total = runs.length;
  const passed = runs.filter(r => ['PASS', 'SAFE', 'COMPATIBLE'].includes(r.status?.toUpperCase())).length;
  const failed = runs.filter(r => ['FAIL', 'UNSAFE', 'INCOMPATIBLE'].includes(r.status?.toUpperCase())).length;
  const recentRuns = runs.slice(0, 8);

  return (
    <div className={styles.consoleContainer}>
      <header className={styles.consoleHeader}>
        <div>
          <h1 className={styles.title}>
            Operational Dashboard
          </h1>
          <p className={styles.subtitle}>
            Session active: <span className={styles.userEmail}>{user?.email}</span> 
            <span className={styles.roleBadge}>{user?.role}</span>
          </p>
        </div>
        <div className={styles.headerStatus}>
          <div className={styles.statusDot}></div>
          System Online
        </div>
      </header>

      {loading && (
        <div className={styles.loadingState}>
          <Terminal size={24} className={styles.loadingIcon} />
          <span>Initializing connection...</span>
        </div>
      )}
      
      {error && (
        <div className={styles.errorState}>
          <ShieldAlert size={24} className={styles.errorIcon} />
          <span>Connection failed: {error}</span>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className={styles.metricsBar}>
            <div className={styles.metricBlock}>
              <div className={styles.metricLabel}>Total Executions</div>
              <div className={styles.metricValue}>
                <Activity size={20} className={styles.iconBlue} />
                {total}
              </div>
            </div>
            <div className={styles.metricDivider}></div>
            <div className={styles.metricBlock}>
              <div className={styles.metricLabel}>Verified Safe</div>
              <div className={styles.metricValue}>
                <CheckCircle size={20} className={styles.iconGreen} />
                {passed}
              </div>
            </div>
            <div className={styles.metricDivider}></div>
            <div className={styles.metricBlock}>
              <div className={styles.metricLabel}>Blocked (Unsafe)</div>
              <div className={styles.metricValue}>
                <XCircle size={20} className={styles.iconRed} />
                {failed}
              </div>
            </div>
            <div className={styles.metricDivider}></div>
            <div className={styles.metricBlock}>
              <div className={styles.metricLabel}>System Reliability</div>
              <div className={styles.metricValueMono}>
                {total > 0 ? `${Math.round((passed / total) * 100)}%` : 'N/A'}
              </div>
            </div>
          </div>

          <div className={styles.logSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent Verification Runs</h2>
              {runs.length > 8 && (
                <Link to="/dashboard/runs" className={styles.viewAllLink}>
                  View All Log {runs.length} <ArrowRight size={14} />
                </Link>
              )}
            </div>

            {recentRuns.length === 0 ? (
              <div className={styles.emptyConsole}>
                <Terminal size={32} className={styles.emptyIcon} />
                <p>No verification logs found in current environment.</p>
                <code>$ migrationguard verify --target=latest</code>
              </div>
            ) : (
              <div className={styles.runList}>
                <div className={styles.runListHeader}>
                  <div className={styles.colStatus}>STATUS</div>
                  <div className={styles.colTarget}>TARGET MIGRATION</div>
                  <div className={styles.colTime}>EXECUTION TIME</div>
                  <div className={styles.colTimestamp}>TIMESTAMP (UTC)</div>
                </div>
                
                {recentRuns.map(r => {
                  const u = r.status?.toUpperCase();
                  const isPass = u === 'PASS' || u === 'SAFE' || u === 'COMPATIBLE';
                  const isFail = u === 'FAIL' || u === 'UNSAFE' || u === 'INCOMPATIBLE';
                  
                  return (
                    <Link to={`/dashboard/runs/${r.id}`} key={r.id} className={styles.runRow}>
                      <div className={styles.colStatus}>
                        {isPass ? (
                          <span className={styles.badgeSafe}><ShieldCheck size={14}/> SAFE</span>
                        ) : isFail ? (
                          <span className={styles.badgeUnsafe}><ShieldAlert size={14}/> UNSAFE</span>
                        ) : (
                          <span className={styles.badgePending}>{r.status}</span>
                        )}
                      </div>
                      <div className={styles.colTarget}>
                        <span className={styles.targetName}>{r.migrationName || 'Unnamed Migration'}</span>
                        <span className={styles.targetId}>{r.id.substring(0, 8)}</span>
                      </div>
                      <div className={styles.colTime}>
                        {(r.durationMs / 1000).toFixed(2)}s
                      </div>
                      <div className={styles.colTimestamp}>
                        {new Date(r.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
