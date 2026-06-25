import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { initDatabase } from '../db/database';
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initDatabase()
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (nextUser: User, token: string) => {
    setToken(token);
    setUser(nextUser);
  };

  const logout = async () => {
    setToken(null);
    setUser(DEFAULT_USER);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

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

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f1419',
  },
});
