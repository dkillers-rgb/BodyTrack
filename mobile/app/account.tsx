import { useCallback, useState } from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { getAuthProfile, updateWhatsAppPhone } from '../services/authService';
import { HOME_THEME as T } from '../components/home/theme';

export default function AccountScreen() {
  const router = useRouter();
  const { user, changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyPhone, setBusyPhone] = useState(false);

  const loadProfile = useCallback(async () => {
    const profile = await getAuthProfile();
    if (profile?.whatsappPhone) {
      // mostra sem o 55 para edição mais natural
      const digits = profile.whatsappPhone;
      setWhatsappPhone(digits.startsWith('55') ? digits.slice(2) : digits);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const handleSavePhone = async () => {
    setBusyPhone(true);
    try {
      await updateWhatsAppPhone(whatsappPhone);
      Alert.alert('Salvo', 'Número de WhatsApp atualizado no cadastro.');
      await loadProfile();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Falha ao guardar WhatsApp.');
    } finally {
      setBusyPhone(false);
    }
  };

  const handleChange = async () => {
    if (newPassword !== confirm) {
      Alert.alert('Atenção', 'As senhas novas não coincidem.');
      return;
    }
    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      Alert.alert('Senha atualizada', 'A nova senha já está ativa.');
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Falha ao alterar senha.');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Terminar sessão', 'Será necessário login novamente para usar o app.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair da conta',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await logout();
            router.replace('/login' as never);
          })();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>Conta neste aparelho</Text>
      <View style={styles.card}>
        <Text style={styles.metaLabel}>Nome</Text>
        <Text style={styles.metaValue}>{user?.name || '—'}</Text>
        <Text style={[styles.metaLabel, styles.gap]}>Usuário</Text>
        <Text style={styles.metaValue}>{user?.username || '—'}</Text>
        <Text style={[styles.metaLabel, styles.gap]}>E-mail</Text>
        <Text style={styles.metaValue}>{user?.email || '—'}</Text>
      </View>

      <Text style={styles.section}>WhatsApp do cadastro</Text>
      <Text style={styles.note}>
        Este número é usado na recuperação de senha (WhatsApp normal, conversa consigo mesmo).
      </Text>
      <Text style={styles.label}>DDD + número</Text>
      <TextInput
        style={styles.input}
        value={whatsappPhone}
        onChangeText={setWhatsappPhone}
        placeholder="11999999999"
        placeholderTextColor={T.textDisabled}
        keyboardType="phone-pad"
      />
      <Pressable
        style={({ pressed }) => [styles.secondaryBtn, (pressed || busyPhone) && styles.pressed]}
        onPress={handleSavePhone}
        disabled={busyPhone}
      >
        {busyPhone ? (
          <ActivityIndicator color={T.primary} />
        ) : (
          <Text style={styles.secondaryBtnText}>Guardar WhatsApp</Text>
        )}
      </Pressable>

      <Text style={[styles.section, { marginTop: 28 }]}>Alterar senha</Text>
      <Text style={styles.label}>Senha atual</Text>
      <TextInput
        style={styles.input}
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        placeholderTextColor={T.textDisabled}
        placeholder="senha atual"
      />
      <Text style={styles.label}>Nova senha</Text>
      <TextInput
        style={styles.input}
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        placeholderTextColor={T.textDisabled}
        placeholder="mínimo 8 caracteres"
      />
      <Text style={styles.label}>Confirmar nova senha</Text>
      <TextInput
        style={styles.input}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        placeholderTextColor={T.textDisabled}
        placeholder="repita a nova senha"
      />

      <Pressable
        style={({ pressed }) => [styles.primaryBtn, (pressed || busy) && styles.pressed]}
        onPress={handleChange}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#0B1A2E" />
        ) : (
          <Text style={styles.primaryBtnText}>Guardar nova senha</Text>
        )}
      </Pressable>

      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Terminar sessão (voltar ao login)</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  content: { padding: 20, paddingBottom: 40 },
  hint: { fontSize: 14, color: T.textSecondary, marginBottom: 12 },
  card: {
    backgroundColor: T.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    marginBottom: 24,
  },
  metaLabel: { fontSize: 12, color: T.textDisabled, textTransform: 'uppercase' },
  metaValue: { fontSize: 16, color: T.text, fontWeight: '600', marginTop: 4 },
  gap: { marginTop: 12 },
  section: { fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 8 },
  note: { fontSize: 13, color: T.textSecondary, lineHeight: 18, marginBottom: 12 },
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
  secondaryBtn: {
    backgroundColor: 'rgba(91,142,255,0.15)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: T.primary, fontWeight: '700', fontSize: 15 },
  logoutBtn: {
    marginTop: 28,
    alignItems: 'center',
    paddingVertical: 12,
  },
  logoutText: { color: T.danger, fontWeight: '600' },
  pressed: { opacity: 0.9 },
});
