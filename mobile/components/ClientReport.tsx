import { View, Text, StyleSheet } from 'react-native';
import type { ClientDashboard } from '../services/types';
import EvolutionChart from './EvolutionChart';

interface Props {
  data: ClientDashboard;
}

function formatGender(gender: string): string {
  if (gender === 'MALE') return 'Masculino';
  if (gender === 'FEMALE') return 'Feminino';
  return 'Outro';
}

function bodyFatPercent(weight: number, bodyFat: number): string {
  if (weight <= 0) return '—';
  return `${((bodyFat / weight) * 100).toFixed(1)}%`;
}

export default function ClientReport({ data }: Props) {
  const { client, evaluations, chartData, analysis, summary } = data;
  const generatedAt = new Date().toLocaleString('pt-BR');
  const latestBodyFatPercent =
    summary.latestWeight && summary.latestFat != null
      ? bodyFatPercent(summary.latestWeight, summary.latestFat)
      : '—';

  return (
    <View style={styles.report}>
      <View style={styles.header}>
        <Text style={styles.brand}>BodyTrack — Relatório de Composição Corporal</Text>
        <Text style={styles.title}>{client.name}</Text>
        <Text style={styles.meta}>
          {formatGender(client.gender)} · {client.age} anos · {client.height} cm ·{' '}
          {summary.totalEvaluations} avaliação{summary.totalEvaluations !== 1 ? 'ões' : ''}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary.latestWeight ?? '—'}</Text>
          <Text style={styles.statLabel}>Peso atual (kg)</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary.latestMuscle ?? '—'}</Text>
          <Text style={styles.statLabel}>Músculo esquelético (kg)</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{latestBodyFatPercent}</Text>
          <Text style={styles.statLabel}>Gordura corporal (%)</Text>
        </View>
      </View>

      <EvolutionChart data={chartData} />

      {analysis ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Análise de evolução</Text>
          <Text style={styles.analysisText}>{analysis}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Histórico de avaliações</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.tableCellDate]}>Data</Text>
            <Text style={styles.tableCell}>Peso</Text>
            <Text style={styles.tableCell}>Músculo</Text>
            <Text style={styles.tableCell}>Gordura</Text>
            <Text style={styles.tableCell}>%</Text>
          </View>
          {[...evaluations].reverse().map((ev) => (
            <View key={ev.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableCellDate]}>
                {new Date(ev.examDate).toLocaleDateString('pt-BR')}
              </Text>
              <Text style={styles.tableCell}>{ev.weight}</Text>
              <Text style={styles.tableCell}>{ev.skeletalMuscle}</Text>
              <Text style={styles.tableCell}>{ev.bodyFat}</Text>
              <Text style={styles.tableCell}>{bodyFatPercent(ev.weight, ev.bodyFat)}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.footer}>Relatório gerado em {generatedAt}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  report: {
    backgroundColor: '#ffffff',
    borderRadius: 4,
    padding: 20,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#111111',
    paddingBottom: 14,
    marginBottom: 18,
  },
  brand: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#6b7280',
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: '#374151',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  analysisText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#1f2937',
  },
  table: {
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
  },
  tableCell: {
    flex: 1,
    padding: 8,
    fontSize: 11,
    color: '#111111',
    textAlign: 'center',
  },
  tableCellDate: {
    flex: 1.4,
    textAlign: 'left',
  },
  footer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
});
