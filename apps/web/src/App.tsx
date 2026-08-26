import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import OnboardingPage from './features/character/OnboardingPage';
import DashboardPage from './features/character/DashboardPage';
import QuestsPage from './features/quests/QuestsPage';
import ArenasPage from './features/character/ArenasPage';
import JournalPage from './features/journal/JournalPage';
import { AuthProvider, useAuth } from './features/auth/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/quests" element={<ProtectedRoute><QuestsPage /></ProtectedRoute>} />
        <Route path="/arenas" element={<ProtectedRoute><ArenasPage /></ProtectedRoute>} />
        <Route path="/journal" element={<ProtectedRoute><JournalPage /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}
