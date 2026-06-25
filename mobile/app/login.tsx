import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const TEST_USER = {
  email: 'teste@bodytrack.com',
  password: 'Teste123!',
};

export default function LoginScreen() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = isRegister
        ? await api.auth.register(name, email, password)
        : await api.auth.login(email, password);
      await login(result.user, result.token);
      router.replace('/');
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = async () => {
    setLoading(true);
    try {
      const result = await api.auth.login(TEST_USER.email, TEST_USER.password);
      await login(result.user, result.token);
      router.replace('/');
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>💪</Text>
      <Text style={styles.title}>BodyTrack</Text>
      <Text style={styles.subtitle}>Análise corporal inteligente</Text>

      {isRegister && (
        <TextInput
          style={styles.input}
          placeholder="Nome"
          placeholderTextColor="#8b9cb3"
          value={name}
          onChangeText={setName}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="E-mail"
        placeholderTextColor="#8b9cb3"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor="#8b9cb3"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.btnText}>
          {loading ? 'Carregando...' : isRegister ? 'Criar conta' : 'Entrar'}
        </Text>
      </TouchableOpacity>

      {!isRegister && (
        <TouchableOpacity style={styles.testBtn} onPress={handleTestLogin} disabled={loading}>
          <Text style={styles.testBtnText}>Login de Teste</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
        <Text style={styles.toggle}>
          {isRegister ? 'Já tem conta? Fazer login' : 'Não tem conta? Criar conta'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#0f1419' },
  logo: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#3b82f6', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#8b9cb3', textAlign: 'center', marginBottom: 32 },
  input: {
    backgroundColor: '#1a2332',
    borderWidth: 1,
    borderColor: '#2d3a4f',
    borderRadius: 8,
    padding: 14,
    color: '#e8edf4',
    marginBottom: 12,
    fontSize: 16,
  },
  btn: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  testBtn: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  testBtnText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 16,
  },
  toggle: { color: '#3b82f6', textAlign: 'center', marginTop: 20, fontSize: 14 },
});
