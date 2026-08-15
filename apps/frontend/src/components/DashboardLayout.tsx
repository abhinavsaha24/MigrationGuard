import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, Moon, Sun, LayoutDashboard, Activity, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return true;
    if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Link to="/" className={styles.backBtn}>
            <ArrowLeft size={18} /> Back to Site
          </Link>
          <div className={styles.userProfile}>
            <div className={styles.avatar}>{user?.email.charAt(0).toUpperCase()}</div>
            <div className={styles.userInfo}>
              <div className={styles.userEmail}>{user?.email}</div>
              <div className={styles.userRole}>{user?.role}</div>
            </div>
          </div>
        </div>

        <nav className={styles.nav}>
          <Link to="/dashboard" className={`${styles.navItem} ${isActive('/dashboard') ? styles.active : ''}`}>
            <LayoutDashboard size={18} />
            Overview
          </Link>
          <Link to="/dashboard/runs" className={`${styles.navItem} ${isActive('/dashboard/runs') ? styles.active : ''}`}>
            <Activity size={18} />
            Verification Runs
          </Link>
        </nav>

        <div className={styles.bottomActions}>
          <button className={styles.navItem} onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      </aside>
      
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
