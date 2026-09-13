import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import styles from './Login.module.css';
import { ShieldCheck, KeyRound, TerminalSquare, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const API_BASE = import.meta.env.VITE_API_URL || '';

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      let data;
      try {
        data = await res.json();
      } catch (e) {
        throw new Error(`Server returned an invalid response. API might be offline (HTTP ${res.status}).`);
      }
      
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || 'Invalid credentials');
      }

      const meRes = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${data.token}` }
      });
      const meData = await meRes.json();
      if (!meRes.ok) throw new Error('Failed to fetch user profile');

      login(data.token, meData.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      
      <div className={styles.authBranding}>
        <div className={styles.brandBadge}>OPERATIONAL CONSOLE</div>
        <h1 className={styles.brandTitle}>MigrationGuard</h1>
        <p className={styles.brandDesc}>
          Access the verification console to inspect migration compatibility runs,
          ground truth telemetry, and deterministic evidence artifacts.
        </p>
      </div>

      <div className={styles.authPanel}>
        <div className={styles.panelHeader}>
          <ShieldCheck size={28} className={styles.panelIcon} />
          <h2>Sign In</h2>
        </div>
        
        {error && (
          <div className={styles.errorBox}>
            <TerminalSquare size={16} />
            <span>Error: {error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className={styles.authForm}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@migrationguard.dev"
              className={styles.formInput}
              autoComplete="email"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Password</label>
            <div className={styles.inputWrap}>
              <KeyRound size={16} className={styles.inputIcon} />
              <input 
                type={showPassword ? "text" : "password"}
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${styles.formInput} ${styles.inputWithIcon} ${styles.inputWithToggle}`}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          
          <button type="submit" disabled={loading} className={styles.authButton}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

      </div>
    </div>
  );
}
