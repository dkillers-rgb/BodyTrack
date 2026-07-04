import type { BodbodyReportSnapshot } from '../services/bodbodyReportTypes';
import { REPORT_LABELS } from '../services/bodbodyReportLabels';
import {
  buildSilhouetteGeometry,
  metricsFromReport,
  SILHOUETTE_THEME_PRINT,
  SILHOUETTE_THEME_SCREEN,
  type BodyMetrics,
  type SilhouetteTheme,
} from './bodySilhouetteEngine';

export {
  buildSilhouetteGeometry,
  metricsFromReport,
  SILHOUETTE_THEME_PRINT,
  SILHOUETTE_THEME_SCREEN,
  type BodyMetrics,
  type SilhouetteTheme,
} from './bodySilhouetteEngine';

/** Aliases para compatibilidade com componentes de tela/impressão */
export const SEGMENT_THEME = SILHOUETTE_THEME_PRINT;

const SEGMENT_PCT_FACTOR = {
  leftArm: 1.719,
  rightArm: 1.719,
  trunk: 0.231,
  leftLeg: 0.751,
  rightLeg: 0.735,
} as const;

type SegmentKey = keyof typeof SEGMENT_PCT_FACTOR;

export function calcSegmentMusclePercent(
  muscle: number,
  skeletalMuscle: number,
  segment: SegmentKey
): number {
  if (skeletalMuscle <= 0) return 0;
  return Math.round(((muscle / skeletalMuscle) * 100 * SEGMENT_PCT_FACTOR[segment]) * 10) / 10;
}

export function fmtSegmentKg(n: number): string {
  return `${n.toFixed(1)} kg`;
}

export function fmtSegmentPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function label(
  x: number,
  y: number,
  kg: string,
  pct: string,
  theme: SilhouetteTheme,
  side?: string
): string {
  return `
    <text x="${x}" y="${y}" font-size="10" font-weight="700" fill="${theme.text}" text-anchor="middle">${kg}</text>
    <text x="${x}" y="${y + 14}" font-size="10" font-weight="600" fill="${theme.pct}" text-anchor="middle">${pct}</text>
    ${side ? `<text x="${x}" y="${y + 28}" font-size="9" fill="${theme.side}" text-anchor="middle">${side}</text>` : ''}`;
}

/**
 * SVG dos músculos segmentares com silhueta gerada pelo motor
 * a partir dos dados reais de bioimpedância do paciente.
 */
export function buildSegmentSvgMarkup(
  report: BodbodyReportSnapshot,
  heightCm = 170,
  options?: {
    theme?: SilhouetteTheme;
    compact?: boolean;
    fillPage?: boolean;
  }
): string {
  const theme = options?.theme ?? SILHOUETTE_THEME_PRINT;
  const compact = options?.compact ?? false;
  const fillPage = options?.fillPage ?? false;

  const metrics = metricsFromReport(report, heightCm);
  const { path, anchors, head } = buildSilhouetteGeometry(metrics);
  const s = report.section4;
  const sm = report.section2.skeletalMuscle.value;

  const pctOf = (muscle: number, key: SegmentKey) =>
    fmtSegmentPct(calcSegmentMusclePercent(muscle, sm, key));

  const h = fillPage ? null : compact ? 160 : 280;
  const heightAttr = h != null ? `height="${h}"` : 'height="100%"';
  const stroke = theme.stroke;

  const a = anchors;
  const labelLeftArm = { x: 28, y: 100 };
  const labelRightArm = { x: 192, y: 100 };
  const labelLeftLeg = { x: 28, y: 340 };
  const labelRightLeg = { x: 192, y: 340 };
  const labelTrunk = { x: a.chestCenter.x, y: a.chestCenter.y + 18 };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 520" width="100%" ${heightAttr} class="seg-body-svg${fillPage ? ' seg-body-svg-fill' : ''}" preserveAspectRatio="xMidYMid meet">
  <g id="Head">
    <ellipse cx="110" cy="42" rx="${head.rx.toFixed(1)}" ry="${head.ry.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g id="Torso">
    <path d="${path}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g id="Anchors">
    <circle cx="${a.leftShoulder.x.toFixed(1)}" cy="${a.leftShoulder.y.toFixed(1)}" r="4" fill="${stroke}"/>
    <circle cx="${a.rightShoulder.x.toFixed(1)}" cy="${a.rightShoulder.y.toFixed(1)}" r="4" fill="${stroke}"/>
    <circle cx="${a.chestCenter.x.toFixed(1)}" cy="${a.chestCenter.y.toFixed(1)}" r="4" fill="${stroke}"/>
    <circle cx="${a.leftThigh.x.toFixed(1)}" cy="${a.leftThigh.y.toFixed(1)}" r="4" fill="${stroke}"/>
    <circle cx="${a.rightThigh.x.toFixed(1)}" cy="${a.rightThigh.y.toFixed(1)}" r="4" fill="${stroke}"/>
  </g>
  <g id="Callouts" fill="none" stroke="${stroke}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" opacity="0.85">
    <path d="M ${labelLeftArm.x} ${labelLeftArm.y} L ${(a.leftShoulder.x - 14).toFixed(1)} ${labelLeftArm.y} L ${a.leftShoulder.x.toFixed(1)} ${a.leftShoulder.y.toFixed(1)}"/>
    <path d="M ${labelRightArm.x} ${labelRightArm.y} L ${(a.rightShoulder.x + 14).toFixed(1)} ${labelRightArm.y} L ${a.rightShoulder.x.toFixed(1)} ${a.rightShoulder.y.toFixed(1)}"/>
    <path d="M ${labelLeftLeg.x} ${labelLeftLeg.y} L ${(a.leftThigh.x - 12).toFixed(1)} ${labelLeftLeg.y} L ${a.leftThigh.x.toFixed(1)} ${a.leftThigh.y.toFixed(1)}"/>
    <path d="M ${labelRightLeg.x} ${labelRightLeg.y} L ${(a.rightThigh.x + 12).toFixed(1)} ${labelRightLeg.y} L ${a.rightThigh.x.toFixed(1)} ${a.rightThigh.y.toFixed(1)}"/>
  </g>
  ${label(labelLeftArm.x, labelLeftArm.y - 8, fmtSegmentKg(s.leftArm.muscle), pctOf(s.leftArm.muscle, 'leftArm'), theme, REPORT_LABELS.sideLeft)}
  ${label(labelRightArm.x, labelRightArm.y - 8, fmtSegmentKg(s.rightArm.muscle), pctOf(s.rightArm.muscle, 'rightArm'), theme, REPORT_LABELS.sideRight)}
  ${label(labelTrunk.x, labelTrunk.y, fmtSegmentKg(s.trunk.muscle), pctOf(s.trunk.muscle, 'trunk'), theme)}
  ${label(labelLeftLeg.x, labelLeftLeg.y - 8, fmtSegmentKg(s.leftLeg.muscle), pctOf(s.leftLeg.muscle, 'leftLeg'), theme, REPORT_LABELS.sideLeft)}
  ${label(labelRightLeg.x, labelRightLeg.y - 8, fmtSegmentKg(s.rightLeg.muscle), pctOf(s.rightLeg.muscle, 'rightLeg'), theme, REPORT_LABELS.sideRight)}
</svg>`;
}
