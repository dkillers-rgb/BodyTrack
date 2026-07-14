import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api, Evaluation } from '../services/api';
import BottomNavigation from '../components/home/BottomNavigation';

export default function HistoryScreen() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(() => {
    setLoadError(null);
    api.reports
      .overview()
      .then((o) => setEvaluations(o.recentEvaluations))
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Não foi possível carregar o histórico.');
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.heading}>Histórico recente</Text>
        <Text style={styles.subheading}>Mostra as 10 avaliações mais recentes neste aparelho.</Text>
        {loadError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{loadError}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retry}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <FlatList
          data={evaluations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={6}
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
  heading: { fontSize: 22, fontWeight: '700', color: '#e8edf4', marginBottom: 4 },
  subheading: { fontSize: 13, color: '#8b9cb3', marginBottom: 14, lineHeight: 18 },
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
  errorBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(248,113,113,0.12)',
  },
  errorText: { color: '#f87171', marginBottom: 6 },
  retry: { color: '#3b82f6', fontWeight: '600' },
});
