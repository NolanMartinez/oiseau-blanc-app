import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../services/api';

interface Admin {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'LIVREUR';
}

interface AuthContextType {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ role: 'SUPER_ADMIN' | 'ADMIN' | 'LIVREUR' }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.get('/admin/auth/me')
      .then((res) => setAdmin(res.data))
      .catch(() => localStorage.removeItem('admin_token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post('/admin/auth/login', { email, password });
    localStorage.setItem('admin_token', res.data.token);
    setAdmin(res.data.admin);
    return { role: res.data.admin.role as 'SUPER_ADMIN' | 'ADMIN' | 'LIVREUR' };
  }

  function logout() {
    localStorage.removeItem('admin_token');
    setAdmin(null);
  }

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
