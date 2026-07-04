import type { EvalStatus } from './bodbodyReportTypes';

export const REPORT_LABELS = {
  reportSubtitle: 'Análise de Composição Corporal',
  section1: 'Análise da Composição Corporal',
  moisture: 'Água Corporal',
  protein: 'Proteína',
  minerals: 'Minerais',
  bodyFat: 'Gordura Corporal',
  section2: 'Análise de Músculo e Gordura',
  weight: 'Peso',
  skeletalMuscle: 'Músculo Esquelético',
  section3: 'Análise de Sobrepeso',
  bmi: 'IMC',
  bodyFatPct: 'Percentual de Gordura',
  waistHip: 'Relação Cintura/Quadril',
  section4: 'Músculos Segmentares',
  section5: 'Avaliação Geral',
  section6: 'Controle de Peso',
  section7: 'Evolução — Últimas avaliações',
  fatControl: 'Controle de Gordura',
  muscleControl: 'Controle Muscular',
  zoneLow: 'Baixo',
  zoneNormal: 'Normal',
  zoneOver: 'Alto',
  evalUnder: 'Abaixo',
  evalNormal: 'Normal',
  evalOver: 'Acima',
  evalWeight: 'Peso',
  evalMuscle: 'Músculo',
  evalBodyFat: 'Gordura',
  evalObesity: 'Obesidade',
  targetWeight: 'Peso Alvo',
  weightControl: 'Controle de Peso',
  bmr: 'Taxa Metabólica Basal (TMB)',
  score: 'Pontuação Geral',
  leftArm: 'Braço E',
  rightArm: 'Braço D',
  trunk: 'Tronco',
  leftLeg: 'Perna E',
  rightLeg: 'Perna D',
  sideLeft: '(E)',
  sideRight: '(D)',
  chartWeight: 'Peso (kg)',
  chartMuscle: 'Massa Muscular Esquelética (kg)',
  chartFat: 'Percentual de Gordura Corporal (%)',
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
