import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, Activity, LogOut, ArrowLeft } from 'lucide-react';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
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

        <div className={styles.bottomNav}>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>
      
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
