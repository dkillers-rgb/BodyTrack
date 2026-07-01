import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ManualEvaluationForm } from '../components/ManualEvaluationForm';

export default function ManualEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    examDate?: string;
    weight?: string;
    skeletalMuscle?: string;
    bodyFat?: string;
    imagePath?: string;
    rawOcrText?: string;
    showHint?: string;
  }>();

  return (
    <ManualEvaluationForm
      initialValues={{
        examDate: params.examDate,
        weight: params.weight,
        skeletalMuscle: params.skeletalMuscle,
        bodyFat: params.bodyFat,
      }}
      showHint={params.showHint === '1'}
      imagePath={params.imagePath}
      rawOcrText={params.rawOcrText}
      onSaved={(clientId) => {
        Alert.alert('Sucesso', 'Avaliação salva com sucesso.', [
          { text: 'OK', onPress: () => router.replace(`/client/${clientId}` as never) },
        ]);
      }}
      onCancel={() => router.back()}
    />
  );
}
