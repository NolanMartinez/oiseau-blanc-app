import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { AdminLogin } from './pages/admin/Login';
import { Dashboard } from './pages/admin/Dashboard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Panel public */}
          <Route
            path="/"
            element={
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold">L'Oiseau Blanc — Frigos Connectés</h1>
              </div>
            }
          />

          {/* Panel admin */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          <Route
            path="/admin/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<div className="p-8 text-center">Page introuvable</div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
