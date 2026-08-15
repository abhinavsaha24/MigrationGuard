import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import styles from './Login.module.css';
import { ShieldCheck } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error?.message || 'Invalid credentials');
      }

      const meRes = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${data.token}` }
      });
      const meData = await meRes.json();
      if (!meRes.ok) throw new Error('Failed to fetch user profile');

      login(data.token, meData.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <ShieldCheck size={48} className={styles.icon} />
          <h2>Welcome Back</h2>
          <p>Sign in to access the product dashboard</p>
          <div style={{
            marginTop: '0.75rem',
            padding: '0.6rem 0.9rem',
            background: 'rgba(144,205,244,0.08)',
            border: '1px solid rgba(144,205,244,0.2)',
            borderRadius: '8px',
            fontSize: '0.8rem',
            color: '#90cdf4',
            textAlign: 'left',
            lineHeight: 1.6
          }}>
            <strong>Demo credentials</strong><br />
            Admin: admin@migrationguard.dev / admin123!<br />
            Reviewer: reviewer@migrationguard.dev / reviewer123!
          </div>
        </div>
        
        {error && <div className={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@migrationguard.dev"
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
