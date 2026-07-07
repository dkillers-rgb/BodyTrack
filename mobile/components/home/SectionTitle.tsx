import { Text, StyleSheet } from 'react-native';
import { HOME_THEME as T } from './theme';

export default function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.title}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textDisabled,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 14,
    marginTop: 8,
  },
});
