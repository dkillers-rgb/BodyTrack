import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { HOME_THEME as T } from '../components/home/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { needsSetup, login, setup } = useAuth();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setBusy(true);
    try {
      if (needsSetup) {
        if (password !== confirm) {
          Alert.alert('Atenção', 'As senhas não coincidem.');
          return;
        }
        await setup({ name, username, email, whatsappPhone, password });
        Alert.alert(
          'Conta criada',
          'Guarde bem o usuário e a senha. Em “Esqueci a senha” a recuperação é pelo WhatsApp.'
        );
      } else {
        const result = await login(username, password);
        if (result.usedTemporaryPassword) {
          Alert.alert(
            'Senha temporária',
            'Entrou com uma senha temporária. Por segurança, será pedido que defina uma senha nova agora.'
          );
          router.replace('/force-change-password' as never);
          return;
        }
      }
      router.replace('/' as never);
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Falha na autenticação.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>BodyTrack</Text>
        <Text style={styles.title}>{needsSetup ? 'Criar conta' : 'Entrar'}</Text>
        <Text style={styles.subtitle}>
          {needsSetup
            ? 'Primeiro acesso neste aparelho. Defina usuário, e-mail, WhatsApp e senha.'
            : 'Faça login para usar o aplicativo. Após 15 min sem uso, será preciso entrar de novo.'}
        </Text>

        {needsSetup ? (
          <>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Nome da clínica ou responsável"
              placeholderTextColor={T.textDisabled}
              autoCapitalize="words"
            />
          </>
        ) : null}

        <Text style={styles.label}>{needsSetup ? 'Usuário' : 'Usuário ou e-mail'}</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder={needsSetup ? 'ex.: clinica.silva' : 'usuário ou e-mail'}
          placeholderTextColor={T.textDisabled}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {needsSetup ? (
          <>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor={T.textDisabled}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.label}>WhatsApp (DDD + número)</Text>
            <TextInput
              style={styles.input}
              value={whatsappPhone}
              onChangeText={setWhatsappPhone}
              placeholder="11999999999"
              placeholderTextColor={T.textDisabled}
              keyboardType="phone-pad"
            />
          </>
        ) : null}

        <Text style={styles.label}>Senha</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="mínimo 8 caracteres"
          placeholderTextColor={T.textDisabled}
          secureTextEntry
        />

        {needsSetup ? (
          <>
            <Text style={styles.label}>Confirmar senha</Text>
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="repita a senha"
              placeholderTextColor={T.textDisabled}
              secureTextEntry
            />
          </>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            (pressed || busy) && styles.pressed,
            busy && styles.disabled,
          ]}
          onPress={handleSubmit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#0B1A2E" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {needsSetup ? 'Criar conta e entrar' : 'Entrar'}
            </Text>
          )}
        </Pressable>

        {!needsSetup ? (
          <Pressable
            onPress={() => router.push('/forgot-password' as never)}
            style={styles.linkWrap}
          >
            <Text style={styles.link}>Esqueci a senha</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  content: { padding: 24, paddingTop: 56 },
  brand: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C7A25A',
    letterSpacing: 1,
    marginBottom: 10,
  },
  title: { fontSize: 28, fontWeight: '700', color: T.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: T.textSecondary, lineHeight: 20, marginBottom: 24 },
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
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: '#C7A25A',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { color: '#0B1A2E', fontWeight: '700', fontSize: 16 },
  linkWrap: { alignItems: 'center', marginTop: 18 },
  link: { color: T.primary, fontWeight: '600', fontSize: 15 },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.6 },
});
