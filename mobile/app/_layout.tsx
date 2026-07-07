import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
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
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="more" options={{ headerShown: false }} />
        <Stack.Screen name="scan" options={{ title: 'Ler QR Code' }} />
        <Stack.Screen name="manual-entry" options={{ title: 'Nova avaliação' }} />
        <Stack.Screen name="reports" options={{ title: 'Relatórios' }} />
        <Stack.Screen name="history" options={{ title: 'Avaliações' }} />
        <Stack.Screen name="clients" options={{ title: 'Clientes' }} />
        <Stack.Screen name="company" options={{ title: 'Empresa' }} />
        <Stack.Screen name="client/[id]" options={{ title: 'Relatório' }} />
      </Stack>
    </AuthProvider>
  );
}
