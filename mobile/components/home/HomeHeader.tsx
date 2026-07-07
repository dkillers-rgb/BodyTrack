import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HOME_THEME as T } from './theme';

type Props = {
  userName: string;
  onNotificationPress?: () => void;
};

export default function HomeHeader({ userName, onNotificationPress }: Props) {
  const firstName = userName.split(' ')[0] || userName;

  return (
    <View style={styles.wrap}>
      <View style={styles.glow} />
      <View style={styles.topRow}>
        <View style={styles.logoRow}>
          <View style={styles.logoMark}>
            <Ionicons name="fitness-outline" size={20} color="#fff" />
          </View>
          <Text style={styles.logoText}>BodyTrack</Text>
        </View>
        <Pressable style={styles.bellBtn} onPress={onNotificationPress} hitSlop={10}>
          <Ionicons name="notifications-outline" size={22} color={T.text} />
          <View style={styles.bellDot} />
        </Pressable>
      </View>
      <Text style={styles.greeting}>Olá, {firstName}! 👋</Text>
      <Text style={styles.subtitle}>Gerencie seus clientes e avaliações</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 8,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(91,142,255,0.14)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: T.text,
    letterSpacing: -0.3,
  },
  bellBtn: { position: 'relative', padding: 4 },
  bellDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.primary,
    borderWidth: 1.5,
    borderColor: T.bg,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    color: T.text,
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: T.textSecondary,
  },
});
