import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ManualEvaluationForm } from '../components/ManualEvaluationForm';
import { clearScanDraft } from '../services/scanDraft';

export default function ManualEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    examDate?: string;
    weight?: string;
    skeletalMuscle?: string;
    bodyFat?: string;
    visceralFat?: string;
    imagePath?: string;
    rawOcrText?: string;
    showHint?: string;
    fromScan?: string;
  }>();

  const keepScanDraft = params.fromScan === '1';

  return (
    <ManualEvaluationForm
      initialValues={{
        examDate: params.examDate,
        weight: params.weight,
        skeletalMuscle: params.skeletalMuscle,
        bodyFat: params.bodyFat,
        visceralFat: params.visceralFat,
      }}
      showHint={params.showHint === '1'}
      keepScanDraft={keepScanDraft}
      imagePath={params.imagePath}
      rawOcrText={params.rawOcrText}
      onSaved={(clientId) => {
        Alert.alert('Sucesso', 'Avaliação salva com sucesso.', [
          { text: 'OK', onPress: () => router.replace(`/client/${clientId}` as never) },
        ]);
      }}
      onCancel={() => {
        clearScanDraft();
        router.back();
      }}
    />
  );
}
