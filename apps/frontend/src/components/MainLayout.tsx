import { Outlet, Link, useLocation } from 'react-router-dom';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import styles from './MainLayout.module.css';

export default function MainLayout() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link to="/" className={styles.logo}>
            <ShieldCheck className={styles.logoIcon} />
            <span>MigrationGuard</span>
          </Link>
          
          <nav className={styles.nav}>
            <Link to="/project" className={isActive('/project') ? styles.active : ''}>Project</Link>
            <Link to="/architecture" className={isActive('/architecture') ? styles.active : ''}>Architecture</Link>
            <Link to="/research" className={isActive('/research') ? styles.active : ''}>Research</Link>
            <Link to="/benchmark" className={isActive('/benchmark') ? styles.active : ''}>Benchmark</Link>
            <Link to="/results" className={isActive('/results') ? styles.active : ''}>Results</Link>
            <Link to="/milestones" className={isActive('/milestones') ? styles.active : ''}>Milestones</Link>
          </nav>
          
          <div className={styles.actions}>
            <Link to="/login" className={styles.loginBtn}>
              Dashboard <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>
      
      <main className={styles.main}>
        <Outlet />
      </main>
      
      <footer className={styles.footer}>
        <p>MigrationGuard Research Project &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
