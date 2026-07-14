import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, View, ActivityIndicator, StyleSheet, type AppStateStatus } from 'react-native';
import { initDatabase } from '../db/database';
import { runAutomaticBackupIfNeeded } from '../services/backupService';
import {
  INACTIVITY_TIMEOUT_MS,
  changePassword as changePasswordSvc,
  hasAuthProfile,
  isSessionValid,
  loginWithPassword,
  logoutSession,
  mustChangePasswordNow,
  profileToUser,
  requestPasswordResetByEmail,
  setPasswordAfterTemporary,
  setupAccount,
  touchSession,
  getAuthProfile,
} from '../services/authService';
import type { User } from '../services/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsSetup: boolean;
  mustChangePassword: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<{
    usedTemporaryPassword: boolean;
  }>;
  setup: (input: {
    name: string;
    username: string;
    email: string;
    whatsappPhone: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  completeTemporaryPasswordChange: (newPassword: string) => Promise<void>;
  requestResetByEmail: (email: string) => Promise<{
    maskedEmail: string;
    maskedPhone: string;
    temporaryPassword: string;
    whatsappPhone: string;
    whatsappOpened: boolean;
  }>;
  markActivity: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const lastActiveRef = useRef(Date.now());
  const lastPersistedRef = useRef(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const lockSession = useCallback(async () => {
    await logoutSession();
    setUser(null);
  }, []);

  const markActivity = useCallback(() => {
    const now = Date.now();
    lastActiveRef.current = now;
    if (!user) return;
    // Evita escrever SecureStore a cada toque; persiste no máx. a cada 30s
    if (now - lastPersistedRef.current < 30_000) return;
    lastPersistedRef.current = now;
    void touchSession().catch(console.warn);
  }, [user]);

  const bootstrap = useCallback(async () => {
    setIsLoading(true);
    try {
      await initDatabase();
      const hasProfile = await hasAuthProfile();
      setNeedsSetup(!hasProfile);

      if (hasProfile && (await isSessionValid())) {
        const profile = await getAuthProfile();
        if (profile) {
          setUser(profileToUser(profile));
          setMustChangePassword(await mustChangePasswordNow());
          await touchSession();
          lastActiveRef.current = Date.now();
          if (!(await mustChangePasswordNow())) {
            runAutomaticBackupIfNeeded().catch((err) => {
              console.warn('Backup automático falhou:', err);
            });
          }
        }
      } else if (hasProfile) {
        await logoutSession();
        setUser(null);
        setMustChangePassword(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (next === 'active' && user) {
        const idle = Date.now() - lastActiveRef.current;
        if (idle >= INACTIVITY_TIMEOUT_MS) {
          void lockSession();
          return;
        }
        markActivity();
      }

      if ((next === 'background' || next === 'inactive') && prev === 'active') {
        lastActiveRef.current = Date.now();
        void touchSession().catch(console.warn);
      }
    };

    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [user, lockSession, markActivity]);

  useEffect(() => {
    if (!user) return;

    const timer = setInterval(() => {
      if (AppState.currentState !== 'active') return;
      if (Date.now() - lastActiveRef.current >= INACTIVITY_TIMEOUT_MS) {
        void lockSession();
      }
    }, 30_000);

    return () => clearInterval(timer);
  }, [user, lockSession]);

  const login = useCallback(async (usernameOrEmail: string, password: string) => {
    const result = await loginWithPassword(usernameOrEmail, password);
    setUser(result.user);
    setNeedsSetup(false);
    setMustChangePassword(result.mustChangePassword);
    lastActiveRef.current = Date.now();
    if (!result.mustChangePassword) {
      runAutomaticBackupIfNeeded().catch((err) => {
        console.warn('Backup automático falhou:', err);
      });
    }
    return { usedTemporaryPassword: result.usedTemporaryPassword };
  }, []);

  const setup = useCallback(
    async (input: {
      name: string;
      username: string;
      email: string;
      whatsappPhone: string;
      password: string;
    }) => {
      const nextUser = await setupAccount(input);
      setUser(nextUser);
      setNeedsSetup(false);
      setMustChangePassword(false);
      lastActiveRef.current = Date.now();
    },
    []
  );

  const logout = useCallback(async () => {
    await lockSession();
    setMustChangePassword(false);
  }, [lockSession]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await changePasswordSvc(currentPassword, newPassword);
      setMustChangePassword(false);
      markActivity();
    },
    [markActivity]
  );

  const completeTemporaryPasswordChange = useCallback(
    async (newPassword: string) => {
      await setPasswordAfterTemporary(newPassword);
      setMustChangePassword(false);
      markActivity();
      runAutomaticBackupIfNeeded().catch((err) => {
        console.warn('Backup automático falhou:', err);
      });
    },
    [markActivity]
  );

  const requestResetByEmail = useCallback(async (email: string) => {
    return requestPasswordResetByEmail(email);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      needsSetup,
      mustChangePassword,
      login,
      setup,
      logout,
      changePassword,
      completeTemporaryPasswordChange,
      requestResetByEmail,
      markActivity,
    }),
    [
      user,
      isLoading,
      needsSetup,
      mustChangePassword,
      login,
      setup,
      logout,
      changePassword,
      completeTemporaryPasswordChange,
      requestResetByEmail,
      markActivity,
    ]
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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
