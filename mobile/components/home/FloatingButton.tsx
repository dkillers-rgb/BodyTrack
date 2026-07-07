import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HOME_THEME as T } from './theme';

type Props = {
  onPress: () => void;
  label?: string;
};

export default function FloatingButton({ onPress, label = 'Nova Avaliação' }: Props) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable style={({ pressed }) => [styles.fab, pressed && styles.pressed]} onPress={onPress}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 20,
    bottom: 8,
    alignItems: 'center',
    zIndex: 20,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  pressed: { transform: [{ scale: 0.97 }] },
  label: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: T.primary,
  },
});
