export type EvalStatus = 'under' | 'normal' | 'over';

export interface RangeValue {
  value: number;
  low: number;
  high: number;
}

export interface SegmentPart {
  muscle: number;
  fat: number;
  musclePercent: number;
}

export interface BodbodyReportSnapshot {
  patientId?: string;
  examDate: string;
  examTime?: string;
  section1: {
    moisture: RangeValue;
    protein: RangeValue;
    minerals: RangeValue;
    bodyFat: RangeValue;
  };
  section2: {
    weight: RangeValue;
    skeletalMuscle: RangeValue;
    bodyFat: RangeValue;
    visceralFat: RangeValue;
  };
  section3: {
    bmi: RangeValue;
    bodyFatPct: RangeValue;
    waistHip: RangeValue;
  };
  section4: {
    leftArm: SegmentPart;
    rightArm: SegmentPart;
    trunk: SegmentPart;
    leftLeg: SegmentPart;
    rightLeg: SegmentPart;
  };
  section5: Array<{ label: string; status: EvalStatus }>;
  section6: {
    targetWeight: number;
    weightControl: number;
    basalMetabolism: number;
    comprehensiveScore: number;
    bodyAge?: number;
  };
}

export const SECTION_COLORS = {
  header: '#263238',
  s1: '#43A047',
  s2: '#26A69A',
  s3: '#1E88E5',
  s4: '#7B1FA2',
  s5: '#795548',
  s6: '#EC407A',
  s7: '#37474F',
  zoneLow: '#BDBDBD',
  zoneNormal: '#A5D6A7',
  zoneOver: '#FFCC80',
  gaugeLow: '#64B5F6',
  gaugeMid: '#81C784',
  gaugeHigh: '#EF5350',
} as const;
