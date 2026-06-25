import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { api, Overview, Evaluation } from '../services/api';

export default function ReportsScreen() {
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    api.reports.overview().then(setOverview).catch(console.error);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Relatórios</Text>
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

      <Text style={styles.sectionTitle}>Avaliações recentes</Text>
      <FlatList
        data={overview?.recentEvaluations ?? []}
        keyExtractor={(item: Evaluation) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma avaliação disponível</Text>}
        renderItem={({ item }) => (
          <View style={styles.reviewCard}>
            <Text style={styles.reviewClient}>{item.client?.name || 'Cliente desconhecido'}</Text>
            <Text style={styles.reviewText}>Data: {new Date(item.examDate).toLocaleDateString('pt-BR')}</Text>
            <Text style={styles.reviewText}>Peso: {item.weight} kg</Text>
            <Text style={styles.reviewText}>Músculo: {item.skeletalMuscle} kg</Text>
            <Text style={styles.reviewText}>Gordura: {item.bodyFat} kg</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#e8edf4', marginBottom: 20 },
  cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
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
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#e8edf4', marginBottom: 12 },
  reviewCard: {
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2d3a4f',
    marginBottom: 12,
  },
  reviewClient: { color: '#e8edf4', fontWeight: '700', fontSize: 16, marginBottom: 6 },
  reviewText: { color: '#8b9cb3', fontSize: 13, marginTop: 2 },
  empty: { color: '#8b9cb3', textAlign: 'center', marginTop: 40 },
});
