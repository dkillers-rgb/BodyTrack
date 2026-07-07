import type { BodbodyReportSnapshot, EvalStatus, SegmentPart } from './bodbodyReportTypes';
import { REPORT_LABELS, translateSection5 } from './bodbodyReportLabels';

type ReportClient = {
  id: number;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  age: number;
  height: number;
};

const I = {
  MOISTURE: 6,
  MOISTURE_LOW: 7,
  MOISTURE_HIGH: 8,
  PROTEIN: 9,
  PROTEIN_LOW: 10,
  PROTEIN_HIGH: 11,
  MINERALS: 12,
  MINERALS_LOW: 13,
  MINERALS_HIGH: 14,
  MUSCLE_FAT_BODY_FAT: 15,
  BF_KG_LOW: 16,
  BF_KG_HIGH: 17,
  WEIGHT: 18,
  WT_LOW: 19,
  WT_HIGH: 20,
  SKELETAL_MUSCLE: 21,
  SM_LOW: 22,
  SM_HIGH: 23,
  BMI: 25,
  BODY_FAT_PCT: 26,
  BF_PCT_HIGH: 27,
  SEG_LA_M: 38,
  SEG_LA_F: 39,
  SEG_RA_M: 40,
  SEG_RA_F: 41,
  SEG_LL_M: 42,
  SEG_LL_F: 43,
  SEG_RL_M: 44,
  SEG_RL_F: 45,
  SEG_TRUNK_M: 46,
  SEG_TRUNK_F: 47,
  WEIGHT_CONTROL: 49,
  BMR: 52,
  HEALTH_SCORE: 53,
  VISCERAL_FAT_INDEX: 37,
  EXAM_DATETIME: 5,
} as const;

const VISCERAL_LOW = 5;
const VISCERAL_HIGH = 9;

function visceralFatRv(value: number) {
  return rv(value, VISCERAL_LOW, VISCERAL_HIGH);
}

function ensureSection2VisceralFat(
  section2: BodbodyReportSnapshot['section2'],
  fallback = 0
): BodbodyReportSnapshot['section2'] {
  if (section2.visceralFat) return section2;
  return { ...section2, visceralFat: visceralFatRv(fallback) };
}

const SEGMENT_PCT_FACTOR = {
  leftArm: 1.719,
  rightArm: 1.719,
  trunk: 0.231,
  leftLeg: 0.751,
  rightLeg: 0.735,
} as const;

type SegmentKey = keyof typeof SEGMENT_PCT_FACTOR;

function calcMusclePercent(muscle: number, skeletalMuscle: number, segment: SegmentKey): number {
  if (skeletalMuscle <= 0) return 0;
  return Math.round(((muscle / skeletalMuscle) * 100 * SEGMENT_PCT_FACTOR[segment]) * 10) / 10;
}

function segPart(muscle: number, fat: number, skeletalMuscle: number, segment: SegmentKey): SegmentPart {
  return { muscle, fat, musclePercent: calcMusclePercent(muscle, skeletalMuscle, segment) };
}

