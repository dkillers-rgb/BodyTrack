import type { BodbodyReportSnapshot } from '../types/bodbodyReportTypes';

const STORAGE_KEY = 'bodytrack_scan_draft';

export interface ScanDraft {
  rawCodeValue?: string;
  bodbodyReport?: BodbodyReportSnapshot;
  imagePath?: string;
  rawOcrText?: string;
  initialValues?: {
    examDate?: string;
    weight?: string;
    skeletalMuscle?: string;
    bodyFat?: string;
    visceralFat?: string;
  };
  showHint?: boolean;
}

export function setScanDraft(data: ScanDraft): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getScanDraft(): ScanDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ScanDraft) : null;
  } catch {
    return null;
  }
}

export function clearScanDraft(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
