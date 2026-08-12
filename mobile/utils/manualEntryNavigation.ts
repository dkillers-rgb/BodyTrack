import type { Router } from 'expo-router';
import type { OcrPreview } from '../services/types';
import { getScanDraft } from '../services/scanDraft';
import { findNamedNumeric } from '../services/tcyReportMapper';

function toDateInputValue(value?: string): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function navigateToManualEntry(
  router: Router,
  preview?: OcrPreview,
  options?: { showHint?: boolean; fromScan?: boolean }
): void {
  const params: Record<string, string> = {};

  if (options?.showHint) {
    params.showHint = '1';
  }
  if (options?.fromScan || preview) {
    params.fromScan = '1';
  }

  if (preview) {
    params.examDate = toDateInputValue(preview.preview.patient.examDate);
    const { weight, skeletalMuscle, bodyFat, visceralFat } = preview.preview.muscleFat;
    if (weight != null) params.weight = String(weight);
    if (skeletalMuscle != null) params.skeletalMuscle = String(skeletalMuscle);
    if (bodyFat != null) params.bodyFat = String(bodyFat);
    if (visceralFat != null) params.visceralFat = String(visceralFat);
    if (preview.imagePath) params.imagePath = preview.imagePath;
    if (preview.ocr.rawText) {
      params.rawOcrText = preview.ocr.rawText.slice(0, 4000);
    }
    // If preview contains bodbodyReport with bodyAge, pass it so ManualEvaluationForm can prefill
    let maybeBodyAge = (preview as any).bodbodyReport?.section6?.bodyAge ?? (preview as any).bodyAge;
    // If preview didn't include bodyAge, try to read the transient scan draft (set by report fetch)
    if (maybeBodyAge == null) {
      try {
        const draft = getScanDraft();
        if (draft) {
          maybeBodyAge = draft.bodbodyReport?.section6?.bodyAge ?? findNamedNumeric(draft.rawCodeValue ?? '', ['Body Age', 'BodyAge', 'Idade', 'Age', 'idade', 'idade corporal', 'body_age', 'idade_corporal']);
          // also pull muscle/fat values from draft if preview misses them
          if (!params.weight && draft.bodbodyReport?.section2?.weight?.value != null) params.weight = String(draft.bodbodyReport.section2.weight.value);
          if (!params.skeletalMuscle && draft.bodbodyReport?.section2?.skeletalMuscle?.value != null) params.skeletalMuscle = String(draft.bodbodyReport.section2.skeletalMuscle.value);
          if (!params.bodyFat && draft.bodbodyReport?.section2?.bodyFat?.value != null) params.bodyFat = String(draft.bodbodyReport.section2.bodyFat.value);
        }
      } catch {
        // ignore
      }
    }
    if (maybeBodyAge != null) params.bodyAge = String(maybeBodyAge);
    if (!weight && !skeletalMuscle && !bodyFat) {
      params.showHint = '1';
    }
  }

  router.push({ pathname: '/manual-entry', params } as never);
}