function toNumber(value: unknown): number | undefined {
  const n = parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function rv(value: number, low: number, high: number) {
  return { value, low, high };
}

function parseValues(codeValue: unknown): unknown[] {
  if (typeof codeValue === 'string') return JSON.parse(codeValue) as unknown[];
  if (Array.isArray(codeValue)) return codeValue;
  throw new Error('codeValue inválido');
}

function parseExamDateTime(raw: unknown): { date: string; time?: string } {
  const text = String(raw ?? '');
  const match = text.match(/(\d{2}:\d{2})\s+(\d{4})\.(\d{2})\.(\d{2})/);
  if (!match) return { date: new Date().toISOString().slice(0, 10) };
  return { time: match[1], date: `${match[2]}-${match[3]}-${match[4]}` };
}

function evalStatus(value: number, low: number, high: number): EvalStatus {
  if (value < low) return 'under';
  if (value > high) return 'over';
  return 'normal';
}

function mapOldStatus(status: string): EvalStatus {
  if (status === 'insufficient') return 'under';
  if (status === 'excessive') return 'over';
  if (status === 'under' || status === 'over' || status === 'normal') return status;
  return 'normal';
}

function pickStatus(rows: Array<{ label: string; status: string }> | undefined, patterns: string[]): EvalStatus {
  const row = rows?.find((r) => patterns.some((p) => r.label.toLowerCase().includes(p)));
  return row ? mapOldStatus(row.status) : 'normal';
}

export function normalizeBodbodyReport(raw: unknown): BodbodyReportSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  if (Array.isArray(r.section5) && r.section6 && typeof r.section6 === 'object' && !Array.isArray(r.section6)) {
    const snapshot = raw as BodbodyReportSnapshot;
    const s4 = snapshot.section4;
    const section5 = translateSection5(snapshot.section5);
    if ('musclePercent' in s4.leftArm) {
      return {
        ...snapshot,
        section2: ensureSection2VisceralFat(snapshot.section2),
        section5,
      };
    }
    const sm = snapshot.section2.skeletalMuscle.value;
    const fixSeg = (part: { muscle: number; fat: number }, segment: SegmentKey): SegmentPart =>
      segPart(part.muscle, part.fat, sm, segment);
    return {
      ...snapshot,
      section2: ensureSection2VisceralFat(snapshot.section2),
      section4: {
        leftArm: fixSeg(s4.leftArm, 'leftArm'),
        rightArm: fixSeg(s4.rightArm, 'rightArm'),
        trunk: fixSeg(s4.trunk, 'trunk'),
        leftLeg: fixSeg(s4.leftLeg, 'leftLeg'),
        rightLeg: fixSeg(s4.rightLeg, 'rightLeg'),
      },
      section5,
    };
  }

  if (r.section5 && typeof r.section5 === 'object' && 'activeTypeIndex' in (r.section5 as object)) {
    const old6 = r.section6 as Array<{ label: string; status: string }> | undefined;
    const old7 = r.section7 as Record<string, number> | undefined;
    const section5: BodbodyReportSnapshot['section5'] = [
      { label: REPORT_LABELS.evalWeight, status: pickStatus(old6, ['peso', 'weight']) },
      { label: REPORT_LABELS.evalMuscle, status: pickStatus(old6, ['músculo', 'muscle', 'skeletal']) },
      { label: REPORT_LABELS.evalBodyFat, status: pickStatus(old6, ['gordura corporal', 'body fat', 'gordura']) },
      { label: REPORT_LABELS.evalObesity, status: pickStatus(old6, ['obesidade', 'obesity', 'imc']) },
    ];

    const s4 = r.section4 as BodbodyReportSnapshot['section4'];
    const sm = (r.section2 as BodbodyReportSnapshot['section2']).skeletalMuscle.value;
    const fixSeg = (part: { muscle: number; fat: number }, segment: SegmentKey): SegmentPart =>
      'musclePercent' in part ? (part as SegmentPart) : segPart(part.muscle, part.fat, sm, segment);

    return {
      ...(r as BodbodyReportSnapshot),
      section2: ensureSection2VisceralFat((r.section2 as BodbodyReportSnapshot['section2'])),
      section3: {
        bmi: (r.section3 as BodbodyReportSnapshot['section3']).bmi,
        bodyFatPct: (r.section3 as BodbodyReportSnapshot['section3']).bodyFatPct,
        waistHip: (r.section3 as BodbodyReportSnapshot['section3']).waistHip,
      },
      section4: {
        leftArm: fixSeg(s4.leftArm, 'leftArm'),
        rightArm: fixSeg(s4.rightArm, 'rightArm'),
        trunk: fixSeg(s4.trunk, 'trunk'),
        leftLeg: fixSeg(s4.leftLeg, 'leftLeg'),
        rightLeg: fixSeg(s4.rightLeg, 'rightLeg'),
      },
      section5,
      section6: {
        targetWeight: old7?.targetWeight ?? 0,
        weightControl: old7?.weightControl ?? 0,
        basalMetabolism: old7?.basalMetabolism ?? 0,
        comprehensiveScore: old7?.healthScore ?? old7?.comprehensiveScore ?? 75,
      },
    };
  }

  return null;
}

function defaultRanges(weight: number, heightCm: number, gender: ReportClient['gender']) {
  const h = heightCm / 100;
  const idealWeight = 22 * h * h;
  const wtLow = idealWeight * 0.85;
  const wtHigh = idealWeight * 1.15;
  const smLow = gender === 'FEMALE' ? 18 : 22;
  const smHigh = gender === 'FEMALE' ? 24 : 28;
  const bfKgLow = weight * 0.12;
  const bfKgHigh = weight * (gender === 'FEMALE' ? 0.28 : 0.22);
  const bfPctLow = gender === 'FEMALE' ? 18.5 : 12;
  const bfPctHigh = gender === 'FEMALE' ? 26.7 : 20;
  return { wtLow, wtHigh, smLow, smHigh, bfKgLow, bfKgHigh, bmiLow: 18, bmiHigh: 24, bfPctLow, bfPctHigh };
}

function buildComprehensive(
  weight: number,
  skeletalMuscle: number,
  bodyFatPct: number,
  bmi: number,
  wtLow: number,
  wtHigh: number,
  smLow: number,
  smHigh: number,
  bfPctLow: number,
  bfPctHigh: number
): BodbodyReportSnapshot['section5'] {
  const obesityStatus: EvalStatus = bmi < 18.5 ? 'under' : bmi >= 25 ? 'over' : 'normal';
  return [
    { label: REPORT_LABELS.evalWeight, status: evalStatus(weight, wtLow, wtHigh) },
    { label: REPORT_LABELS.evalMuscle, status: evalStatus(skeletalMuscle, smLow, smHigh) },
    { label: REPORT_LABELS.evalBodyFat, status: evalStatus(bodyFatPct, bfPctLow, bfPctHigh) },
    { label: REPORT_LABELS.evalObesity, status: obesityStatus },
  ];
}

