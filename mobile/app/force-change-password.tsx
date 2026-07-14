import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { HOME_THEME as T } from '../components/home/theme';

export default function ForceChangePasswordScreen() {
  const router = useRouter();
  const { completeTemporaryPasswordChange, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (password !== confirm) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }
    setBusy(true);
    try {
      await completeTemporaryPasswordChange(password);
      Alert.alert('Senha atualizada', 'Já pode usar o aplicativo normalmente.');
      router.replace('/' as never);
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Falha ao guardar senha.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Troca de senha obrigatória</Text>
        <Text style={styles.bannerText}>
          Entrou com uma senha temporária. Por segurança, defina uma senha nova antes de continuar.
        </Text>
      </View>

      <Text style={styles.label}>Nova senha</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="mínimo 8 caracteres"
        placeholderTextColor={T.textDisabled}
      />

      <Text style={styles.label}>Confirmar nova senha</Text>
      <TextInput
        style={styles.input}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        placeholder="repita a senha"
        placeholderTextColor={T.textDisabled}
      />

      <Pressable
        style={({ pressed }) => [styles.primaryBtn, (pressed || busy) && styles.pressed]}
        onPress={handleSave}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#0B1A2E" />
        ) : (
          <Text style={styles.primaryBtnText}>Guardar nova senha</Text>
        )}
      </Pressable>

      <Pressable
        style={styles.linkWrap}
        onPress={() => {
          void (async () => {
            await logout();
            router.replace('/login' as never);
          })();
        }}
      >
        <Text style={styles.mutedLink}>Sair e voltar ao login</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  content: { padding: 20, paddingBottom: 40 },
  banner: {
    backgroundColor: 'rgba(199,162,90,0.15)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(199,162,90,0.35)',
    padding: 16,
    marginBottom: 22,
  },
  bannerTitle: { color: '#C7A25A', fontWeight: '700', fontSize: 16, marginBottom: 6 },
  bannerText: { color: T.textSecondary, fontSize: 14, lineHeight: 20 },
  label: { fontSize: 12, color: T.textDisabled, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: T.text,
    marginBottom: 14,
  },
  primaryBtn: {
    backgroundColor: '#C7A25A',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#0B1A2E', fontWeight: '700', fontSize: 16 },
  linkWrap: { alignItems: 'center', marginTop: 22 },
  mutedLink: { color: T.textSecondary, fontSize: 13 },
  pressed: { opacity: 0.9 },
});
