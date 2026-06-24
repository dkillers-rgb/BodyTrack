import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api, ClientDashboard } from '../../services/api';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<ClientDashboard | null>(null);

  useEffect(() => {
    if (!id) return;
    const clientId = parseInt(id, 10);
    if (Number.isNaN(clientId)) return;
    api.reports.clientDashboard(clientId).then(setData).catch(console.error);
  }, [id]);

  if (!data) return <Text style={styles.loading}>Carregando...</Text>;

  const { client, chartData, analysis, summary } = data;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{client.name}</Text>
      <Text style={styles.subtitle}>
        {client.age} anos · {client.height} cm
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{String(summary.latestWeight ?? '—')}</Text>
          <Text style={styles.statLabel}>Peso (kg)</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{String(summary.latestMuscle ?? '—')}</Text>
          <Text style={styles.statLabel}>Músculo</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{String(summary.latestFat ?? '—')}</Text>
          <Text style={styles.statLabel}>Gordura</Text>
        </View>
      </View>

      {analysis && (
        <View style={styles.analysisCard}>
          <Text style={styles.analysisTitle}>Análise IA</Text>
          <Text style={styles.analysisText}>{analysis}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Evolução</Text>
      {chartData.map((point) => (
        <View key={point.date} style={styles.row}>
          <Text style={styles.date}>{point.date}</Text>
          <Text style={styles.value}>{point.weight} kg</Text>
          <Text style={styles.value}>{point.skeletalMuscle} m</Text>
          <Text style={styles.value}>{point.bodyFat} g</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  loading: { color: '#8b9cb3', textAlign: 'center', marginTop: 40 },
  title: { fontSize: 22, fontWeight: '700', color: '#e8edf4' },
  subtitle: { color: '#8b9cb3', marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  stat: {
    flex: 1,
    backgroundColor: '#1a2332',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d3a4f',
  },
  statValue: { fontSize: 20, fontWeight: '700', color: '#3b82f6' },
  statLabel: { fontSize: 11, color: '#8b9cb3', marginTop: 4 },
  analysisCard: {
    backgroundColor: '#1a2332',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  analysisTitle: { fontWeight: '600', color: '#e8edf4', marginBottom: 8 },
  analysisText: { color: '#8b9cb3', lineHeight: 22 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#e8edf4', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#2d3a4f',
  },
  date: { color: '#e8edf4', flex: 1 },
  value: { color: '#8b9cb3', width: 60, textAlign: 'right' },
});
