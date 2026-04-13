import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UserAuthProvider } from './context/UserAuthContext';
import { PrivateRoute } from './components/PrivateRoute';

// Admin
import { AdminLogin } from './pages/admin/Login';
import { Dashboard } from './pages/admin/Dashboard';
import { Subscribers } from './pages/admin/Subscribers';
import { Reviews } from './pages/admin/Reviews';
import { Surveys } from './pages/admin/Surveys';
import { Votes } from './pages/admin/Votes';
import { Frigos } from './pages/admin/Frigos';
import { AdminsPage } from './pages/admin/AdminsPage';
import { Notifications } from './pages/admin/Notifications';

// App utilisateur
import { LoginPage } from './pages/app/LoginPage';
import { CartePage } from './pages/app/CartePage';
import { FrigoDetail } from './pages/app/FrigoDetail';
import { AvisPage } from './pages/app/AvisPage';
import { SondagesPage } from './pages/app/SondagesPage';
import { VotesPage } from './pages/app/VotesPage';
import { ProfilPage } from './pages/app/ProfilPage';

function App() {
  return (
    <AuthProvider>
      <UserAuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── App utilisateur ────────────────────────────────────── */}
          <Route path="/app/login" element={<LoginPage />} />
          <Route path="/app" element={<Navigate to="/app/carte" replace />} />
          <Route path="/app/carte" element={<CartePage />} />
          <Route path="/app/frigo/:id" element={<FrigoDetail />} />
          <Route path="/app/avis" element={<AvisPage />} />
          <Route path="/app/sondages" element={<SondagesPage />} />
          <Route path="/app/votes" element={<VotesPage />} />
          <Route path="/app/profil" element={<ProfilPage />} />

          {/* Anciennes URLs → nouvelle app */}
          <Route path="/" element={<Navigate to="/app/carte" replace />} />
          <Route path="/avis" element={<Navigate to="/app/avis" replace />} />
          <Route path="/sondages" element={<Navigate to="/app/sondages" replace />} />
          <Route path="/votes" element={<Navigate to="/app/votes" replace />} />

          {/* ── Panel admin ────────────────────────────────────────── */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/admin/subscribers" element={<PrivateRoute><Subscribers /></PrivateRoute>} />
          <Route path="/admin/reviews" element={<PrivateRoute><Reviews /></PrivateRoute>} />
          <Route path="/admin/surveys" element={<PrivateRoute><Surveys /></PrivateRoute>} />
          <Route path="/admin/votes" element={<PrivateRoute><Votes /></PrivateRoute>} />
          <Route path="/admin/frigos" element={<PrivateRoute><Frigos /></PrivateRoute>} />
          <Route path="/admin/admins" element={<PrivateRoute><AdminsPage /></PrivateRoute>} />
          <Route path="/admin/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />

          {/* 404 */}
          <Route path="*" element={<div className="p-8 text-center text-sm text-gray-500">Page introuvable</div>} />
        </Routes>
      </BrowserRouter>
      </UserAuthProvider>
    </AuthProvider>
  );
}

export default App;
