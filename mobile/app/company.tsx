import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { api, CompanySettings } from '../services/api';
import { resolveLocalUri } from '../services/fileStorage';

export default function CompanyScreen() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [logoPath, setLogoPath] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const company: CompanySettings = await api.company.get();
      setName(company.name);
      setAddress(company.address);
      setPhone(company.phone);
      setLogoPath(company.logoPath);
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível carregar os dados da empresa.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handlePickLogo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg', 'image/webp'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const updated = await api.company.saveLogo(asset.uri, asset.mimeType, asset.name);
      setLogoPath(updated.logoPath);
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Falha ao selecionar logo');
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const updated = await api.company.save({
        name,
        address,
        phone,
        logoPath: null,
      });
      setLogoPath(updated.logoPath);
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Falha ao remover logo');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.company.save({ name, address, phone });
      Alert.alert('Salvo', 'Dados da empresa atualizados. Eles aparecerão no cabeçalho do relatório.');
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#C7A25A" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        Estes dados aparecem no cabeçalho e no rodapé do relatório impresso/PDF.
      </Text>

      <Text style={styles.label}>Nome da empresa</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Ex.: Clínica Levèz"
        placeholderTextColor="#64748b"
      />

      <Text style={styles.label}>Endereço</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={address}
        onChangeText={setAddress}
        placeholder="Ex.: Avenida Waldir Felizola de Moraes, Araçatuba - SP"
        placeholderTextColor="#64748b"
        multiline
      />

      <Text style={styles.label}>Telefone</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="Ex.: 99 999999999"
        placeholderTextColor="#64748b"
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Logomarca</Text>
      <View style={styles.logoBox}>
        {logoPath ? (
          <Image source={{ uri: resolveLocalUri(logoPath) }} style={styles.logoPreview} resizeMode="contain" />
        ) : (
          <Text style={styles.logoPlaceholder}>Nenhuma logo selecionada</Text>
        )}
      </View>
      <View style={styles.logoActions}>
        <TouchableOpacity style={styles.btnSecondary} onPress={handlePickLogo}>
          <Text style={styles.btnSecondaryText}>{logoPath ? 'Trocar logo' : 'Escolher logo'}</Text>
        </TouchableOpacity>
        {logoPath ? (
          <TouchableOpacity style={styles.btnGhost} onPress={handleRemoveLogo}>
            <Text style={styles.btnGhostText}>Remover</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.btnPrimary, saving && styles.btnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.btnPrimaryText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f1419' },
  hint: { color: '#94a3b8', fontSize: 13, marginBottom: 20, lineHeight: 18 },
  label: { color: '#163040', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: '#1a2332',
    borderWidth: 1,
    borderColor: '#2d3a4f',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#e8edf4',
    fontSize: 15,
    marginBottom: 16,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  logoBox: {
    height: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D7D7D7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  logoPreview: { width: '100%', height: '100%' },
  logoPlaceholder: { color: '#64748b', fontSize: 13 },
  logoActions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  btnSecondary: {
    backgroundColor: '#1a2332',
    borderWidth: 1,
    borderColor: '#C7A25A',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  btnSecondaryText: { color: '#163040', fontWeight: '600' },
  btnGhost: { justifyContent: 'center', paddingHorizontal: 8 },
  btnGhostText: { color: '#ef4444', fontWeight: '600' },
  btnPrimary: {
    backgroundColor: '#163040',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  btnDisabled: { opacity: 0.6 },
});
