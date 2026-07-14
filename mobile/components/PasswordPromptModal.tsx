import { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { HOME_THEME as T } from './home/theme';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  requireConfirm?: boolean;
  minLength?: number;
  onCancel: () => void;
  onConfirm: (password: string) => void;
};

export function PasswordPromptModal({
  visible,
  title,
  message,
  confirmLabel = 'Continuar',
  requireConfirm = false,
  minLength = 8,
  onCancel,
  onConfirm,
}: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const mismatch = requireConfirm && password.length > 0 && confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < minLength;

  const reset = () => {
    setPassword('');
    setConfirm('');
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  const handleConfirm = () => {
    if (mismatch || password.length < minLength) return;
    const value = password;
    reset();
    onConfirm(value);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Senha do backup"
            placeholderTextColor={T.textDisabled}
            secureTextEntry
            autoFocus
          />

          {requireConfirm ? (
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Confirmar senha"
              placeholderTextColor={T.textDisabled}
              secureTextEntry
            />
          ) : null}

          {mismatch ? <Text style={styles.error}>As senhas não coincidem.</Text> : null}
          {tooShort ? (
            <Text style={styles.error}>Mínimo de {minLength} caracteres.</Text>
          ) : null}

          <View style={styles.row}>
            <Pressable style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[
                styles.okBtn,
                (mismatch || password.length < minLength) && styles.disabled,
              ]}
              onPress={handleConfirm}
              disabled={mismatch || password.length < minLength}
            >
              <Text style={styles.okText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: T.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: T.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: T.text, marginBottom: 8 },
  message: { fontSize: 13, color: T.textSecondary, lineHeight: 18, marginBottom: 14 },
  input: {
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: T.text,
    marginBottom: 10,
  },
  error: { color: T.danger, fontSize: 12, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cancelText: { color: T.textSecondary, fontWeight: '600' },
  okBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#C7A25A',
  },
  okText: { color: '#0B1A2E', fontWeight: '700' },
  disabled: { opacity: 0.45 },
});
