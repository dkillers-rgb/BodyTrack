import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api, ClientDashboard } from '../../services/api';
import ClientReport from '../../components/ClientReport';
import { exportReportToPdf, printReport } from '../../utils/exportPdf';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<ClientDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const clientId = parseInt(id, 10);
    if (Number.isNaN(clientId)) return;
    setLoading(true);
    api.reports
      .clientDashboard(clientId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleExportPdf = async () => {
    if (!data) return;
    setExporting(true);
    try {
      await exportReportToPdf(data);
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao gerar PDF');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = async () => {
    if (!data) return;
    setExporting(true);
    try {
      await printReport(data);
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao imprimir');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!data) {
    return <Text style={styles.error}>Cliente não encontrado</Text>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btnPrimary, exporting && styles.btnDisabled]}
          onPress={handleExportPdf}
          disabled={exporting}
        >
          <Text style={styles.btnPrimaryText}>
            {exporting ? 'Gerando...' : 'Exportar PDF'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnSecondary, exporting && styles.btnDisabled]}
          onPress={handlePrint}
          disabled={exporting}
        >
          <Text style={styles.btnSecondaryText}>Imprimir</Text>
        </TouchableOpacity>
      </View>

      <ClientReport data={data} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#ef4444', textAlign: 'center', marginTop: 40 },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#1a2332',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d3a4f',
  },
  btnSecondaryText: { color: '#e8edf4', fontWeight: '600', fontSize: 15 },
  btnDisabled: { opacity: 0.6 },
});
