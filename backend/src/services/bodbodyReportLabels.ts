import type { EvalStatus } from './bodbodyReportTypes';

export const REPORT_LABELS = {
  evalWeight: 'Peso',
  evalMuscle: 'Músculo',
  evalBodyFat: 'Gordura',
  evalObesity: 'Obesidade',
} as const;

const LABEL_PT_MAP: Record<string, string> = {
  Weight: REPORT_LABELS.evalWeight,
  Muscle: REPORT_LABELS.evalMuscle,
  'Body Fat': REPORT_LABELS.evalBodyFat,
  Obesity: REPORT_LABELS.evalObesity,
  Peso: REPORT_LABELS.evalWeight,
  Músculo: REPORT_LABELS.evalMuscle,
  'Músculo esquelético': REPORT_LABELS.evalMuscle,
  Gordura: REPORT_LABELS.evalBodyFat,
  'Gordura corporal (%)': REPORT_LABELS.evalBodyFat,
  Obesidade: REPORT_LABELS.evalObesity,
  IMC: REPORT_LABELS.evalObesity,
};

export function translateEvalLabel(label: string): string {
  return LABEL_PT_MAP[label] ?? label;
}

export function translateSection5(
  rows: Array<{ label: string; status: EvalStatus }>
): Array<{ label: string; status: EvalStatus }> {
  return rows.map((row) => ({ ...row, label: translateEvalLabel(row.label) }));
}
