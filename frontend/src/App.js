import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import useBrowserCloseHandler from './hooks/useBrowserCloseHandler';

const Login = lazy(() => import('./pages/Login'));
const Setup = lazy(() => import('./pages/Setup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'));
const Findings = lazy(() => import('./pages/Findings'));
const FindingDetails = lazy(() => import('./pages/FindingDetails'));
const GlobalFindings = lazy(() => import('./pages/GlobalFindings'));
const Reports = lazy(() => import('./pages/Reports'));
const GlobalReports = lazy(() => import('./pages/GlobalReports'));
const Milestones = lazy(() => import('./pages/Milestones'));
const Users = lazy(() => import('./pages/Users'));
const Analytics = lazy(() => import('./pages/Analytics'));
const RecycleBin = lazy(() => import('./pages/RecycleBin'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const MyTasks = lazy(() => import('./pages/MyTasks'));
const MyMis = lazy(() => import('./pages/MyMis'));
const Notes = lazy(() => import('./pages/Notes'));
const NoteEditor = lazy(() => import('./pages/NoteEditor'));
const AllUsersMis = lazy(() => import('./pages/AllUsersMis'));
const VaptWorkspace = lazy(() => import('./pages/VaptWorkspace'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const PMWorkload = lazy(() => import('./pages/PMWorkload'));
const QuarterlyAudits = lazy(() => import('./pages/QuarterlyAudits'));
const VaptCalendar = lazy(() => import('./pages/VaptCalendar'));
const ServerInfoPage = lazy(() => import('./pages/SystemInfoPage'));
const SupportList = lazy(() => import('./pages/SupportList'));
const SupportDetail = lazy(() => import('./pages/SupportDetail'));
const AdminSupportPanel = lazy(() => import('./pages/AdminSupportPanel'));
const AllUserTasks = lazy(() => import('./pages/AllUserTasks'));

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, user } = useAuth();
  
  if (loading) {
    return <LoadingScreen message="Authenticating..." />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

const AppContent = () => {
  useBrowserCloseHandler();

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen message="Loading..." />}>
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
        <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetails /></ProtectedRoute>} />
        <Route path="/projects/:projectId/findings" element={<ProtectedRoute><Findings /></ProtectedRoute>} />
        <Route path="/projects/:projectId/findings/:id" element={<ProtectedRoute><FindingDetails /></ProtectedRoute>} />
        <Route path="/findings" element={<ProtectedRoute><GlobalFindings /></ProtectedRoute>} />
        <Route path="/projects/:projectId/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'vapt_analyst']}><GlobalReports /></ProtectedRoute>} />
        <Route path="/projects/:projectId/milestones" element={<ProtectedRoute><Milestones /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute allowedRoles={['admin', 'vapt_analyst']}><Users /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/audit-logs" element={<ProtectedRoute allowedRoles={['admin', 'vapt_analyst']}><AuditLogs /></ProtectedRoute>} />
        <Route path="/quarterly-audits" element={<ProtectedRoute allowedRoles={['admin', 'vapt_analyst']}><QuarterlyAudits /></ProtectedRoute>} />
        <Route path="/vapt-calendar" element={<ProtectedRoute allowedRoles={['admin', 'vapt_analyst']}><VaptCalendar /></ProtectedRoute>} />
        <Route path="/my-tasks" element={<ProtectedRoute allowedRoles={['admin', 'vapt_analyst', 'project_manager', 'developer', 'business_analyst']}><MyTasks /></ProtectedRoute>} />
        <Route path="/my-mis" element={<ProtectedRoute><MyMis /></ProtectedRoute>} />
        <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
        <Route path="/notes/:id" element={<ProtectedRoute><NoteEditor /></ProtectedRoute>} />
        <Route path="/notes/new" element={<ProtectedRoute><NoteEditor /></ProtectedRoute>} />
        <Route path="/vapt-workspace" element={<ProtectedRoute allowedRoles={['admin', 'vapt_analyst', 'vapt_tl']}><VaptWorkspace /></ProtectedRoute>} />
        <Route path="/admin/mis" element={<ProtectedRoute allowedRoles={['admin', 'vapt_analyst', 'vapt_tl']}><AllUsersMis /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/team-workload" element={<ProtectedRoute allowedRoles={['project_manager']}><PMWorkload /></ProtectedRoute>} />
        <Route path="/system-info" element={<ProtectedRoute allowedRoles={['admin', 'vapt_analyst']}><ServerInfoPage /></ProtectedRoute>} />
        <Route path="/recycle-bin" element={<ProtectedRoute allowedRoles={['admin', 'vapt_analyst']}><RecycleBin /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><SupportList /></ProtectedRoute>} />
        <Route path="/support/:id" element={<ProtectedRoute><SupportDetail /></ProtectedRoute>} />
        <Route path="/admin/support" element={<ProtectedRoute allowedRoles={['admin', 'vapt_analyst', 'vapt_tl']}><AdminSupportPanel /></ProtectedRoute>} />
        <Route path="/all-user-tasks" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'vapt_analyst', 'vapt_tl']}><AllUserTasks /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
