import { Text, StyleSheet, type TextStyle } from 'react-native';
import { MEDICAL_DISCLAIMER_SHORT } from '../constants/legal';

type Props = {
  style?: TextStyle;
};

/** Aviso médico discreto e pequeno (relatórios / rodapé). */
export function MedicalDisclaimer({ style }: Props) {
  return <Text style={[styles.text, style]}>{MEDICAL_DISCLAIMER_SHORT}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 9,
    lineHeight: 12,
    color: 'rgba(148,163,184,0.75)',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 8,
  },
});
