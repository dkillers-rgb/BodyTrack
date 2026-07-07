import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HOME_THEME as T } from './theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  value: number | string;
  label: string;
  subtitle: string;
  iconColor?: string;
  iconBg?: string;
};

export default function StatisticCard({
  icon,
  value,
  label,
  subtitle,
  iconColor = T.primary,
  iconBg = 'rgba(91,142,255,0.15)',
}: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: T.card,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  pressed: { transform: [{ scale: 0.97 }] },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: T.text,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: T.text,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    color: T.textSecondary,
    marginTop: 2,
  },
});
