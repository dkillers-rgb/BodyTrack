import { createContext, useContext, useState, ReactNode } from 'react';
import { setToken, User } from '../services/api';

const DEFAULT_USER: User = {
  id: 'local-user',
  name: 'Usuário BodyTrack',
  email: 'local@bodytrack.local',
};

interface AuthContextType {
  user: User;
  isLoading: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(DEFAULT_USER);
  const [isLoading] = useState(false);

  const login = async (user: User, token: string) => {
    setToken(token);
    setUser(user);
  };

  const logout = async () => {
    setToken(null);
    setUser(DEFAULT_USER);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
