import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle, XCircle, ArrowLeft, Download, AlertTriangle } from 'lucide-react';
import styles from './RunDetail.module.css';

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
    return (
      <span className={styles.badgeSafe}>
        <CheckCircle size={14} /> {status}
      </span>
    );
  if (s === 'FAIL' || s === 'UNSAFE' || s === 'INCOMPATIBLE')
    return (
      <span className={styles.badgeUnsafe}>
        <XCircle size={14} /> {status}
      </span>
    );
  return <span className={styles.badgePending}>{status}</span>;
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

  if (loading) return (
    <div className={styles.consoleContainer}>
      <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Loading…</div>
    </div>
  );
  if (error) return (
    <div className={styles.consoleContainer}>
      <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>Error: {error}</div>
    </div>
  );
  if (!run) return (
    <div className={styles.consoleContainer}>
      <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Run not found.</div>
    </div>
  );

  const passCount = run.compatibility?.filter(c => c.status === 'PASS').length || 0;
  const failCount = run.compatibility?.filter(c => c.status === 'FAIL').length || 0;

  return (
    <div className={styles.consoleContainer}>
      <Link to="/dashboard/runs" className={styles.backBtn}>
        <ArrowLeft size={14} /> Back to Verification Runs
      </Link>

      <div className={styles.headerTop}>
        <div>
          <h1 className={styles.title}>{run.migrationName || 'Verification Run'}</h1>
          <p className={styles.subtitle}>ID: {run.id}</p>
        </div>
        <StatusBadge status={run.status} />
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>Result</span>
          <div className={styles.metricValue}>
            {run.status === 'SAFE' ? <CheckCircle className={styles.badgeSafe} size={24} style={{ border: 'none', background: 'transparent', padding: 0 }} /> : 
             run.status === 'UNSAFE' ? <XCircle className={styles.badgeUnsafe} size={24} style={{ border: 'none', background: 'transparent', padding: 0 }} /> : null}
            {run.status}
          </div>
        </div>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>Duration</span>
          <div className={styles.metricValue}>{(run.durationMs / 1000).toFixed(1)}s</div>
        </div>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>Pass</span>
          <div className={styles.metricValue} style={{ color: 'var(--green)' }}>{passCount}</div>
        </div>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>Fail</span>
          <div className={styles.metricValue} style={{ color: 'var(--red)' }}>{failCount}</div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Technical Metadata</h2>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)', marginRight: '0.5rem' }}>Timestamp:</span>
            <span>{new Date(run.timestamp).toLocaleString()}</span>
          </div>
          {run.artifactHash && (
            <div>
              <span style={{ color: 'var(--text-secondary)', marginRight: '0.5rem' }}>SHA-256:</span>
              <span>{run.artifactHash}</span>
            </div>
          )}
        </div>
      </div>

      {run.compatibility && run.compatibility.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Compatibility Matrix</h2>
          <div className={styles.matrixGrid}>
            {run.compatibility.map((c) => {
              const isPass = c.status === 'PASS';
              return (
                <div key={c.id} className={`${styles.matrixCell} ${isPass ? styles.pass : styles.fail}`}>
                  <div className={styles.matrixStatusRow}>
                    <span className={styles.matrixAppDb}>{c.appVersion} + {c.dbVersion}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  {c.durationMs > 0 && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Latency: {c.durationMs}ms
                    </div>
                  )}
                  {c.error && (
                    <div className={styles.matrixError}>{c.error}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {run.evidence && run.evidence.length > 0 && (
        <div className={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <h2 className={styles.sectionTitle} style={{ border: 'none', padding: 0, margin: 0 }}>Evidence Logs</h2>
            {run.artifactHash && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {downloadError && <span style={{ color: 'var(--red)', fontSize: '0.75rem' }}>{downloadError}</span>}
                <button onClick={handleDownload} disabled={downloading} className={styles.btnDownload}>
                  <Download size={14} /> {downloading ? 'Downloading...' : 'Download Cryptographic Evidence'}
                </button>
              </div>
            )}
          </div>
          
          <div className={styles.evidenceList}>
            {run.evidence.map((e) => (
              <div key={e.id} className={styles.evidenceItem}>
                <div className={styles.evidenceHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className={e.confidence === 'CONFIRMED' ? styles.badgeConfirmed : styles.badgePending}>
                      {e.confidence === 'CONFIRMED' ? <AlertTriangle size={12} /> : null}
                      {e.confidence}
                    </span>
                    <span className={styles.evidenceType}>{e.faultType}</span>
                  </div>
                </div>
                {e.operation && (
                  <div><span className={styles.evidenceOp}>{e.operation}</span></div>
                )}
                {e.observedError && (
                  <div className={styles.evidenceError}>{e.observedError}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {run.ReviewerDecision && run.ReviewerDecision.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Reviewer Decisions</h2>
          <div className={styles.decisionList}>
            {run.ReviewerDecision.map((d) => (
              <div key={d.id} className={styles.decisionItem}>
                <div className={styles.decisionHeader}>
                  <span className={
                    d.decision === 'ACCEPTED' ? styles.badgeSafe :
                    d.decision === 'REJECTED' ? styles.badgeUnsafe : styles.badgePending
                  }>
                    {d.decision}
                  </span>
                  <span className={styles.decisionReviewer}>{d.reviewer.email}</span>
                  <span className={styles.decisionTime}>{new Date(d.timestamp).toLocaleString()}</span>
                </div>
                {d.comment && <p className={styles.decisionComment}>{d.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {(!run.compatibility || run.compatibility.length === 0) &&
       (!run.evidence || run.evidence.length === 0) && (
        <div className={styles.section}>
          <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No compatibility matrix or evidence recorded for this run.</p>
          </div>
        </div>
      )}
    </div>
  );
}
