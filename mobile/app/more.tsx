import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { exitApp } from '../utils/exitApp';
import { HOME_THEME as T } from '../components/home/theme';
import BottomNavigation from '../components/home/BottomNavigation';

export default function MoreScreen() {
  const router = useRouter();

  const handleExit = () => {
    Alert.alert('Sair do aplicativo', 'Deseja fechar o BodyTrack?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: exitApp },
    ]);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Mais</Text>
        <Text style={styles.subtitle}>Configurações e opções do app</Text>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          onPress={() => router.push('/company' as never)}
        >
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(199,162,90,0.15)' }]}>
            <Ionicons name="business-outline" size={22} color="#C7A25A" />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.cardTitle}>Empresa</Text>
            <Text style={styles.cardDesc}>Logo, endereço e telefone</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={T.textDisabled} />
        </Pressable>

        <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={handleExit}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,90,95,0.15)' }]}>
            <Ionicons name="log-out-outline" size={22} color={T.danger} />
          </View>
          <View style={styles.textWrap}>
            <Text style={[styles.cardTitle, { color: T.danger }]}>Sair</Text>
            <Text style={styles.cardDesc}>Fechar o aplicativo</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={T.textDisabled} />
        </Pressable>
      </View>
      <BottomNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  content: { flex: 1, padding: 20, paddingTop: 16 },
  title: { fontSize: 28, fontWeight: '700', color: T.text, marginBottom: 6 },
  subtitle: { fontSize: 15, color: T.textSecondary, marginBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 12,
    gap: 14,
  },
  pressed: { transform: [{ scale: 0.97 }] },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: T.text },
  cardDesc: { fontSize: 13, color: T.textSecondary, marginTop: 2 },
});
