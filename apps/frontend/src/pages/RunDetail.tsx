import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle, XCircle, ArrowLeft, Download, Database, Activity, Code, FileJson, Hash, Sparkles, Wrench } from 'lucide-react';
import styles from './RunDetail.module.css';
import { RepairReviewModal } from '../components/RepairReviewModal';
import { AssistantDrawer } from '../components/AssistantDrawer';

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
  inputHashes?: Record<string, string>;
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
  if (s === 'PASS' || s === 'SAFE' || s === 'COMPATIBLE' || s === 'SAFE_VERIFIED' || s === 'SAFE_UNEXERCISED')
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

  // Repair Review & Assistant state
  const [isRepairOpen, setIsRepairOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantQuestion, setAssistantQuestion] = useState<string | undefined>();
  const [assistantCellState, setAssistantCellState] = useState<string | undefined>();
  const [proposal, setProposal] = useState<any>(null);
  const [loadingProposal, setLoadingProposal] = useState(false);

  const handleOpenRepair = async () => {
    setIsRepairOpen(true);
    if (!proposal && run) {
      setLoadingProposal(true);
      try {
        const API_BASE = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${API_BASE}/api/repair/proposals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            verificationId: run.id,
            faultCategory: run.evidence?.[0]?.faultType || 'DESTRUCTIVE_RENAME',
          }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          setProposal(data.data);
        }
      } catch (e) {
        console.error('Failed to load proposal', e);
      } finally {
        setLoadingProposal(false);
      }
    }
  };

  const handleDownload = async () => {
    if (!run || !run.id) return;
    setDownloading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_BASE}/api/runs/${run.id}/evidence`, {
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
      console.error('Download failed:', e.message);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || '';
    fetch(`${API_BASE}/api/runs/${id}`, {
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


  
  // Extract input hashes from the first evidence record
  const inputHashes = run.evidence && run.evidence[0] && run.evidence[0].inputHashes ? run.evidence[0].inputHashes : null;

  return (
    <div className={styles.consoleContainer}>
      <Link to="/dashboard/runs" className={styles.backBtn}>
        <ArrowLeft size={14} /> Back to Verification Runs
      </Link>

      <div className={styles.headerTop}>
        <div>
          <h1 className={styles.title}>{run.migrationName || 'Verification Run'}</h1>
          <p className={styles.subtitle}>ID: {run.id} • {new Date(run.timestamp).toLocaleString()}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
          <StatusBadge status={run.status} />
          {(run.status === 'FAIL' || run.status === 'UNSAFE' || run.status === 'INCOMPATIBLE') && (
            <div className={styles.actionButtons}>
              <button
                type="button"
                className={styles.btnAssistant}
                onClick={() => {
                  setAssistantCellState(undefined);
                  setAssistantQuestion('Why did this migration verification fail, and what evidence was observed?');
                  setIsAssistantOpen(true);
                }}
              >
                <Sparkles size={14} /> Explain this result
              </button>
              <button
                type="button"
                className={styles.btnRepair}
                onClick={handleOpenRepair}
                disabled={loadingProposal}
              >
                <Wrench size={14} /> {loadingProposal ? 'Loading proposal...' : 'Review repair proposal'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>Result</span>
          <div className={styles.metricValue}>
            {run.status === 'PASS' || run.status === 'SAFE' || run.status === 'COMPATIBLE' ? <CheckCircle className={styles.badgeSafe} size={24} style={{ border: 'none', background: 'transparent', padding: 0 }} /> : 
             run.status === 'FAIL' || run.status === 'UNSAFE' || run.status === 'INCOMPATIBLE' ? <XCircle className={styles.badgeUnsafe} size={24} style={{ border: 'none', background: 'transparent', padding: 0 }} /> : null}
            {run.status}
          </div>
        </div>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>Duration</span>
          <div className={styles.metricValue}>{(run.durationMs / 1000).toFixed(1)}s</div>
        </div>
        <div className={styles.metricBlock}>
          <span className={styles.metricLabel}>Evidence ID</span>
          <div className={styles.metricValue} style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
            {run.artifactHash ? run.artifactHash.substring(0, 16) + '...' : 'N/A'}
          </div>
        </div>
      </div>

      {/* THE PRODUCT STORY FLOW */}
      <h2 className={styles.sectionTitle} style={{ marginTop: '2rem' }}>Execution Provenance Flow</h2>
      
      <div className={styles.flowContainer}>
        {/* 1. INPUT */}
        <div className={styles.flowStep}>
          <div className={styles.flowHeader}>
            <Database size={16} /> INPUTS
          </div>
          <div className={styles.flowContent}>
            {inputHashes ? (
              <div style={{ display: 'grid', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>schema-v1.prisma</span>
                  <span>{inputHashes.schemaV1 ? inputHashes.schemaV1.substring(0, 8) : 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>schema-v2.prisma</span>
                  <span>{inputHashes.schemaV2 ? inputHashes.schemaV2.substring(0, 8) : 'N/A'}</span>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Inputs not recorded</div>
            )}
          </div>
        </div>

        <div className={styles.flowArrow}>↓</div>

        {/* 2. MIGRATION */}
        <div className={styles.flowStep}>
          <div className={styles.flowHeader}>
            <Code size={16} /> MIGRATION SQL
          </div>
          <div className={styles.flowContent}>
            {inputHashes && inputHashes.migrationSql ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>migration.sql</span>
                <span>{inputHashes.migrationSql.substring(0, 8)}</span>
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Migration not recorded</div>
            )}
          </div>
        </div>

        <div className={styles.flowArrow}>↓</div>

        {/* 3. WORKLOAD */}
        <div className={styles.flowStep}>
          <div className={styles.flowHeader}>
            <FileJson size={16} /> WORKLOAD
          </div>
          <div className={styles.flowContent}>
             {inputHashes && inputHashes.workloadJson ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>workload.json</span>
                <span>{inputHashes.workloadJson.substring(0, 8)}</span>
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Workload not recorded</div>
            )}
          </div>
        </div>

        <div className={styles.flowArrow}>↓</div>

        {/* 4. OBSERVATION */}
        <div className={styles.flowStep}>
          <div className={styles.flowHeader}>
            <Activity size={16} /> OBSERVATION & DB ERROR
          </div>
          <div className={styles.flowContent}>
            <div className={styles.matrixGrid}>
              {run.compatibility && run.compatibility.map((c) => {
                const isPass = c.status === 'PASS';
                return (
                  <div key={c.id} className={`${styles.matrixCell} ${isPass ? styles.pass : styles.fail}`} style={{ padding: '0.5rem' }}>
                    <div className={styles.matrixStatusRow}>
                      <span className={styles.matrixAppDb}>{c.appVersion}+{c.dbVersion}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    {c.error && (
                      <div className={styles.matrixError} style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>{c.error}</div>
                    )}
                    {!isPass && (
                      <button
                        type="button"
                        className={styles.explainCellBtn}
                        onClick={() => {
                          setAssistantCellState(`${c.appVersion}+${c.dbVersion}`);
                          setAssistantQuestion(`Why did state ${c.appVersion}+${c.dbVersion} fail during verification?`);
                          setIsAssistantOpen(true);
                        }}
                      >
                        <Sparkles size={12} /> [Explain this state]
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className={styles.flowArrow}>↓</div>

        {/* 5. VERDICT & EVIDENCE */}
        <div className={styles.flowStep}>
          <div className={styles.flowHeader}>
            <Hash size={16} /> VERDICT & EVIDENCE
          </div>
          <div className={styles.flowContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <StatusBadge status={run.status} />
              {run.artifactHash && (
                <button onClick={handleDownload} disabled={downloading} className={styles.btnDownload} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                  <Download size={14} /> Download Evidence
                </button>
              )}
            </div>
            
            <div className={styles.evidenceList}>
              {run.evidence && run.evidence.map((e) => (
                <div key={e.id} className={styles.evidenceItem} style={{ padding: '0.75rem' }}>
                  <div className={styles.evidenceHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className={e.confidence === 'CONFIRMED' ? styles.badgeConfirmed : styles.badgePending}>
                        {e.confidence}
                      </span>
                      <span className={styles.evidenceType}>{e.faultType}</span>
                    </div>
                  </div>
                  {e.observedError && (
                    <div className={styles.evidenceError} style={{ marginTop: '0.5rem' }}>{e.observedError}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {proposal && (
        <RepairReviewModal
          proposal={proposal}
          isOpen={isRepairOpen}
          onClose={() => setIsRepairOpen(false)}
          token={token || undefined}
        />
      )}

      <AssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        verificationId={run.id}
        initialQuestion={assistantQuestion}
        initialCellState={assistantCellState}
      />
    </div>
  );
}
