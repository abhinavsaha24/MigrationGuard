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

    try {
      const res = await fetch('/api/auth/login', {
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

      const meRes = await fetch('/api/auth/me', {
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
        <div className={styles.brandBadge}>SECURE TERMINAL</div>
        <h1 className={styles.brandTitle}>MigrationGuard</h1>
        <p className={styles.brandDesc}>
          Access the controlled verification environment. Authenticate to view execution logs 
          and structural compatibility metrics.
        </p>
      </div>

      <div className={styles.authPanel}>
        <div className={styles.panelHeader}>
          <ShieldCheck size={28} className={styles.panelIcon} />
          <h2>Authentication Required</h2>
        </div>
        
        {error && (
          <div className={styles.errorBox}>
            <TerminalSquare size={16} />
            <span>ERR: {error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className={styles.authForm}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Principal Identifier (Email)</label>
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
            <label className={styles.formLabel}>Access Key (Password)</label>
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
            {loading ? 'NEGOTIATING CONNECTION...' : 'AUTHORIZE SESSION'}
          </button>
        </form>

      </div>
    </div>
  );
}
