import type { BodbodyReportSnapshot } from './bodbodyReportTypes';

export interface ScanDraft {
  rawCodeValue?: string;
  bodbodyReport?: BodbodyReportSnapshot;
}

let draft: ScanDraft | null = null;

export function setScanDraft(data: ScanDraft): void {
  draft = data;
}

export function getScanDraft(): ScanDraft | null {
  return draft;
}

export function clearScanDraft(): void {
  draft = null;
}
