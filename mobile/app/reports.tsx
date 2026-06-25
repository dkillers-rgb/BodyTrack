import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api, Client, Overview } from '../services/api';

function bodyFatPercent(weight: number, bodyFat: number): string {
  if (weight <= 0) return '—';
  return `${((bodyFat / weight) * 100).toFixed(1)}%`;
}

export default function ReportsScreen() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    Promise.all([api.reports.overview(), api.clients.list()])
      .then(([ov, cl]) => {
        setOverview(ov);
        setClients(cl);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, query]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Relatórios</Text>
      <Text style={styles.subtitle}>Selecione um cliente para ver o relatório completo</Text>

      <View style={styles.cardsRow}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Clientes</Text>
          <Text style={styles.cardValue}>{overview?.totalClients ?? 0}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Avaliações</Text>
          <Text style={styles.cardValue}>{overview?.totalEvaluations ?? 0}</Text>
        </View>
      </View>

      <Text style={styles.filterLabel}>Buscar por nome</Text>
      <TextInput
        style={styles.search}
        placeholder="Digite o nome do cliente..."
        placeholderTextColor="#8b9cb3"
        value={query}
        onChangeText={setQuery}
      />
      {query.trim().length > 0 && (
        <Text style={styles.filterCount}>
          {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''} encontrado{filteredClients.length !== 1 ? 's' : ''}
        </Text>
      )}

      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {clients.length === 0
              ? 'Cadastre clientes e realize avaliações para gerar relatórios.'
              : 'Nenhum cliente encontrado.'}
          </Text>
        }
        renderItem={({ item }) => {
          const latestEval = overview?.recentEvaluations.find((e) => e.clientId === item.id);
          return (
            <TouchableOpacity
              style={styles.clientCard}
              onPress={() => router.push(`/client/${item.id}` as never)}
              activeOpacity={0.7}
            >
              <Text style={styles.clientName}>{item.name}</Text>
              <Text style={styles.clientMeta}>
                {item.gender === 'MALE' ? 'Masculino' : item.gender === 'FEMALE' ? 'Feminino' : 'Outro'}
                {' · '}{item.age} anos · {item.height} cm
              </Text>
              {latestEval && (
                <View style={styles.badges}>
                  <Text style={styles.badge}>Peso: {latestEval.weight} kg</Text>
                  <Text style={styles.badge}>Músculo: {latestEval.skeletalMuscle} kg</Text>
                  <Text style={styles.badge}>
                    Gordura: {bodyFatPercent(latestEval.weight, latestEval.bodyFat)}
                  </Text>
                </View>
              )}
              <Text style={styles.tapHint}>Toque para abrir relatório →</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#e8edf4', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#8b9cb3', marginBottom: 20 },
  cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  card: {
    flex: 1,
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2d3a4f',
    alignItems: 'center',
  },
  cardLabel: { color: '#8b9cb3', marginBottom: 8, fontSize: 13 },
  cardValue: { color: '#3b82f6', fontSize: 28, fontWeight: '700' },
  filterLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  search: {
    backgroundColor: '#1a2332',
    borderWidth: 1,
    borderColor: '#2d3a4f',
    borderRadius: 8,
    padding: 12,
    color: '#e8edf4',
    marginBottom: 16,
    fontSize: 16,
  },
  filterCount: { color: '#64748b', fontSize: 12, marginBottom: 12, marginTop: -8 },
  clientCard: {
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2d3a4f',
    marginBottom: 12,
  },
  clientName: { color: '#e8edf4', fontWeight: '700', fontSize: 17, marginBottom: 4 },
  clientMeta: { color: '#8b9cb3', fontSize: 13, marginBottom: 10 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    backgroundColor: '#0f1729',
    color: '#94a3b8',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tapHint: { color: '#3b82f6', fontSize: 12, marginTop: 12, fontWeight: '500' },
  empty: { color: '#8b9cb3', textAlign: 'center', marginTop: 40, lineHeight: 22 },
});
