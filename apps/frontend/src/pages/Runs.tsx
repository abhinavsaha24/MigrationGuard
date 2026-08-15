import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Database, CheckCircle, XCircle } from 'lucide-react';
import styles from './Dashboard.module.css';

interface Run {
  id: string;
  migrationName: string;
  status: string;
  durationMs: number;
  timestamp: string;
}

export default function Runs() {
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

  const statusClass = (s: string) => {
    const u = s?.toUpperCase();
    if (u === 'PASS' || u === 'SAFE' || u === 'COMPATIBLE') return styles.statusSafe;
    if (u === 'FAIL' || u === 'UNSAFE' || u === 'INCOMPATIBLE') return styles.statusUnsafe;
    return styles.statusPending;
  };

  const statusIcon = (s: string) => {
    const u = s?.toUpperCase();
    if (u === 'PASS' || u === 'SAFE' || u === 'COMPATIBLE')
      return <CheckCircle size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />;
    if (u === 'FAIL' || u === 'UNSAFE' || u === 'INCOMPATIBLE')
      return <XCircle size={14} style={{ color: 'var(--red)', flexShrink: 0 }} />;
    return null;
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Verification Runs</h1>
      <p className={styles.subtitle}>Migration compatibility verification history.</p>

      {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading runs…</p>}
      {error   && <p style={{ color: 'var(--red)' }}>Error: {error}</p>}

      {!loading && !error && (
        runs.length === 0
          ? (
            <div className={styles.emptyState}>
              <Activity size={32} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
              <p>No verification runs found.</p>
              <p style={{ fontSize: '0.875rem', marginTop: '0.375rem' }}>
                Runs are created by the CLI verification engine.
              </p>
            </div>
          )
          : (
            <div className={styles.grid}>
              {runs.map(r => (
                <Link to={`/dashboard/runs/${r.id}`} key={r.id} className={styles.card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Database size={14} style={{ color: 'var(--blue)', flexShrink: 0 }} />
                    <h3 style={{ margin: 0, fontSize: '0.9375rem' }}>{r.migrationName || 'Unnamed Migration'}</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                    {statusIcon(r.status)}
                    <span className={statusClass(r.status)} style={{ fontSize: '0.8125rem' }}>{r.status}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem' }}>{(r.durationMs / 1000).toFixed(1)}s</p>
                  <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {new Date(r.timestamp).toLocaleString()}
                  </p>
                  <p style={{ fontSize: '0.7rem', marginTop: '0.375rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.id}
                  </p>
                </Link>
              ))}
            </div>
          )
      )}
    </div>
  );
}
