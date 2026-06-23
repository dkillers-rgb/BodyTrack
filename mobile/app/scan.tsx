import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { api, Client, OcrPreview } from '../services/api';

function toDateInputValue(value?: string): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

interface EvaluationForm {
  examDate: string;
  weight: string;
  skeletalMuscle: string;
  bodyFat: string;
}

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [preview, setPreview] = useState<OcrPreview | null>(null);
  const [form, setForm] = useState<EvaluationForm>({
    examDate: '',
    weight: '',
    skeletalMuscle: '',
    bodyFat: '',
  });
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission]);

  useEffect(() => {
    api.clients.list().then(setClients).catch(console.error);
  }, []);

  const openPreview = async (result: OcrPreview) => {
    setPreview(result);
    setForm({
      examDate: toDateInputValue(result.preview.patient.examDate),
      weight: result.preview.muscleFat.weight != null ? String(result.preview.muscleFat.weight) : '',
      skeletalMuscle:
        result.preview.muscleFat.skeletalMuscle != null
          ? String(result.preview.muscleFat.skeletalMuscle)
          : '',
      bodyFat: result.preview.muscleFat.bodyFat != null ? String(result.preview.muscleFat.bodyFat) : '',
    });
    if (clients.length === 0) {
      const list = await api.clients.list();
      setClients(list);
    }
    setSelectedClientId(null);
  };

  const closePreview = () => {
    setPreview(null);
    setForm({ examDate: '', weight: '', skeletalMuscle: '', bodyFat: '' });
    setSelectedClientId(null);
    setScanned(false);
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);

    try {
      const result = await api.evaluations.scanQr(data);
      openPreview(result);
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao processar');
      setScanned(false);
    } finally {
      setProcessing(false);
    }
  };

  const pickReport = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const isPdf =
      asset.mimeType === 'application/pdf' ||
      asset.name?.toLowerCase().endsWith('.pdf');

    setProcessing(true);
    try {
      const form = new FormData();
      form.append('image', {
        uri: asset.uri,
        type: isPdf ? 'application/pdf' : (asset.mimeType || 'image/jpeg'),
        name: asset.name || (isPdf ? 'report.pdf' : 'report.jpg'),
      } as unknown as Blob);

      const ocrResult = await api.evaluations.processImage(form);
      openPreview(ocrResult);
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao processar arquivo');
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!preview || !selectedClientId) return;

    const weight = parseFloat(form.weight.replace(',', '.'));
    const skeletalMuscle = parseFloat(form.skeletalMuscle.replace(',', '.')) || 0;
    const bodyFat = parseFloat(form.bodyFat.replace(',', '.')) || 0;

    if (!Number.isFinite(weight) || weight <= 0) {
      Alert.alert('Erro', 'Informe o peso (kg) para salvar a avaliação.');
      return;
    }

    setProcessing(true);
    try {
      const result = await api.evaluations.create({
        clientId: selectedClientId,
        examDate: new Date(`${form.examDate}T12:00:00`).toISOString(),
        weight,
        skeletalMuscle,
        bodyFat,
        imagePath: preview.imagePath,
        rawOcrText: preview.ocr.rawText,
      });

      const clientName = clients.find((c) => c.id === selectedClientId)?.name || 'cliente';
      closePreview();
      Alert.alert('Sucesso', `Avaliação salva para ${clientName}`);
      router.push(`/client/${result.clientId}` as never);
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Falha ao salvar');
    } finally {
      setProcessing(false);
    }
  };

  const canSave =
    !!selectedClientId &&
    !!form.examDate &&
    !!form.weight &&
    Number.isFinite(parseFloat(form.weight.replace(',', '.'))) &&
    parseFloat(form.weight.replace(',', '.')) > 0;

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Permissão de câmera necessária</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Permitir câmera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned || preview ? undefined : handleBarCodeScanned}
      />
      {processing && !preview && (
        <View style={styles.overlay}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.overlayText}>Processando...</Text>
        </View>
      )}
      <TouchableOpacity style={styles.uploadBtn} onPress={pickReport} disabled={processing}>
        <Text style={styles.btnText}>📁 Enviar imagem ou PDF do relatório</Text>
      </TouchableOpacity>
      {scanned && !preview && (
        <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
          <Text style={styles.btnText}>Escanear novamente</Text>
        </TouchableOpacity>
      )}

      <Modal visible={!!preview} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Dados extraídos</Text>

            <Text style={styles.sectionLabel}>Cliente *</Text>
            {clients.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum cliente cadastrado. Cadastre em Clientes.</Text>
            ) : (
              <ScrollView style={styles.clientList} nestedScrollEnabled>
                {clients.map((client) => (
                  <TouchableOpacity
                    key={client.id}
                    style={[
                      styles.clientItem,
                      selectedClientId === client.id && styles.clientItemSelected,
                    ]}
                    onPress={() => setSelectedClientId(client.id)}
                  >
                    <Text style={styles.clientName}>{client.name}</Text>
                    <Text style={styles.clientMeta}>
                      {client.age} anos · {client.height} cm
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.ocrData}>
              <Text style={styles.sectionLabel}>Muscle Fat Analysis</Text>
              <Text style={styles.fieldLabel}>Data do exame *</Text>
              <TextInput
                style={styles.input}
                value={form.examDate}
                onChangeText={(examDate) => setForm((prev) => ({ ...prev, examDate }))}
                placeholder="AAAA-MM-DD"
                placeholderTextColor="#64748b"
              />
              <Text style={styles.fieldLabel}>Peso (kg) *</Text>
              <TextInput
                style={styles.input}
                value={form.weight}
                onChangeText={(weight) => setForm((prev) => ({ ...prev, weight }))}
                keyboardType="decimal-pad"
                placeholder="Ex: 72.5"
                placeholderTextColor="#64748b"
              />
              <Text style={styles.fieldLabel}>Músculo esquelético (kg)</Text>
              <TextInput
                style={styles.input}
                value={form.skeletalMuscle}
                onChangeText={(skeletalMuscle) => setForm((prev) => ({ ...prev, skeletalMuscle }))}
                keyboardType="decimal-pad"
                placeholder="Ex: 31.2"
                placeholderTextColor="#64748b"
              />
              <Text style={styles.fieldLabel}>Gordura corporal (kg)</Text>
              <TextInput
                style={styles.input}
                value={form.bodyFat}
                onChangeText={(bodyFat) => setForm((prev) => ({ ...prev, bodyFat }))}
                keyboardType="decimal-pad"
                placeholder="Ex: 15.8"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btn, styles.saveBtn, (!canSave || processing) && styles.btnDisabled]}
                onPress={handleSave}
                disabled={!canSave || processing}
              >
                <Text style={styles.btnText}>{processing ? 'Salvando...' : 'Salvar avaliação'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={closePreview}>
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  camera: { flex: 1 },
  text: { color: '#e8edf4', marginBottom: 16 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  overlayText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  uploadBtn: {
    backgroundColor: '#1a2332',
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#2d3a4f',
  },
  rescanBtn: {
    backgroundColor: '#3b82f6',
    padding: 14,
    alignItems: 'center',
  },
  btn: { backgroundColor: '#3b82f6', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a2332',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: { color: '#e8edf4', fontSize: 20, fontWeight: '700', marginBottom: 16 },
  sectionLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  clientList: { maxHeight: 180, marginBottom: 16 },
  clientItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2d3a4f',
    marginBottom: 8,
  },
  clientItemSelected: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59,130,246,0.15)',
  },
  clientName: { color: '#e8edf4', fontWeight: '600', fontSize: 15 },
  clientMeta: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  emptyText: { color: '#f87171', marginBottom: 16 },
  ocrData: {
    backgroundColor: '#0f1729',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  fieldLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#1a2332',
    borderWidth: 1,
    borderColor: '#2d3a4f',
    borderRadius: 8,
    padding: 10,
    color: '#e8edf4',
    fontSize: 14,
  },
  modalActions: { gap: 10 },
  saveBtn: { backgroundColor: '#22c55e' },
  cancelBtn: { backgroundColor: '#475569' },
});
