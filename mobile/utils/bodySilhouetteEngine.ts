import type { BodbodyReportSnapshot } from '../services/bodbodyReportTypes';

export type BodyMetrics = {
  weight: number;
  heightCm: number;
  skeletalMuscle: number;
  bodyFatKg: number;
  bodyFatPct: number;
  bmi: number;
  segments: BodbodyReportSnapshot['section4'];
};

export type ShapeFactors = {
  shoulderW: number;
  waistW: number;
  hipW: number;
  armThickness: number;
  legThickness: number;
  torsoDepth: number;
  leftArmBias: number;
  rightArmBias: number;
  leftLegBias: number;
  rightLegBias: number;
};

export type BodyAnchors = {
  leftShoulder: { x: number; y: number };
  rightShoulder: { x: number; y: number };
  chestCenter: { x: number; y: number };
  leftThigh: { x: number; y: number };
  rightThigh: { x: number; y: number };
};

export type SilhouetteTheme = {
  stroke: string;
  text: string;
  pct: string;
  side: string;
};

export const SILHOUETTE_THEME_PRINT: SilhouetteTheme = {
  stroke: '#C7A25A',
  text: '#202124',
  pct: '#C7A25A',
  side: '#5F6368',
};

export const SILHOUETTE_THEME_SCREEN: SilhouetteTheme = {
  stroke: '#C7A25A',
  text: '#F5F5F5',
  pct: '#C7A25A',
  side: '#A8B5C4',
};

function mapRange(value: number, min: number, max: number, lo: number, hi: number): number {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  return lo + t * (hi - lo);
}

/** Extrai métricas do snapshot do relatório Bodbody */
export function metricsFromReport(report: BodbodyReportSnapshot, heightCm = 170): BodyMetrics {
  const weight = report.section2.weight.value;
  const skeletalMuscle = report.section2.skeletalMuscle.value;
  const bodyFatKg = report.section2.bodyFat.value;
  const bodyFatPct =
    report.section3.bodyFatPct.value || (weight > 0 ? (bodyFatKg / weight) * 100 : 0);
  const bmi = report.section3.bmi.value || (heightCm > 0 ? weight / (heightCm / 100) ** 2 : 22);

  return {
    weight,
    heightCm,
    skeletalMuscle,
    bodyFatKg,
    bodyFatPct,
    bmi,
    segments: report.section4,
  };
}

/** Calcula fatores de forma a partir dos dados de bioimpedância */
export function computeShapeFactors(m: BodyMetrics): ShapeFactors {
  const armMuscle = (m.segments.leftArm.muscle + m.segments.rightArm.muscle) / 2;
  const legMuscle = (m.segments.leftLeg.muscle + m.segments.rightLeg.muscle) / 2;
  const trunkMuscle = m.segments.trunk.muscle;
  const armFat = (m.segments.leftArm.fat + m.segments.rightArm.fat) / 2;
  const legFat = (m.segments.leftLeg.fat + m.segments.rightLeg.fat) / 2;
  const trunkFat = m.segments.trunk.fat;

  const shoulderW = mapRange(armMuscle + trunkMuscle * 0.12, 4.5, 8.5, 0.86, 1.18);
  const waistW = mapRange(m.bmi + trunkFat * 0.45, 22, 36, 0.84, 1.28);
  const hipW = mapRange(trunkFat + legFat * 0.35, 5, 18, 0.88, 1.22);
  const armThickness = mapRange(armMuscle + armFat * 0.55, 2.2, 4.2, 0.8, 1.32);
  const legThickness = mapRange(legMuscle + legFat * 0.45, 7, 12, 0.82, 1.28);
  const torsoDepth = mapRange(m.bodyFatPct, 12, 40, 0.88, 1.2);

  const leftArmBias = mapRange(
    m.segments.leftArm.muscle - m.segments.rightArm.muscle,
    -0.8,
    0.8,
    0.94,
    1.06
  );
  const rightArmBias = 2 - leftArmBias;
  const leftLegBias = mapRange(
    m.segments.leftLeg.muscle - m.segments.rightLeg.muscle,
    -1.2,
    1.2,
    0.94,
    1.06
  );
  const rightLegBias = 2 - leftLegBias;

  return {
    shoulderW,
    waistW,
    hipW,
    armThickness,
    legThickness,
    torsoDepth,
    leftArmBias,
    rightArmBias,
    leftLegBias,
    rightLegBias,
  };
}

