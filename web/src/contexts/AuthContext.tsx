import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('bodytrack_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = (user: User, token: string) => {
    localStorage.setItem('bodytrack_token', token);
    localStorage.setItem('bodytrack_user', JSON.stringify(user));
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('bodytrack_token');
    localStorage.removeItem('bodytrack_user');
    setUser(null);
  };

  useEffect(() => {
    const token = localStorage.getItem('bodytrack_token');
    if (!token) setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
