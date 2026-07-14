import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, mustChangePassword, markActivity } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const root = segments[0];
    const inAuth = root === 'login' || root === 'forgot-password';
    const inForceChange = root === 'force-change-password';

    if (!isAuthenticated && !inAuth) {
      router.replace('/login' as never);
      return;
    }

    if (isAuthenticated && mustChangePassword && !inForceChange) {
      router.replace('/force-change-password' as never);
      return;
    }

    if (isAuthenticated && !mustChangePassword && (inAuth || inForceChange)) {
      router.replace('/' as never);
    }
  }, [isAuthenticated, isLoading, mustChangePassword, segments, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    markActivity();
  }, [segments, isAuthenticated, markActivity]);

  return (
    <View style={styles.fill} onTouchStart={isAuthenticated ? markActivity : undefined}>
      {children}
    </View>
  );
}

function RootNavigator() {
  return (
    <AuthGate>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#121826' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#090B10' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ title: 'Recuperar senha' }} />
        <Stack.Screen
          name="force-change-password"
          options={{ title: 'Nova senha', headerBackVisible: false }}
        />
        <Stack.Screen name="account" options={{ title: 'Conta e senha' }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="more" options={{ headerShown: false }} />
        <Stack.Screen name="scan" options={{ title: 'Ler QR Code' }} />
        <Stack.Screen name="manual-entry" options={{ title: 'Nova avaliação' }} />
        <Stack.Screen name="reports" options={{ title: 'Relatórios' }} />
        <Stack.Screen name="history" options={{ title: 'Histórico recente' }} />
        <Stack.Screen name="clients" options={{ title: 'Clientes' }} />
        <Stack.Screen name="company" options={{ title: 'Empresa' }} />
        <Stack.Screen name="backup" options={{ title: 'Backup e restauração' }} />
        <Stack.Screen name="privacy" options={{ title: 'Aviso e privacidade' }} />
        <Stack.Screen name="client/[id]" options={{ title: 'Relatório' }} />
      </Stack>
    </AuthGate>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
