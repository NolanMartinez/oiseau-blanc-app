import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { userApi } from '../services/api';

export interface Subscriber {
  id: string;
  email: string | null;
  phone: string | null;
  consentEmail: boolean;
  consentPush: boolean;
}

interface UserAuthContextType {
  subscriber: Subscriber | null;
  isLoading: boolean;
  login: (token: string, subscriber: Subscriber) => void;
  logout: () => void;
}

const UserAuthContext = createContext<UserAuthContextType | null>(null);

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('user_token');
    if (!token) { setIsLoading(false); return; }
    userApi.get('/public/user/auth/me')
      .then((res) => setSubscriber(res.data.subscriber))
      .catch(() => localStorage.removeItem('user_token'))
      .finally(() => setIsLoading(false));
  }, []);

  function login(token: string, sub: Subscriber) {
    localStorage.setItem('user_token', token);
    setSubscriber(sub);
  }

  function logout() {
    localStorage.removeItem('user_token');
    setSubscriber(null);
  }

  return (
    <UserAuthContext.Provider value={{ subscriber, isLoading, login, logout }}>
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error('useUserAuth must be used within UserAuthProvider');
  return ctx;
}
