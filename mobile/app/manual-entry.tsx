import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ManualEvaluationForm } from '../components/ManualEvaluationForm';
import { clearScanDraft, getScanDraft } from '../services/scanDraft';

export default function ManualEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    examDate?: string;
    weight?: string;
    skeletalMuscle?: string;
    bodyFat?: string;
    visceralFat?: string;
    bodyAge?: string;
    imagePath?: string;
    rawOcrText?: string;
    showHint?: string;
    fromScan?: string;
  }>();

  const keepScanDraft = params.fromScan === '1';

  // build initial values from route params, falling back to transient scan draft
  const draft = keepScanDraft ? getScanDraft() : null;
  const initialValues = {
    examDate: params.examDate,
    weight: params.weight ?? (draft?.bodbodyReport?.section2?.weight?.value != null ? String(draft.bodbodyReport.section2.weight.value) : undefined),
    skeletalMuscle:
      params.skeletalMuscle ?? (draft?.bodbodyReport?.section2?.skeletalMuscle?.value != null ? String(draft.bodbodyReport.section2.skeletalMuscle.value) : undefined),
    bodyFat: params.bodyFat ?? (draft?.bodbodyReport?.section2?.bodyFat?.value != null ? String(draft.bodbodyReport.section2.bodyFat.value) : undefined),
    visceralFat: params.visceralFat ?? (draft?.bodbodyReport?.section2?.visceralFat?.value != null ? String(draft.bodbodyReport.section2.visceralFat.value) : undefined),
    bodyAge: params.bodyAge ?? (draft?.bodbodyReport?.section6?.bodyAge != null ? String(draft.bodbodyReport.section6.bodyAge) : undefined),
  } as Partial<Record<string, string>>;

  return (
    <ManualEvaluationForm
      initialValues={initialValues}
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
