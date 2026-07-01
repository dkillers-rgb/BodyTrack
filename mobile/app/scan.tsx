import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../services/api';
import { navigateToManualEntry } from '../utils/manualEntryNavigation';

function hasMuscleFatData(preview: {
  preview: { muscleFat: { weight?: number; skeletalMuscle?: number; bodyFat?: number } };
}): boolean {
  const { weight, skeletalMuscle, bodyFat } = preview.preview.muscleFat;
  return weight != null || skeletalMuscle != null || bodyFat != null;
}

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission]);

  const goToManualEntry = (showHint = true) => {
    setScanned(false);
    setProcessing(false);
    navigateToManualEntry(router, undefined, { showHint });
  };

  const offerManualAfterError = (title: string, message: string) => {
    Alert.alert(title, message, [
      { text: 'Preencher manualmente', onPress: () => goToManualEntry(true) },
      { text: 'Tentar novamente', onPress: () => setScanned(false) },
      { text: 'Cancelar', style: 'cancel', onPress: () => setScanned(false) },
    ]);
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);

    try {
      const result = await api.evaluations.scanQr(data);
      setScanned(false);
      navigateToManualEntry(router, result, { showHint: !hasMuscleFatData(result) });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar';
      const isTimeout = message.includes('Tempo esgotado');
      const isInvalidQr = message.includes('QR Code inválido');
      const isNetworkError =
        !isInvalidQr &&
        (isTimeout ||
          message.includes('Network') ||
          message.includes('fetch failed') ||
          message.includes('Falha ao buscar') ||
          message.includes('aborted') ||
          message.includes('consultar o equipamento'));

      if (isInvalidQr) {
        offerManualAfterError(
          'QR Code inválido',
          'Este QR Code não é do equipamento TCY. Escaneie o código exibido na tela do aparelho Bodbody.'
        );
      } else if (message.includes('Relatório não encontrado') || message.includes('não encontrado no equipamento')) {
        offerManualAfterError(
          'Relatório indisponível',
          message
        );
      } else if (isNetworkError) {
        offerManualAfterError(
          isTimeout ? 'Tempo esgotado' : 'Sem conexão',
          isTimeout
            ? message
            : 'Não foi possível conectar ao equipamento. Verifique se o celular está na mesma rede do aparelho e tente escanear o QR Code diretamente na tela.'
        );
      } else {
        offerManualAfterError('Erro', message);
      }
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
      const ocrResult = await api.evaluations.processImage(
        asset.uri,
        isPdf ? 'application/pdf' : asset.mimeType || 'image/jpeg',
        asset.name
      );
      setScanned(false);
      navigateToManualEntry(router, ocrResult, { showHint: !hasMuscleFatData(ocrResult) });
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao processar arquivo', [
        { text: 'Preencher manualmente', onPress: () => goToManualEntry(true) },
        { text: 'OK', style: 'cancel' },
      ]);
    } finally {
      setProcessing(false);
    }
  };

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
        onBarcodeScanned={scanned || processing ? undefined : handleBarCodeScanned}
      />
      {processing && (
        <View style={styles.overlay}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.overlayText}>Buscando dados do relatório...</Text>
          <Text style={styles.overlayHint}>Consultando equipamento TCY</Text>
        </View>
      )}
      <TouchableOpacity style={styles.uploadBtn} onPress={pickReport} disabled={processing}>
        <Text style={styles.btnText}>📁 Enviar imagem ou PDF do relatório</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.manualBtn}
        onPress={() => goToManualEntry(true)}
        disabled={processing}
      >
        <Text style={styles.btnText}>✏️ Preencher dados manualmente</Text>
      </TouchableOpacity>
      {scanned && !processing && (
        <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
          <Text style={styles.btnText}>Escanear novamente</Text>
        </TouchableOpacity>
      )}
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
    gap: 8,
  },
  overlayText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  overlayHint: { color: '#94a3b8', fontSize: 13 },
  uploadBtn: {
    backgroundColor: '#1a2332',
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#2d3a4f',
  },
  manualBtn: {
    backgroundColor: '#334155',
    padding: 14,
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
});
