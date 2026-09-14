import React, { useState, useEffect } from 'react';
import styles from './AssistantDrawer.module.css';

interface Observation {
  text: string;
  evidenceId?: string;
}

interface AssistantResponse {
  intent: string;
  observations: Observation[];
  explanation: string;
  remediation?: {
    available: boolean;
    text: string;
    isSuggestion: boolean;
  };
  documentation?: Array<{
    id: string;
    title: string;
    topic?: string;
  }>;
}

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  verificationId?: string;
  projectId?: string;
  initialQuestion?: string;
  initialCellState?: string;
}

export const AssistantDrawer: React.FC<AssistantDrawerProps> = ({
  isOpen,
  onClose,
  verificationId,
  projectId = 'default',
  initialQuestion,
  initialCellState,
}) => {
  const [question, setQuestion] = useState(initialQuestion || '');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialQuestion) {
      setQuestion(initialQuestion);
      handleAsk(initialQuestion);
    }
  }, [initialQuestion, initialCellState]);

  if (!isOpen) return null;

  const handleAsk = async (qText?: string) => {
    const textToSend = qText || question;
    if (!textToSend.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/assistant/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: textToSend,
          projectId,
          verificationId,
          context: initialCellState ? { cellState: initialCellState } : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to query assistant');
      }

      setResponse(data.data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    'Why did this verification fail?',
    'What does DESTRUCTIVE_RENAME mean?',
    'What does OLD_APP_NEW_SCHEMA mean?',
    'How do I apply an expand/contract repair?',
  ];

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            MigrationGuard Assistant
          </h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.inputGroup}>
            <input
              type="text"
              className={styles.input}
              placeholder="Ask about this failure, evidence, or concepts..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              disabled={loading}
            />
            <button
              className={styles.btnAsk}
              onClick={() => handleAsk()}
              disabled={loading || !question.trim()}
            >
              {loading ? 'Analyzing...' : 'Ask'}
            </button>
          </div>

          <div className={styles.suggestions}>
            {suggestions.map((sug, i) => (
              <button
                key={i}
                className={styles.suggestionChip}
                onClick={() => {
                  setQuestion(sug);
                  handleAsk(sug);
                }}
              >
                {sug}
              </button>
            ))}
          </div>

          {error && (
            <div className={styles.card} style={{ borderColor: 'var(--red-border)' }}>
              <span style={{ color: 'var(--red)', fontSize: '0.875rem' }}>{error}</span>
            </div>
          )}

          {response && (
            <>
              {response.observations && response.observations.length > 0 && (
                <div className={styles.card}>
                  <span className={styles.badgeEvidence}>Observed Evidence (Ground Truth)</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {response.observations.map((obs, i) => (
                      <div key={i} className={styles.evidenceItem}>
                        {obs.evidenceId && (
                          <span style={{ color: 'var(--blue)', fontWeight: 600, marginRight: '0.5rem' }}>
                            [{obs.evidenceId}]
                          </span>
                        )}
                        <span>{obs.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.card}>
                <span className={styles.badgeExplanation}>AI Explanation</span>
                <p className={styles.text}>{response.explanation}</p>
              </div>

              {response.remediation && response.remediation.available && (
                <div className={styles.card}>
                  <span className={styles.badgeRemediation}>Suggested Remediation</span>
                  <p className={styles.text}>{response.remediation.text}</p>
                </div>
              )}

              {response.documentation && response.documentation.length > 0 && (
                <div className={styles.card}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Related Documentation
                  </span>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem' }}>
                    {response.documentation.map((doc, idx) => (
                      <li key={idx} style={{ color: 'var(--accent)' }}>
                        {doc.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.footer}>
          Deterministic core is the scientific source of truth. AI explanations do not alter compatibility verdicts.
        </div>
      </div>
    </div>
  );
};
