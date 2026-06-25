import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1a2332' },
          headerTintColor: '#e8edf4',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#0f1419' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'BodyTrack' }} />
        <Stack.Screen name="scan" options={{ title: 'Ler QR Code' }} />
        <Stack.Screen name="reports" options={{ title: 'Relatórios' }} />
        <Stack.Screen name="history" options={{ title: 'Histórico' }} />
        <Stack.Screen name="clients" options={{ title: 'Clientes' }} />
        <Stack.Screen name="client/[id]" options={{ title: 'Relatório' }} />
      </Stack>
    </AuthProvider>
  );
}