export function mapCodeValueToBodbodyReport(codeValue: unknown): BodbodyReportSnapshot {
  const v = parseValues(codeValue);
  const exam = parseExamDateTime(v[I.EXAM_DATETIME]);

  const weight = toNumber(v[I.WEIGHT]) ?? 0;
  const skeletalMuscle = toNumber(v[I.SKELETAL_MUSCLE]) ?? 0;
  const bodyFatKg = toNumber(v[I.MUSCLE_FAT_BODY_FAT]) ?? 0;
  const visceralFat = toNumber(v[I.VISCERAL_FAT_INDEX]) ?? 0;
  const bmi = toNumber(v[I.BMI]) ?? 0;
  const bodyFatPct = toNumber(v[I.BODY_FAT_PCT]) ?? (weight > 0 ? (bodyFatKg / weight) * 100 : 0);

  const smLow = toNumber(v[I.SM_LOW]) ?? skeletalMuscle * 0.9;
  const smHigh = toNumber(v[I.SM_HIGH]) ?? skeletalMuscle * 1.1;
  const wtLow = toNumber(v[I.WT_LOW]) ?? weight * 0.85;
  const wtHigh = toNumber(v[I.WT_HIGH]) ?? weight * 1.15;
  const bfLow = toNumber(v[I.BF_KG_LOW]) ?? bodyFatKg * 0.7;
  const bfHigh = toNumber(v[I.BF_KG_HIGH]) ?? bodyFatKg * 1.2;
  const bmiLow = 18.5;
  const bmiHigh = 25;
  const bfPctLow = 10;
  const bfPctHigh = toNumber(v[I.BF_PCT_HIGH]) ?? 20;

  const moisture = toNumber(v[I.MOISTURE]) ?? weight * 0.45;
  const protein = toNumber(v[I.PROTEIN]) ?? weight * 0.12;
  const minerals = toNumber(v[I.MINERALS]) ?? weight * 0.04;
  const compFat = toNumber(v[I.BF_KG_HIGH]) ?? bodyFatKg;
  const waistHip = 0.85;
  const weightControl = toNumber(v[I.WEIGHT_CONTROL]) ?? 0;
  const targetWeight = Math.round((weight + weightControl) * 10) / 10;

  return {
    examDate: exam.date,
    examTime: exam.time,
    section1: {
      moisture: rv(moisture, toNumber(v[I.MOISTURE_LOW]) ?? moisture * 0.9, toNumber(v[I.MOISTURE_HIGH]) ?? moisture * 1.1),
      protein: rv(protein, toNumber(v[I.PROTEIN_LOW]) ?? protein * 0.9, toNumber(v[I.PROTEIN_HIGH]) ?? protein * 1.1),
      minerals: rv(minerals, toNumber(v[I.MINERALS_LOW]) ?? minerals * 0.9, toNumber(v[I.MINERALS_HIGH]) ?? minerals * 1.1),
      bodyFat: rv(compFat, bfLow, bfHigh),
    },
    section2: {
      weight: rv(weight, wtLow, wtHigh),
      skeletalMuscle: rv(skeletalMuscle, smLow, smHigh),
      bodyFat: rv(bodyFatKg, bfLow, bfHigh),
      visceralFat: visceralFatRv(visceralFat),
    },
    section3: {
      bmi: rv(bmi, bmiLow, bmiHigh),
      bodyFatPct: rv(bodyFatPct, bfPctLow, bfPctHigh),
      waistHip: rv(waistHip, 0.75, 0.85),
    },
    section4: {
      leftArm: segPart(toNumber(v[I.SEG_LA_M]) ?? skeletalMuscle * 0.1, toNumber(v[I.SEG_LA_F]) ?? bodyFatKg * 0.08, skeletalMuscle, 'leftArm'),
      rightArm: segPart(toNumber(v[I.SEG_RA_M]) ?? skeletalMuscle * 0.1, toNumber(v[I.SEG_RA_F]) ?? bodyFatKg * 0.08, skeletalMuscle, 'rightArm'),
      trunk: segPart(toNumber(v[I.SEG_TRUNK_M]) ?? skeletalMuscle * 0.45, toNumber(v[I.SEG_TRUNK_F]) ?? bodyFatKg * 0.5, skeletalMuscle, 'trunk'),
      leftLeg: segPart(toNumber(v[I.SEG_LL_M]) ?? skeletalMuscle * 0.22, toNumber(v[I.SEG_LL_F]) ?? bodyFatKg * 0.18, skeletalMuscle, 'leftLeg'),
      rightLeg: segPart(toNumber(v[I.SEG_RL_M]) ?? skeletalMuscle * 0.22, toNumber(v[I.SEG_RL_F]) ?? bodyFatKg * 0.18, skeletalMuscle, 'rightLeg'),
    },
    section5: buildComprehensive(weight, skeletalMuscle, bodyFatPct, bmi, wtLow, wtHigh, smLow, smHigh, bfPctLow, bfPctHigh),
    section6: {
      targetWeight,
      weightControl,
      basalMetabolism: toNumber(v[I.BMR]) ?? Math.round(500 + 22 * weight),
      comprehensiveScore: toNumber(v[I.HEALTH_SCORE]) ?? 75,
    },
  };
}

