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
import { reopenWhatsAppTempPassword } from '../services/authService';
import { HOME_THEME as T } from '../components/home/theme';

type PendingReset = {
  temporaryPassword: string;
  whatsappPhone: string;
  maskedPhone: string;
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { requestResetByEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingReset | null>(null);

  const handleSend = async () => {
    setBusy(true);
    try {
      const result = await requestResetByEmail(email);
      if (result.whatsappOpened) {
        setPending(null);
        Alert.alert(
          'WhatsApp aberto',
          `A conversa com o número cadastrado (${result.maskedPhone}) deve ter aberto com a senha temporária na mensagem. Toque em Enviar no WhatsApp.\n\nA senha vale 1 hora. Depois de entrar, defina uma senha nova.`,
          [{ text: 'Ir para o login', onPress: () => router.replace('/login' as never) }]
        );
        return;
      }

      setPending({
        temporaryPassword: result.temporaryPassword,
        whatsappPhone: result.whatsappPhone,
        maskedPhone: result.maskedPhone,
      });
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Falha na recuperação.');
    } finally {
      setBusy(false);
    }
  };

  const handleRetryWhatsApp = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const opened = await reopenWhatsAppTempPassword({
        whatsappPhone: pending.whatsappPhone,
        temporaryPassword: pending.temporaryPassword,
      });
      if (opened) {
        setPending(null);
        Alert.alert(
          'WhatsApp aberto',
          `Toque em Enviar no WhatsApp para o número ${pending.maskedPhone}. Depois entre no app com a senha temporária e troque a senha.`,
          [{ text: 'Ir para o login', onPress: () => router.replace('/login' as never) }]
        );
      } else {
        Alert.alert(
          'Ainda não abriu',
          'Instale o WhatsApp neste aparelho ou tente de novo. A senha temporária não é mostrada neste aplicativo — só na mensagem do WhatsApp.'
        );
      }
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Falha ao abrir WhatsApp.');
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
        <Text style={styles.title}>Recuperar senha</Text>
        <Text style={styles.subtitle}>
          Informe o e-mail da conta. O app abre o WhatsApp e prepara a mensagem para o número do seu
          cadastro. A senha temporária não aparece nesta tela.
        </Text>

        <Text style={styles.label}>E-mail cadastrado</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="seu@email.com"
          placeholderTextColor={T.textDisabled}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!busy}
        />

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, (pressed || busy) && styles.pressed]}
          onPress={handleSend}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#0B1A2E" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {pending ? 'Gerar nova senha e abrir WhatsApp' : 'Enviar senha no meu WhatsApp'}
            </Text>
          )}
        </Pressable>

        {pending ? (
          <View style={styles.retryBox}>
            <Text style={styles.retryTitle}>WhatsApp não abriu</Text>
            <Text style={styles.retryText}>
              A senha temporária já foi gerada para {pending.maskedPhone}, mas o WhatsApp não abriu.
              Tente novamente ou confira se o app WhatsApp está instalado.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.retryBtn, (pressed || busy) && styles.pressed]}
              onPress={handleRetryWhatsApp}
              disabled={busy}
            >
              <Text style={styles.retryBtnText}>Tentar abrir WhatsApp de novo</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable onPress={() => router.back()} style={styles.linkWrap}>
          <Text style={styles.mutedLink}>Voltar ao login</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  content: { padding: 24, paddingTop: 24 },
  title: { fontSize: 26, fontWeight: '700', color: T.text, marginBottom: 8 },
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
    backgroundColor: '#25D366',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { color: '#0B1A2E', fontWeight: '700', fontSize: 16 },
  retryBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(199,162,90,0.4)',
    backgroundColor: 'rgba(199,162,90,0.1)',
  },
  retryTitle: { color: '#C7A25A', fontWeight: '700', marginBottom: 6 },
  retryText: { color: T.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  retryBtn: {
    backgroundColor: 'rgba(37,211,102,0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  retryBtnText: { color: '#25D366', fontWeight: '700' },
  linkWrap: { alignItems: 'center', marginTop: 18 },
  mutedLink: { color: T.textSecondary, fontSize: 13 },
  pressed: { opacity: 0.9 },
});
