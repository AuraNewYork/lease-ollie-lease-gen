import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import NewLeasePage from '@/pages/NewLeasePage';
import ResumeLeasePage from '@/pages/ResumeLeasePage';
import AppLayout from '@/components/AppLayout';

function ProtectedRoutes() {
  const { user } = useAuth();
  if (!user) return <LoginPage />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/new" element={<NewLeasePage />} />
        <Route path="/lease/:id" element={<ResumeLeasePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProtectedRoutes />
    </AuthProvider>
  );
}
