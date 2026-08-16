import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Moon, Sun, Menu, X } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import styles from './MainLayout.module.css';

const NAV_LINKS = [
  { path: '/project', label: 'Project' },
  { path: '/architecture', label: 'Architecture' },
  { path: '/research', label: 'Research' },
  { path: '/benchmark', label: 'Benchmark' },
  { path: '/results', label: 'Results' },
  { path: '/milestones', label: 'Milestones' },
];

export default function MainLayout() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLeft}>
            <Link to="/" className={styles.logo}>
              <ShieldCheck className={styles.logoIcon} />
              <span className={styles.logoText}>MigrationGuard</span>
            </Link>
          </div>

          <nav className={styles.desktopNav}>
            {NAV_LINKS.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`${styles.navLink} ${isActive(link.path) ? styles.active : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className={styles.headerRight}>
            <button className={styles.themeToggle} onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link to="/login" className={styles.dashboardBtn}>
              Dashboard <ArrowRight size={14} />
            </Link>
            <button 
              className={styles.mobileMenuBtn} 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className={styles.mobileDrawerOverlay} onClick={() => setIsMobileMenuOpen(false)}>
          <div className={styles.mobileDrawer} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <span className={styles.drawerTitle}>Menu</span>
              <button className={styles.drawerClose} onClick={() => setIsMobileMenuOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <nav className={styles.drawerNav}>
              <Link to="/" className={`${styles.drawerLink} ${isActive('/') ? styles.active : ''}`}>
                Home
              </Link>
              {NAV_LINKS.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`${styles.drawerLink} ${isActive(link.path) ? styles.active : ''}`}
                >
                  {link.label}
                </Link>
              ))}
              <div className={styles.drawerDivider} />
              <Link to="/login" className={styles.drawerDashboardBtn}>
                Open Dashboard <ArrowRight size={16} />
              </Link>
            </nav>
          </div>
        </div>
      )}

      <main className={styles.main}>
        <Outlet />
      </main>
      
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>
            <ShieldCheck size={16} />
            MigrationGuard &copy;
          </div>
        </div>
      </footer>
    </div>
  );
}