/** Gera path SVG do contorno corporal (viewBox 0 0 220 520) */
export function buildBodyPath(f: ShapeFactors): string {
  const cx = 110;
  const shoulder = 50 * f.shoulderW;
  const waist = 28 * f.waistW;
  const hip = 34 * f.hipW;
  const armOut = 48 * f.armThickness;
  const armIn = 28 * f.armThickness;
  const legOut = 32 * f.legThickness;
  const legIn = 14 * f.legThickness;

  const L = {
    neck: 12,
    shoulderX: shoulder,
    handX: armOut + 8,
    waistX: waist,
    hipX: hip,
    legOutX: legOut,
    legInX: legIn,
  };

  const la = f.leftArmBias;
  const ra = f.rightArmBias;
  const ll = f.leftLegBias;
  const rl = f.rightLegBias;

  const lx = (v: number) => (cx - v).toFixed(1);
  const rx = (v: number) => (cx + v).toFixed(1);

  return [
    `M ${lx(L.neck)} 74`,
    `C ${lx(L.shoulderX * 0.55)} 78 ${lx(L.shoulderX * 0.85)} 88 ${lx(L.shoulderX)} 104`,
    `C ${lx(L.shoulderX + 8 * la)} 122 ${lx(L.handX * la)} 146 ${lx(L.handX * la + 2)} 172`,
    `C ${lx(L.handX * la + 4)} 198 ${lx(L.handX * la + 2)} 222 ${lx(L.handX * la - 4)} 242`,
    `C ${lx(L.handX * la - 6)} 252 ${lx(L.handX * la - 14)} 256 ${lx(L.handX * la - 20)} 252`,
    `C ${lx(armIn * la + 10)} 234 ${lx(armIn * la + 6)} 210 ${lx(armIn * la + 6)} 186`,
    `C ${lx(armIn * la + 6)} 162 ${lx(armIn * la + 10)} 140 ${lx(L.shoulderX * 0.55)} 122`,
    `C ${lx(L.waistX * 0.9)} 142 ${lx(L.waistX)} 168 ${lx(L.waistX * 0.95)} 196`,
    `C ${lx(L.hipX * 0.85)} 228 ${lx(L.hipX * 0.9)} 258 ${lx(L.hipX)} 286`,
    `C ${lx(L.legOutX * ll + 4)} 312 ${lx(L.legOutX * ll + 6)} 340 ${lx(L.legOutX * ll + 6)} 368`,
    `C ${lx(L.legOutX * ll + 6)} 396 ${lx(L.legOutX * ll + 4)} 424 ${lx(L.legOutX * ll)} 450`,
    `C ${lx(L.legOutX * ll - 2)} 462 ${lx(L.legOutX * ll - 6)} 470 ${lx(10)} 472`,
    `L ${lx(2)} 472`,
    `C ${lx(L.legInX * ll)} 444 ${lx(L.legInX * ll + 2)} 416 ${lx(L.legInX * ll + 2)} 388`,
    `C ${lx(L.legInX * ll + 2)} 360 ${lx(L.legInX * ll)} 332 ${lx(L.legInX * ll - 2)} 306`,
    `L ${rx(L.legInX * rl - 2)} 306`,
    `C ${rx(L.legInX * rl)} 332 ${rx(L.legInX * rl + 2)} 360 ${rx(L.legInX * rl + 2)} 388`,
    `C ${rx(L.legInX * rl + 2)} 416 ${rx(L.legInX * rl)} 444 ${rx(2)} 472`,
    `L ${rx(10)} 472`,
    `C ${rx(L.legOutX * rl - 6)} 470 ${rx(L.legOutX * rl - 2)} 462 ${rx(L.legOutX * rl)} 450`,
    `C ${rx(L.legOutX * rl + 4)} 424 ${rx(L.legOutX * rl + 6)} 396 ${rx(L.legOutX * rl + 6)} 368`,
    `C ${rx(L.legOutX * rl + 6)} 340 ${rx(L.legOutX * rl + 4)} 312 ${rx(L.hipX)} 286`,
    `C ${rx(L.hipX * 0.9)} 258 ${rx(L.hipX * 0.85)} 228 ${rx(L.waistX * 0.95)} 196`,
    `C ${rx(L.waistX)} 168 ${rx(L.waistX * 0.9)} 142 ${rx(L.shoulderX * 0.55)} 122`,
    `C ${rx(armIn * ra + 10)} 140 ${rx(armIn * ra + 6)} 162 ${rx(armIn * ra + 6)} 186`,
    `C ${rx(armIn * ra + 6)} 210 ${rx(armIn * ra + 10)} 234 ${rx(L.handX * ra - 20)} 252`,
    `C ${rx(L.handX * ra - 14)} 256 ${rx(L.handX * ra - 6)} 252 ${rx(L.handX * ra - 4)} 242`,
    `C ${rx(L.handX * ra + 2)} 222 ${rx(L.handX * ra + 4)} 198 ${rx(L.handX * ra + 2)} 172`,
    `C ${rx(L.handX * ra)} 146 ${rx(L.shoulderX + 8 * ra)} 122 ${rx(L.shoulderX)} 104`,
    `C ${rx(L.shoulderX * 0.85)} 88 ${rx(L.shoulderX * 0.55)} 78 ${rx(L.neck)} 74`,
    `C 118 72 114 72 110 72`,
    `C 106 72 102 72 ${lx(L.neck)} 74 Z`,
  ].join(' ');
}

export function computeAnchors(f: ShapeFactors): BodyAnchors {
  const cx = 110;
  const shoulder = 50 * f.shoulderW;
  const legOut = 24 * f.legThickness;
  return {
    leftShoulder: { x: cx - shoulder * 0.92, y: 128 },
    rightShoulder: { x: cx + shoulder * 0.92, y: 128 },
    chestCenter: { x: cx, y: 200 + (f.torsoDepth - 1) * 12 },
    leftThigh: { x: cx - legOut * 0.95, y: 348 },
    rightThigh: { x: cx + legOut * 0.95, y: 348 },
  };
}

export function computeHeadRadii(f: ShapeFactors): { rx: number; ry: number } {
  return {
    rx: 24 * (0.96 + (f.shoulderW - 1) * 0.15),
    ry: 30 * (0.98 + (f.torsoDepth - 1) * 0.08),
  };
}

/** Resultado completo do motor para um paciente */
export function buildSilhouetteGeometry(metrics: BodyMetrics) {
  const factors = computeShapeFactors(metrics);
  return {
    factors,
    path: buildBodyPath(factors),
    anchors: computeAnchors(factors),
    head: computeHeadRadii(factors),
  };
}
