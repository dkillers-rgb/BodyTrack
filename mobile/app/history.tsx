import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { api, Evaluation } from '../services/api';
import BottomNavigation from '../components/home/BottomNavigation';

export default function HistoryScreen() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const router = useRouter();

  useEffect(() => {
    api.reports.overview().then((o) => setEvaluations(o.recentEvaluations)).catch(console.error);
  }, []);

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <FlatList
          data={evaluations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => item.clientId && router.push(`/client/${item.clientId}` as never)}
              activeOpacity={0.7}
            >
              <Text style={styles.name}>{item.client?.name || '—'}</Text>
              <Text style={styles.date}>
                {new Date(item.examDate).toLocaleDateString('pt-BR')}
              </Text>
              <View style={styles.metrics}>
                <Text style={styles.metric}>Peso: {item.weight} kg</Text>
                <Text style={styles.metric}>Músculo: {item.skeletalMuscle} kg</Text>
                <Text style={styles.metric}>Gordura: {item.bodyFat} kg</Text>
              </View>
              {item.aiAnalysis && (
                <Text style={styles.analysis}>{item.aiAnalysis}</Text>
              )}
              <Text style={styles.tapHint}>Ver relatório completo →</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhuma avaliação registrada</Text>
          }
        />
      </View>
      <BottomNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#090B10' },
  container: { flex: 1, padding: 16, backgroundColor: '#090B10' },
  listContent: { paddingBottom: 8 },
  card: {
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2d3a4f',
  },
  name: { fontSize: 16, fontWeight: '600', color: '#e8edf4' },
  date: { fontSize: 13, color: '#8b9cb3', marginTop: 2 },
  metrics: { flexDirection: 'row', gap: 12, marginTop: 8 },
  metric: { fontSize: 13, color: '#e8edf4' },
  analysis: { fontSize: 12, color: '#8b9cb3', marginTop: 8, fontStyle: 'italic' },
  tapHint: { color: '#3b82f6', fontSize: 12, marginTop: 10, fontWeight: '500' },
  empty: { color: '#8b9cb3', textAlign: 'center', marginTop: 40 },
});
