import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { AdminLogin } from './pages/admin/Login';
import { Dashboard } from './pages/admin/Dashboard';
import { Subscribers } from './pages/admin/Subscribers';
import { Reviews } from './pages/admin/Reviews';
import { Subscribe } from './pages/public/Subscribe';
import { Review } from './pages/public/Review';
import { SurveyPage } from './pages/public/SurveyPage';
import { Surveys } from './pages/admin/Surveys';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Panel public */}
          <Route path="/" element={<Subscribe />} />
          <Route path="/avis" element={<Review />} />
          <Route path="/sondages" element={<SurveyPage />} />

          {/* Panel admin */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          <Route path="/admin/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/admin/subscribers" element={<PrivateRoute><Subscribers /></PrivateRoute>} />
          <Route path="/admin/reviews" element={<PrivateRoute><Reviews /></PrivateRoute>} />
          <Route path="/admin/surveys" element={<PrivateRoute><Surveys /></PrivateRoute>} />

          {/* 404 */}
          <Route path="*" element={<div className="p-8 text-center">Page introuvable</div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
