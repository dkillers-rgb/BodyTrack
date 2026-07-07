/**
 * PRÉVIA — não integrado ao projeto.
 * BodySilhouette: SVG puro, estilo bioimpedância profissional.
 */
import type { SVGProps } from 'react';

export type BodySilhouetteProps = {
  width?: number | string;
  height?: number | string;
  strokeColor?: string;
  strokeWidth?: number;
  className?: string;
  showAnchors?: boolean;
} & SVGProps<SVGSVGElement>;

/** Âncoras para indicadores (viewBox 0 0 220 520) */
export const BODY_ANCHORS = {
  leftShoulder: { x: 64, y: 130 },
  rightShoulder: { x: 156, y: 130 },
  chestCenter: { x: 110, y: 205 },
  leftThigh: { x: 86, y: 350 },
  rightThigh: { x: 134, y: 350 },
} as const;

/** Contorno corporal contínuo — proporções médicas equilibradas */
export const BODY_OUTLINE_PATH =
  'M 98 74 ' +
  // ombro esquerdo
  'C 86 78 70 88 60 104 ' +
  // braço esquerdo (externo)
  'C 50 122 44 146 42 172 ' +
  'C 40 198 42 222 48 242 ' +
  // mão esquerda (orgânica, sem dedos)
  'C 50 252 56 256 64 252 ' +
  // braço esquerdo (interno)
  'C 56 234 52 210 52 186 ' +
  'C 52 162 56 140 66 122 ' +
  // axila → flanco esquerdo
  'C 70 142 72 168 74 196 ' +
  'C 76 228 78 258 82 286 ' +
  // perna esquerda (externa)
  'C 80 312 78 340 78 368 ' +
  'C 78 396 80 424 84 450 ' +
  // pé esquerdo
  'C 86 462 90 470 100 472 ' +
  'L 110 472 ' +
  // perna esquerda (interna)
  'C 108 444 106 416 106 388 ' +
  'C 106 360 108 332 110 306 ' +
  // virilha
  'L 110 306 ' +
  // perna direita (interna)
  'C 112 332 114 360 114 388 ' +
  'C 114 416 112 444 110 472 ' +
  'L 120 472 ' +
  // pé direito
  'C 130 470 134 462 136 450 ' +
  // perna direita (externa)
  'C 140 424 142 396 142 368 ' +
  'C 142 340 140 312 138 286 ' +
  // flanco direito → axila
  'C 142 258 144 228 146 196 ' +
  'C 148 168 150 142 154 122 ' +
  // braço direito (interno)
  'C 164 140 168 162 168 186 ' +
  'C 168 210 164 234 156 252 ' +
  // mão direita
  'C 164 256 170 252 172 242 ' +
  // braço direito (externo)
  'C 178 222 180 198 178 172 ' +
  'C 176 146 170 122 160 104 ' +
  // ombro direito → pescoço
  'C 150 88 134 78 122 74 ' +
  'C 118 72 114 72 110 72 ' +
  'C 106 72 102 72 98 74 Z';

/**
 * Silhueta humana frontal, neutra e profissional.
 * Apenas contorno dourado — estilo equipamento de bioimpedância.
 */
export function BodySilhouette({
  width = '100%',
  height = '100%',
  strokeColor = '#C7A25A',
  strokeWidth = 2,
  className,
  showAnchors = false,
  ...rest
}: BodySilhouetteProps) {
  const strokeProps = {
    fill: 'none' as const,
    stroke: strokeColor,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <svg
      viewBox="0 0 220 520"
      width={width}
      height={height}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <g id="Head">
        <ellipse cx="110" cy="42" rx="24" ry="30" {...strokeProps} />
      </g>

      {/* Contorno único: pescoço, ombros, braços, tronco, pernas e pés */}
      <g id="Torso">
        <path d={BODY_OUTLINE_PATH} {...strokeProps} />
      </g>

      {/* Grupos lógicos para animação / integração futura */}
      <g id="LeftArm" />
      <g id="RightArm" />
      <g id="LeftLeg" />
      <g id="RightLeg" />

      {showAnchors
        ? Object.entries(BODY_ANCHORS).map(([key, p]) => (
            <circle key={key} cx={p.x} cy={p.y} r="4" fill={strokeColor} />
          ))
        : null}
    </svg>
  );
}

export default BodySilhouette;
