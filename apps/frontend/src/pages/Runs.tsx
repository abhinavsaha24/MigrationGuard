import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Database, CheckCircle, XCircle } from 'lucide-react';
import styles from './Runs.module.css';

interface Run {
  id: string;
  migrationName: string;
  status: string;
  durationMs: number;
  timestamp: string;
  compatibility?: any[];
}

export default function Runs() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const query = new URLSearchParams({
      page: page.toString(),
      limit: '10',
    });
    if (search) query.append('search', search);
    if (statusFilter !== 'ALL') query.append('status', statusFilter);

    const API_BASE = import.meta.env.VITE_API_URL || '';
    fetch(`${API_BASE}/api/runs?${query.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setRuns(data.runs || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [page, search, statusFilter]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const getStatusClass = (s: string) => {
    const u = s?.toUpperCase();
    if (u === 'PASS' || u === 'SAFE' || u === 'COMPATIBLE') return styles.badgeSafe;
    if (u === 'FAIL' || u === 'UNSAFE' || u === 'INCOMPATIBLE') return styles.badgeUnsafe;
    return styles.badgePending;
  };

  const getStatusIcon = (s: string) => {
    const u = s?.toUpperCase();
    if (u === 'PASS' || u === 'SAFE' || u === 'COMPATIBLE') return <CheckCircle size={14} />;
    if (u === 'FAIL' || u === 'UNSAFE' || u === 'INCOMPATIBLE') return <XCircle size={14} />;
    return null;
  };

  const calculatePassFail = (run: Run) => {
    if (!run.compatibility || run.compatibility.length === 0) return { pass: 0, fail: 0 };
    const pass = run.compatibility.filter(c => c.status === 'PASS').length;
    const fail = run.compatibility.filter(c => c.status === 'FAIL').length;
    return { pass, fail };
  };

  return (
    <div className={styles.consoleContainer}>
      <div className={styles.consoleHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className={styles.title}>Verification Runs</h1>
            <p className={styles.subtitle}>Migration compatibility verification history ({total} runs)</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Search ID or Name..." 
              value={search}
              onChange={handleSearch}
              className={styles.searchInput}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            />
            <select 
              value={statusFilter} 
              onChange={handleStatusChange}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="SAFE">SAFE</option>
              <option value="UNSAFE">UNSAFE</option>
              <option value="SAFE_VERIFIED">SAFE_VERIFIED</option>
              <option value="SAFE_UNEXERCISED">SAFE_UNEXERCISED</option>
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className={styles.loadingState}>
          <Activity size={32} className={styles.loadingIcon} />
          <p>Loading runs…</p>
        </div>
      )}
      
      {error && (
        <div className={styles.errorState}>
          <XCircle size={32} />
          <p>Error: {error}</p>
        </div>
      )}

      {!loading && !error && runs.length === 0 && (
        <div className={styles.emptyState}>
          <Activity size={32} style={{ opacity: 0.3 }} />
          <p style={{ marginTop: '1rem', color: 'var(--text-heading)', fontWeight: 500 }}>No verification runs found.</p>
          <p style={{ marginTop: '0.25rem' }}>Runs are created by the CLI verification engine.</p>
        </div>
      )}

      {!loading && !error && runs.length > 0 && (
        <div className={styles.tableContainer}>
          <table className={styles.runsTable}>
            <thead>
              <tr>
                <th>Migration / Target</th>
                <th>Status</th>
                <th>Pass / Fail</th>
                <th>Duration</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(r => {
                const { pass, fail } = calculatePassFail(r);
                return (
                  <tr 
                    key={r.id} 
                    className={styles.runRow}
                    onClick={() => navigate(`/dashboard/runs/${r.id}`)}
                  >
                    <td data-label="Migration" className={styles.tdPrimary}>
                      <div className={styles.runName}>
                        <Database size={14} style={{ color: 'var(--blue)' }} />
                        {r.migrationName || 'Unnamed Migration'}
                      </div>
                      <div className={styles.runId}>{r.id}</div>
                    </td>
                    <td data-label="Status">
                      <div className={getStatusClass(r.status)}>
                        {getStatusIcon(r.status)}
                        {r.status}
                      </div>
                    </td>
                    <td data-label="Pass/Fail">
                      <div className={styles.passFail}>
                        <span style={{ color: 'var(--green)' }}>{pass}</span>
                        <span style={{ color: 'var(--text-secondary)', margin: '0 0.25rem' }}>/</span>
                        <span style={{ color: 'var(--red)' }}>{fail}</span>
                      </div>
                    </td>
                    <td data-label="Duration" className={styles.duration}>
                      {(r.durationMs / 1000).toFixed(1)}s
                    </td>
                    <td data-label="Timestamp" className={styles.timestamp}>
                      {new Date(r.timestamp).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '1rem 0', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Showing page {page} of {totalPages}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: '0.5rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', cursor: page === 1 ? 'not-allowed' : 'pointer', color: 'var(--text-primary)' }}
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ padding: '0.5rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: 'var(--text-primary)' }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