export function buildBodbodyReportFromEvaluation(
  client: ReportClient,
  evaluation: {
    examDate: string;
    weight: number;
    skeletalMuscle: number;
    bodyFat: number;
    visceralFat?: number;
  },
  rawReportJson?: string
): BodbodyReportSnapshot {
  if (rawReportJson) {
    try {
      const parsed = JSON.parse(rawReportJson) as unknown;
      const normalized = normalizeBodbodyReport(parsed);
      if (normalized) {
        return {
          ...normalized,
          section2: ensureSection2VisceralFat(
            normalized.section2,
            evaluation.visceralFat ?? normalized.section2.visceralFat?.value ?? 0
          ),
        };
      }
      if (parsed && typeof parsed === 'object' && 'section2' in parsed) {
        const snapshot = parsed as BodbodyReportSnapshot;
        return {
          ...snapshot,
          section2: ensureSection2VisceralFat(
            snapshot.section2,
            evaluation.visceralFat ?? snapshot.section2.visceralFat?.value ?? 0
          ),
        };
      }
      const fromCode = mapCodeValueToBodbodyReport(parsed);
      return {
        ...fromCode,
        section2: ensureSection2VisceralFat(
          fromCode.section2,
          evaluation.visceralFat ?? fromCode.section2.visceralFat.value
        ),
      };
    } catch {
      /* fallback */
    }
  }

  const { weight, skeletalMuscle, bodyFat, visceralFat } = evaluation;
  const ranges = defaultRanges(weight, client.height, client.gender);
  const bodyFatPct = weight > 0 ? (bodyFat / weight) * 100 : 0;
  const bmi = client.height > 0 ? weight / (client.height / 100) ** 2 : 0;
  const examDate = evaluation.examDate.split('T')[0];

  return {
    examDate,
    section1: {
      moisture: rv(weight * 0.45, weight * 0.38, weight * 0.52),
      protein: rv(weight * 0.12, weight * 0.1, weight * 0.14),
      minerals: rv(weight * 0.04, weight * 0.035, weight * 0.045),
      bodyFat: rv(bodyFat, ranges.bfKgLow, ranges.bfKgHigh),
    },
    section2: {
      weight: rv(weight, ranges.wtLow, ranges.wtHigh),
      skeletalMuscle: rv(skeletalMuscle, ranges.smLow, ranges.smHigh),
      bodyFat: rv(bodyFat, ranges.bfKgLow, ranges.bfKgHigh),
      visceralFat: visceralFatRv(visceralFat ?? 0),
    },
    section3: {
      bmi: rv(bmi, 18.5, 25),
      bodyFatPct: rv(bodyFatPct, 10, 20),
      waistHip: rv(0.85, 0.75, 0.85),
    },
    section4: {
      leftArm: segPart(skeletalMuscle * 0.1, bodyFat * 0.08, skeletalMuscle, 'leftArm'),
      rightArm: segPart(skeletalMuscle * 0.1, bodyFat * 0.08, skeletalMuscle, 'rightArm'),
      trunk: segPart(skeletalMuscle * 0.45, bodyFat * 0.5, skeletalMuscle, 'trunk'),
      leftLeg: segPart(skeletalMuscle * 0.22, bodyFat * 0.18, skeletalMuscle, 'leftLeg'),
      rightLeg: segPart(skeletalMuscle * 0.22, bodyFat * 0.18, skeletalMuscle, 'rightLeg'),
    },
    section5: buildComprehensive(weight, skeletalMuscle, bodyFatPct, bmi, ranges.wtLow, ranges.wtHigh, ranges.smLow, ranges.smHigh, 10, 20),
    section6: {
      targetWeight: Math.round(weight * 0.92 * 10) / 10,
      weightControl: Math.round((weight * 0.92 - weight) * 10) / 10,
      basalMetabolism: Math.round(500 + 22 * weight),
      comprehensiveScore: 75,
    },
  };
}
