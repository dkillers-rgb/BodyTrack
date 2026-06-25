import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, User, setToken } from '../services/api';

const DEFAULT_TEST_USER = {
  email: 'teste@bodytrack.com',
  password: 'Teste123!',
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const token = await SecureStore.getItemAsync('bodytrack_token');

      if (token) {
        setToken(token);
        const stored = await SecureStore.getItemAsync('bodytrack_user');
        if (stored) setUser(JSON.parse(stored));
        setIsLoading(false);
        return;
      }

      try {
        const result = await api.auth.login(DEFAULT_TEST_USER.email, DEFAULT_TEST_USER.password);
        await SecureStore.setItemAsync('bodytrack_token', result.token);
        await SecureStore.setItemAsync('bodytrack_user', JSON.stringify(result.user));
        setToken(result.token);
        setUser(result.user);
      } catch (error) {
        console.warn('Auto login failed', error);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = async (user: User, token: string) => {
    await SecureStore.setItemAsync('bodytrack_token', token);
    await SecureStore.setItemAsync('bodytrack_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('bodytrack_token');
    await SecureStore.deleteItemAsync('bodytrack_user');
    setToken(null);
    setUser(null);
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
