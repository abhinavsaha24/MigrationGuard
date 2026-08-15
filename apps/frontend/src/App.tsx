import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';

// Layouts
import MainLayout from './components/MainLayout';
import DashboardLayout from './components/DashboardLayout';

// Public Pages
import Home from './pages/Home';
import Project from './pages/Project';
import Architecture from './pages/Architecture';
import Research from './pages/Research';
import Benchmark from './pages/Benchmark';
import Results from './pages/Results';
import Milestones from './pages/Milestones';
import Login from './pages/Login';

// Protected Pages
import Dashboard from './pages/Dashboard';
import Runs from './pages/Runs';
import RunDetail from './pages/RunDetail';

function ProtectedRoute({ children, requireAdmin }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="project" element={<Project />} />
        <Route path="architecture" element={<Architecture />} />
        <Route path="research" element={<Research />} />
        <Route path="benchmark" element={<Benchmark />} />
        <Route path="results" element={<Results />} />
        <Route path="milestones" element={<Milestones />} />
        <Route path="login" element={<Login />} />
      </Route>

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="runs" element={<Runs />} />
        <Route path="runs/:id" element={<RunDetail />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
