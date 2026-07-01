import type { Router } from 'expo-router';
import type { OcrPreview } from '../services/types';

function toDateInputValue(value?: string): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function navigateToManualEntry(
  router: Router,
  preview?: OcrPreview,
  options?: { showHint?: boolean }
): void {
  const params: Record<string, string> = {};

  if (options?.showHint) {
    params.showHint = '1';
  }

  if (preview) {
    params.examDate = toDateInputValue(preview.preview.patient.examDate);
    const { weight, skeletalMuscle, bodyFat } = preview.preview.muscleFat;
    if (weight != null) params.weight = String(weight);
    if (skeletalMuscle != null) params.skeletalMuscle = String(skeletalMuscle);
    if (bodyFat != null) params.bodyFat = String(bodyFat);
    if (preview.imagePath) params.imagePath = preview.imagePath;
    if (preview.ocr.rawText) {
      params.rawOcrText = preview.ocr.rawText.slice(0, 4000);
    }
    if (!weight && !skeletalMuscle && !bodyFat) {
      params.showHint = '1';
    }
  }

  router.push({ pathname: '/manual-entry', params } as never);
}
