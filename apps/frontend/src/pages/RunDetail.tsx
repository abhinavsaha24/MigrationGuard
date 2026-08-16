import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import styles from './Dashboard.module.css';

interface CompatibilityResult {
  id: string;
  appVersion: string;
  dbVersion: string;
  status: string;
  durationMs: number;
  error?: string;
}

interface EvidenceRecord {
  id: string;
  faultType: string;
  confidence: string;
  operation?: string;
  observedError?: string;
}

interface ReviewerDecision {
  id: string;
  decision: string;
  comment?: string;
  timestamp: string;
  reviewer: { email: string };
}

interface Run {
  id: string;
  migrationName: string;
  status: string;
  durationMs: number;
  artifactKey?: string;
  artifactHash?: string;
  artifactUrl?: string;
  timestamp: string;
  compatibility: CompatibilityResult[];
  evidence: EvidenceRecord[];
  ReviewerDecision: ReviewerDecision[];
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase();
  if (s === 'PASS' || s === 'SAFE' || s === 'COMPATIBLE')
    return <span className={styles.statusSafe}>✓ {status}</span>;
  if (s === 'FAIL' || s === 'UNSAFE' || s === 'INCOMPATIBLE')
    return <span className={styles.statusUnsafe}>✗ {status}</span>;
  return <span className={styles.statusPending}>{status}</span>;
}

export default function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!run || !run.id) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch(`/api/runs/${run.id}/evidence`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `evidence-${run.id}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (e: any) {
      setDownloadError(e.message);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    fetch(`/api/runs/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => { setRun(data); setLoading(false); })
    .catch(e => { setError(e.message); setLoading(false); });
  }, [id, token]);

  if (loading) return <div className={styles.container}><p style={{ color: 'var(--text-secondary)' }}>Loading…</p></div>;
  if (error)   return <div className={styles.container}><p style={{ color: 'var(--red)' }}>Error: {error}</p></div>;
  if (!run)    return <div className={styles.container}><p style={{ color: 'var(--text-secondary)' }}>Run not found.</p></div>;

  const passCount = run.compatibility.filter(c => c.status === 'PASS').length;
  const failCount = run.compatibility.filter(c => c.status === 'FAIL').length;

  return (
    <div className={styles.container}>
      <Link to="/dashboard/runs" className={styles.backBtn}>← Back to Runs</Link>

      <h1 className={styles.title}>{run.migrationName || 'Verification Run'}</h1>
      <p className={styles.subtitle} style={{ marginBottom: '1.5rem' }}>
        {new Date(run.timestamp).toLocaleString()}
      </p>

      <div className={styles.section}>
        <h2>Overview</h2>
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <h3>Result</h3>
            <div className={styles.value}><StatusBadge status={run.status} /></div>
          </div>
          <div className={styles.statCard}>
            <h3>Duration</h3>
            <div className={styles.value} style={{ fontSize: '1.25rem' }}>{(run.durationMs / 1000).toFixed(1)}s</div>
          </div>
          <div className={styles.statCard}>
            <h3>Pass / Fail</h3>
            <div className={styles.value} style={{ fontSize: '1.25rem' }}>
              <span style={{ color: 'var(--green)' }}>{passCount}</span>
              {' / '}
              <span style={{ color: 'var(--red)' }}>{failCount}</span>
            </div>
          </div>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          ID: {run.id}
        </p>
        {run.artifactHash && (
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
              SHA-256: {run.artifactHash}
            </p>
            <button
              onClick={handleDownload}
              disabled={downloading}
              style={{
                background: 'var(--accent)',
                color: 'var(--bg-card)',
                border: 'none',
                padding: '0.375rem 0.75rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: downloading ? 'not-allowed' : 'pointer',
                opacity: downloading ? 0.7 : 1
              }}
            >
              {downloading ? 'Downloading...' : 'Download Evidence'}
            </button>
            {downloadError && <span style={{ color: 'var(--red)', fontSize: '0.75rem' }}>{downloadError}</span>}
          </div>
        )}
      </div>

      {run.compatibility && run.compatibility.length > 0 && (
        <div className={styles.section}>
          <h2>Compatibility Matrix</h2>
          <div className={styles.matrixGrid}>
            {run.compatibility.map((c) => {
              const isPass = c.status === 'PASS';
              return (
                <div
                  key={c.id}
                  className={`${styles.matrixCard} ${isPass ? styles.compatible : styles.incompatible}`}
                >
                  <div className={styles.matrixCell}>
                    {c.appVersion} + {c.dbVersion}
                  </div>
                  <div className={styles.matrixStatus}>
                    <StatusBadge status={c.status} />
                  </div>
                  {c.error && (
                    <div className={styles.matrixFault}>{c.error}</div>
                  )}
                  {c.durationMs > 0 && (
                    <div className={styles.matrixFault}>{c.durationMs}ms</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {run.evidence && run.evidence.length > 0 && (
        <div className={styles.section}>
          <h2>Evidence ({run.evidence.length})</h2>
          <div className={styles.grid}>
            {run.evidence.map((e) => (
              <div key={e.id} className={styles.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                      padding: '0.2em 0.6em',
                      borderRadius: '100px',
                      background: e.confidence === 'CONFIRMED' ? 'var(--red-muted)' : 'var(--amber-muted)',
                      border: `1px solid ${e.confidence === 'CONFIRMED' ? 'var(--red-border)' : 'var(--amber-border)'}`,
                      color: e.confidence === 'CONFIRMED' ? 'var(--red)' : 'var(--amber)',
                    }}
                  >
                    {e.confidence}
                  </span>
                  <h3 style={{ fontSize: '0.875rem', margin: 0 }}>{e.faultType}</h3>
                </div>
                {e.operation && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--blue)' }}>
                    {e.operation}
                  </p>
                )}
                {e.observedError && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.375rem' }}>
                    {e.observedError}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {run.ReviewerDecision && run.ReviewerDecision.length > 0 && (
        <div className={styles.section}>
          <h2>Reviewer Decisions</h2>
          <div className={styles.grid}>
            {run.ReviewerDecision.map((d) => (
              <div key={d.id} className={styles.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      padding: '0.2em 0.6em',
                      borderRadius: '100px',
                      background: d.decision === 'ACCEPTED' ? 'var(--green-muted)' : d.decision === 'REJECTED' ? 'var(--red-muted)' : 'var(--amber-muted)',
                      border: `1px solid ${d.decision === 'ACCEPTED' ? 'var(--green-border)' : d.decision === 'REJECTED' ? 'var(--red-border)' : 'var(--amber-border)'}`,
                      color: d.decision === 'ACCEPTED' ? 'var(--green)' : d.decision === 'REJECTED' ? 'var(--red)' : 'var(--amber)',
                    }}
                  >
                    {d.decision}
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{d.reviewer.email}</span>
                </div>
                {d.comment && <p style={{ fontSize: '0.8125rem' }}>{d.comment}</p>}
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {new Date(d.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!run.compatibility || run.compatibility.length === 0) &&
       (!run.evidence || run.evidence.length === 0) && (
        <div className={styles.emptyState}>
          <p>No compatibility matrix or evidence recorded for this run.</p>
        </div>
      )}
    </div>
  );
}
