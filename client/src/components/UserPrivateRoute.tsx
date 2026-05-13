import { Navigate, useLocation } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';

export function UserPrivateRoute({ children }: { children: React.ReactNode }) {
  const { subscriber, isLoading } = useUserAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-sm" style={{ color: 'var(--ink-faint)' }}>Chargement…</div>
      </div>
    );
  }

  if (!subscriber) {
    return <Navigate to={`/app/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!subscriber.favoriId && location.pathname !== '/app/onboarding') {
    return <Navigate to="/app/onboarding" replace />;
  }

  return <>{children}</>;
}
