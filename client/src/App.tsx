import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserAuthProvider } from './context/UserAuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { PrivateRoute } from './components/PrivateRoute';
import { UserPrivateRoute } from './components/UserPrivateRoute';

// Livreur
import { LivreurHomePage } from './pages/livreur/LivreurHomePage';
import { LivreurRestockPage } from './pages/livreur/LivreurRestockPage';

// Admin
import { AdminLogin } from './pages/admin/Login';
import { Dashboard } from './pages/admin/Dashboard';
import { Subscribers } from './pages/admin/Subscribers';
import { Reviews } from './pages/admin/Reviews';
import { Surveys } from './pages/admin/Surveys';
import { Votes } from './pages/admin/Votes';
import { Frigos } from './pages/admin/Frigos';
import { Plats } from './pages/admin/Plats';
import { Recommandations } from './pages/admin/Recommandations';
import { AdminsPage } from './pages/admin/AdminsPage';
import { Notifications } from './pages/admin/Notifications';

// App utilisateur
import { LoginPage } from './pages/app/LoginPage';
import { OnboardingPage } from './pages/app/OnboardingPage';
import { MonFrigoPage } from './pages/app/MonFrigoPage';
import { NotificationsPage } from './pages/app/NotificationsPage';
import { AvisPage } from './pages/app/AvisPage';
import { SondagesPage } from './pages/app/SondagesPage';
import { ProfilPage } from './pages/app/ProfilPage';

function LivreurPrivateRoute({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-gray-500">Chargement...</div></div>;
  if (!admin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <LanguageProvider>
    <AuthProvider>
      <UserAuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── App utilisateur ────────────────────────────────────── */}
          <Route path="/app/login" element={<LoginPage />} />
          <Route path="/app/onboarding" element={<UserPrivateRoute><OnboardingPage /></UserPrivateRoute>} />
          <Route path="/app" element={<Navigate to="/app/mon-frigo" replace />} />
          <Route path="/app/mon-frigo" element={<UserPrivateRoute><MonFrigoPage /></UserPrivateRoute>} />
          <Route path="/app/avis" element={<UserPrivateRoute><AvisPage /></UserPrivateRoute>} />
          <Route path="/app/sondages" element={<UserPrivateRoute><SondagesPage /></UserPrivateRoute>} />
          <Route path="/app/profil" element={<UserPrivateRoute><ProfilPage /></UserPrivateRoute>} />
          <Route path="/app/notifications" element={<UserPrivateRoute><NotificationsPage /></UserPrivateRoute>} />

          {/* Anciennes URLs → nouvelle app */}
          <Route path="/" element={<Navigate to="/app/mon-frigo" replace />} />
          <Route path="/avis" element={<Navigate to="/app/avis" replace />} />
          <Route path="/sondages" element={<Navigate to="/app/sondages" replace />} />
          <Route path="/app/carte" element={<Navigate to="/app/mon-frigo" replace />} />
          <Route path="/app/votes" element={<Navigate to="/app/mon-frigo" replace />} />

          {/* ── Interface livreur ─────────────────────────────────── */}
          <Route path="/livreur" element={<LivreurPrivateRoute><LivreurHomePage /></LivreurPrivateRoute>} />
          <Route path="/livreur/frigo/:id" element={<LivreurPrivateRoute><LivreurRestockPage /></LivreurPrivateRoute>} />

          {/* ── Panel admin ────────────────────────────────────────── */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/admin/subscribers" element={<PrivateRoute><Subscribers /></PrivateRoute>} />
          <Route path="/admin/reviews" element={<PrivateRoute><Reviews /></PrivateRoute>} />
          <Route path="/admin/surveys" element={<PrivateRoute><Surveys /></PrivateRoute>} />
          <Route path="/admin/votes" element={<PrivateRoute><Votes /></PrivateRoute>} />
          <Route path="/admin/frigos" element={<PrivateRoute><Frigos /></PrivateRoute>} />
          <Route path="/admin/plats" element={<PrivateRoute><Plats /></PrivateRoute>} />
          <Route path="/admin/recommandations" element={<PrivateRoute><Recommandations /></PrivateRoute>} />
          <Route path="/admin/admins" element={<PrivateRoute><AdminsPage /></PrivateRoute>} />
          <Route path="/admin/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />

          {/* 404 */}
          <Route path="*" element={<div className="p-8 text-center text-sm text-gray-500">Page introuvable</div>} />
        </Routes>
      </BrowserRouter>
      </UserAuthProvider>
    </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
