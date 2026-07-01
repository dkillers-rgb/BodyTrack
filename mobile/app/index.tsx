import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { api, Overview } from '../services/api';
import { exitApp } from '../utils/exitApp';

export default function HomeScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    if (user) {
      api.reports.overview().then(setOverview).catch(console.error);
    }
  }, [user]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const menuItems = [
    { title: 'Ler QR Code', icon: '📷', route: '/scan' },
    { title: 'Preencher avaliação', icon: '✏️', route: '/manual-entry', params: { showHint: '1' } },
    { title: 'Relatórios', icon: '📈', route: '/reports' },
    { title: 'Histórico', icon: '📋', route: '/history' },
    { title: 'Clientes', icon: '👥', route: '/clients' },
  ];

  const handleExit = () => {
    Alert.alert('Sair do aplicativo', 'Deseja fechar o BodyTrack?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: exitApp },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.greeting}>Olá, {user.name}</Text>
      <Text style={styles.offlineBadge}>Dados salvos localmente neste dispositivo</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{overview?.totalClients ?? 0}</Text>
          <Text style={styles.statLabel}>Clientes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{overview?.totalEvaluations ?? 0}</Text>
          <Text style={styles.statLabel}>Avaliações</Text>
        </View>
      </View>

      {menuItems.map((item) => (
        <TouchableOpacity
          key={item.route}
          style={styles.menuCard}
          onPress={() =>
            item.params
              ? router.push({ pathname: item.route, params: item.params } as never)
              : router.push(item.route as never)
          }
        >
          <Text style={styles.menuIcon}>{item.icon}</Text>
          <Text style={styles.menuTitle}>{item.title}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleExit}>
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  greeting: { fontSize: 24, fontWeight: '700', color: '#e8edf4', marginBottom: 8 },
  offlineBadge: {
    fontSize: 13,
    color: '#22c55e',
    marginBottom: 24,
    fontWeight: '500',
  },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2d3a4f',
  },
  statValue: { fontSize: 28, fontWeight: '700', color: '#3b82f6' },
  statLabel: { fontSize: 13, color: '#8b9cb3', marginTop: 4 },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2d3a4f',
    gap: 16,
  },
  menuIcon: { fontSize: 24 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: '#e8edf4' },
  logoutBtn: { marginTop: 24, alignItems: 'center', padding: 16 },
  logoutText: { color: '#ef4444', fontWeight: '600' },
});
