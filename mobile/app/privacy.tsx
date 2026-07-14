import { ScrollView, Text, StyleSheet } from 'react-native';
import { HOME_THEME as T } from '../components/home/theme';
import { PRIVACY_POLICY_BODY, PRIVACY_POLICY_TITLE } from '../constants/legal';

export default function PrivacyScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{PRIVACY_POLICY_TITLE}</Text>
      <Text style={styles.body}>{PRIVACY_POLICY_BODY}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: T.text, marginBottom: 14 },
  body: { fontSize: 14, lineHeight: 22, color: T.textSecondary },
});
