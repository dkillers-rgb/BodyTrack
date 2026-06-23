import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User, setToken } from '../services/api';

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
    SecureStore.getItemAsync('bodytrack_token').then((token) => {
      if (token) {
        setToken(token);
        SecureStore.getItemAsync('bodytrack_user').then((stored) => {
          if (stored) setUser(JSON.parse(stored));
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });
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
