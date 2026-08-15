import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Activity, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
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
  const recentRuns = runs.slice(0, 5);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        Welcome{user?.email ? `, ${user.email.split('@')[0]}` : ''}
      </h1>
      <p className={styles.subtitle}>
        MigrationGuard verification dashboard —{' '}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          {user?.role}
        </span>
      </p>

      {loading && <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Loading…</p>}
      {error   && <p style={{ color: 'var(--red)', marginBottom: '1.5rem' }}>Error: {error}</p>}

      {!loading && !error && (
        <>
          <div className={styles.stats} style={{ marginBottom: '2rem' }}>
            <div className={styles.statCard}>
              <h3>Total Runs</h3>
              <div className={styles.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={18} style={{ color: 'var(--blue)' }} />
                {total}
              </div>
            </div>
            <div className={styles.statCard}>
              <h3>Passed</h3>
              <div className={styles.value} style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={18} />
                {passed}
              </div>
            </div>
            <div className={styles.statCard}>
              <h3>Failed</h3>
              <div className={styles.value} style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <XCircle size={18} />
                {failed}
              </div>
            </div>
            <div className={styles.statCard}>
              <h3>Pass Rate</h3>
              <div className={styles.value} style={{ fontSize: '1.5rem' }}>
                {total > 0 ? `${Math.round((passed / total) * 100)}%` : '—'}
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2>Recent Runs</h2>
            {recentRuns.length === 0 ? (
              <div className={styles.emptyState}>
                <Clock size={32} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
                <p>No verification runs yet.</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.375rem' }}>
                  Use the CLI to run <code>migrationguard verify</code>.
                </p>
              </div>
            ) : (
              <>
                <div className={styles.grid}>
                  {recentRuns.map(r => {
                    const u = r.status?.toUpperCase();
                    const isPass = u === 'PASS' || u === 'SAFE' || u === 'COMPATIBLE';
                    const isFail = u === 'FAIL' || u === 'UNSAFE' || u === 'INCOMPATIBLE';
                    return (
                      <Link to={`/dashboard/runs/${r.id}`} key={r.id} className={styles.card}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                          {isPass
                            ? <CheckCircle size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />
                            : isFail
                              ? <XCircle size={14} style={{ color: 'var(--red)', flexShrink: 0 }} />
                              : null
                          }
                          <h3 style={{ margin: 0, fontSize: '0.875rem' }}>{r.migrationName || 'Unnamed Migration'}</h3>
                        </div>
                        <p style={{ fontSize: '0.75rem' }}>
                          <span className={isPass ? styles.statusSafe : isFail ? styles.statusUnsafe : styles.statusPending}>
                            {r.status}
                          </span>
                          {' · '}{(r.durationMs / 1000).toFixed(1)}s
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                          {new Date(r.timestamp).toLocaleString()}
                        </p>
                      </Link>
                    );
                  })}
                </div>
                {runs.length > 5 && (
                  <div style={{ marginTop: '1rem' }}>
                    <Link
                      to="/dashboard/runs"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--blue)' }}
                    >
                      View all {runs.length} runs <ArrowRight size={14} />
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
