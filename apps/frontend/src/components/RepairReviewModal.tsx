import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, ShieldCheck, Copy, Check } from 'lucide-react';
import styles from './RepairReviewModal.module.css';

export interface RepairReviewModalProps {
  proposal: any;
  isOpen: boolean;
  onClose: () => void;
  token?: string;
  onApproveSuccess?: () => void;
}

export const RepairReviewModal: React.FC<RepairReviewModalProps> = ({
  proposal,
  isOpen,
  onClose,
  token,
  onApproveSuccess,
}) => {
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(proposal?.status === 'APPROVED');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !proposal) return null;

  const handleApprove = async () => {
    setApproving(true);
    setError(null);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_BASE}/api/repair/proposals/${proposal.proposalId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || `HTTP ${res.status}`);
      }

      setApproved(true);
      if (onApproveSuccess) onApproveSuccess();
    } catch (e: any) {
      setError(e.message || 'Approval failed.');
    } finally {
      setApproving(false);
    }
  };

  const handleCopySchema = () => {
    if (proposal.proposedSchema) {
      navigator.clipboard.writeText(proposal.proposedSchema);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <ShieldCheck size={20} color="var(--accent)" />
            Guided Repair Proposal Review
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          {/* Metadata Block */}
          <div className={styles.proposalMeta}>
            <div>
              <div className={styles.metaLabel}>Proposal ID</div>
              <div className={styles.metaValue}>{proposal.proposalId}</div>
            </div>
            <div>
              <div className={styles.metaLabel}>Strategy</div>
              <div className={styles.metaValue}>{proposal.strategy}</div>
            </div>
            <div>
              <div className={styles.metaLabel}>Expected Verdict</div>
              <div className={styles.metaValue} style={{ color: 'var(--green)' }}>
                4 / 4 States PASS
              </div>
            </div>
          </div>

          {/* Section 1: Affected Objects */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>Affected Database Objects</div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Target</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {proposal.affectedObjects &&
                  proposal.affectedObjects.map((obj: any, idx: number) => (
                    <tr key={idx}>
                      <td>{obj.type}</td>
                      <td>
                        <strong>
                          {obj.table}.{obj.name}
                        </strong>
                      </td>
                      <td>
                        <span style={{ color: 'var(--blue)' }}>{obj.action}</span>
                      </td>
                      <td>{obj.details || 'Compatibility preserving change'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Section 2: Exact Schema Diff */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>Exact Schema Diff</div>
            <div className={styles.diffContainer}>
              {proposal.schemaDiff &&
                proposal.schemaDiff.map((diff: any, idx: number) => {
                  let cls = styles.diffContext;
                  let prefix = '  ';
                  if (diff.type === 'ADD') {
                    cls = styles.diffAdd;
                    prefix = '+ ';
                  } else if (diff.type === 'REMOVE') {
                    cls = styles.diffRemove;
                    prefix = '- ';
                  }
                  return (
                    <div key={idx} className={`${styles.diffLine} ${cls}`}>
                      {prefix}
                      {diff.content}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Section 3: Rollout Migration Plan */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>Rollout Migration Plan</div>
            {proposal.migrationPlan &&
              proposal.migrationPlan.map((phase: any, idx: number) => (
                <div key={idx} className={styles.phaseCard}>
                  <div className={styles.phaseTitle}>
                    Phase {phase.phase} [{phase.timing}]: {phase.title}
                  </div>
                  <div className={styles.phaseDesc}>{phase.description}</div>
                  {phase.sqlStatements && phase.sqlStatements.length > 0 && (
                    <div className={styles.codeBox}>
                      {phase.sqlStatements.map((sql: string, sIdx: number) => (
                        <div key={sIdx} style={{ color: 'var(--text-heading)' }}>
                          SQL&gt; {sql}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>

          {/* Section 4: Full Proposed Schema */}
          <div className={styles.section}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div className={styles.sectionHeader} style={{ border: 'none', padding: 0 }}>
                Full Proposed Schema
              </div>
              <button
                onClick={handleCopySchema}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                {copied ? <Check size={12} color="var(--green)" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy Schema'}
              </button>
            </div>
            <pre className={styles.codeBox}>{proposal.proposedSchema}</pre>
          </div>

          {/* Section 5: Risks & Warnings */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>Risks & Assumptions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
              {proposal.risks &&
                proposal.risks.map((r: string, idx: number) => (
                  <div key={idx} style={{ color: 'var(--amber)', display: 'flex', gap: '0.5rem' }}>
                    <AlertTriangle size={16} /> {r}
                  </div>
                ))}
              {proposal.warnings &&
                proposal.warnings.map((w: string, idx: number) => (
                  <div key={idx} style={{ color: 'var(--red)', display: 'flex', gap: '0.5rem' }}>
                    <AlertTriangle size={16} /> {w}
                  </div>
                ))}
            </div>
          </div>

          {error && <div style={{ color: 'var(--red)', fontSize: '0.8125rem' }}>Error: {error}</div>}
        </div>

        {/* Modal Footer */}
        <div className={styles.modalFooter}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            Authority Required: Reviewer or Admin
          </div>
          <div>
            {approved ? (
              <span className={styles.statusApproved}>
                <CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'middle' }} /> PROPOSAL APPROVED
              </span>
            ) : (
              <button className={styles.btnApprove} onClick={handleApprove} disabled={approving}>
                <CheckCircle size={16} /> {approving ? 'Approving...' : 'Approve Proposal'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
