/**
 * PRÉVIA — Motor de Silhueta Corporal (não integrado ao projeto).
 * Recalcula geometria SVG a partir de dados de bioimpedância.
 */

/** @typedef {{
 *  weight: number;
 *  heightCm: number;
 *  skeletalMuscle: number;
 *  bodyFatKg: number;
 *  bodyFatPct: number;
 *  bmi: number;
 *  segments: {
 *    leftArm: { muscle: number; fat: number };
 *    rightArm: { muscle: number; fat: number };
 *    trunk: { muscle: number; fat: number };
 *    leftLeg: { muscle: number; fat: number };
 *    rightLeg: { muscle: number; fat: number };
 *  };
 * }} BodyMetrics */

/**
 * Normaliza um valor entre min/max para fator em [lo, hi].
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @param {number} lo
 * @param {number} hi
 */
function mapRange(value, min, max, lo, hi) {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  return lo + t * (hi - lo);
}

/**
 * Calcula fatores de forma a partir dos dados do paciente.
 * @param {BodyMetrics} m
 */
export function computeShapeFactors(m) {
  const armMuscle = (m.segments.leftArm.muscle + m.segments.rightArm.muscle) / 2;
  const legMuscle = (m.segments.leftLeg.muscle + m.segments.rightLeg.muscle) / 2;
  const trunkMuscle = m.segments.trunk.muscle;
  const armFat = (m.segments.leftArm.fat + m.segments.rightArm.fat) / 2;
  const legFat = (m.segments.leftLeg.fat + m.segments.rightLeg.fat) / 2;
  const trunkFat = m.segments.trunk.fat;

  // Largura de ombros: mais músculo de braço/tronco → ombros mais largos
  const shoulderW = mapRange(armMuscle + trunkMuscle * 0.12, 4.5, 8.5, 0.86, 1.18);

  // Cintura: mais gordura de tronco / IMC alto → cintura mais larga
  const waistW = mapRange(m.bmi + trunkFat * 0.45, 22, 36, 0.84, 1.28);

  // Quadril: gordura de tronco/pernas
  const hipW = mapRange(trunkFat + legFat * 0.35, 5, 18, 0.88, 1.22);

  // Espessura dos braços (músculo + gordura segmentar)
  const armThickness = mapRange(armMuscle + armFat * 0.55, 2.2, 4.2, 0.8, 1.32);

  // Espessura das pernas
  const legThickness = mapRange(legMuscle + legFat * 0.45, 7, 12, 0.82, 1.28);

  // Profundidade do tronco (IMC / % gordura)
  const torsoDepth = mapRange(m.bodyFatPct, 12, 40, 0.88, 1.2);

  // Assimetria leve entre lados (diferença muscular real)
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

/**
 * Gera path SVG do contorno corporal a partir dos fatores.
 * viewBox: 0 0 220 520, centro x=110
 * @param {ReturnType<typeof computeShapeFactors>} f
 */
export function buildBodyPath(f) {
  const cx = 110;
  // Meias-larguras base (px no viewBox)
  const shoulder = 50 * f.shoulderW;
  const waist = 28 * f.waistW;
  const hip = 34 * f.hipW;
  const armOut = 48 * f.armThickness;
  const armIn = 28 * f.armThickness;
  const legOut = 32 * f.legThickness;
  const legIn = 14 * f.legThickness;

  // Coordenadas-chave (esquerda = cx - valor)
  const L = {
    neck: 12,
    shoulderY: 106,
    shoulderX: shoulder,
    armPitY: 128,
    elbowY: 190,
    handY: 250,
    handX: armOut + 8,
    waistY: 210,
    waistX: waist,
    hipY: 300,
    hipX: hip,
    kneeY: 380,
    ankleY: 460,
    footY: 478,
    legOutX: legOut,
    legInX: legIn,
  };

  // Braço esquerdo/direito com bias de assimetria
  const la = f.leftArmBias;
  const ra = f.rightArmBias;
  const ll = f.leftLegBias;
  const rl = f.rightLegBias;

  const lx = (v) => (cx - v).toFixed(1);
  const rx = (v) => (cx + v).toFixed(1);

  // Contorno contínuo horário a partir do pescoço esquerdo
  return [
    `M ${lx(L.neck)} 74`,
    // ombro esquerdo
    `C ${lx(L.shoulderX * 0.55)} 78 ${lx(L.shoulderX * 0.85)} 88 ${lx(L.shoulderX)} 104`,
    // braço esquerdo externo
    `C ${lx(L.shoulderX + 8 * la)} 122 ${lx(L.handX * la)} 146 ${lx(L.handX * la + 2)} 172`,
    `C ${lx(L.handX * la + 4)} 198 ${lx(L.handX * la + 2)} 222 ${lx(L.handX * la - 4)} 242`,
    // mão esquerda
    `C ${lx(L.handX * la - 6)} 252 ${lx(L.handX * la - 14)} 256 ${lx(L.handX * la - 20)} 252`,
    // braço esquerdo interno
    `C ${lx(armIn * la + 10)} 234 ${lx(armIn * la + 6)} 210 ${lx(armIn * la + 6)} 186`,
    `C ${lx(armIn * la + 6)} 162 ${lx(armIn * la + 10)} 140 ${lx(L.shoulderX * 0.55)} 122`,
    // flanco esquerdo
    `C ${lx(L.waistX * 0.9)} 142 ${lx(L.waistX)} 168 ${lx(L.waistX * 0.95)} 196`,
    `C ${lx(L.hipX * 0.85)} 228 ${lx(L.hipX * 0.9)} 258 ${lx(L.hipX)} 286`,
    // perna esquerda externa
    `C ${lx(L.legOutX * ll + 4)} 312 ${lx(L.legOutX * ll + 6)} 340 ${lx(L.legOutX * ll + 6)} 368`,
    `C ${lx(L.legOutX * ll + 6)} 396 ${lx(L.legOutX * ll + 4)} 424 ${lx(L.legOutX * ll)} 450`,
    // pé esquerdo
    `C ${lx(L.legOutX * ll - 2)} 462 ${lx(L.legOutX * ll - 6)} 470 ${lx(10)} 472`,
    `L ${lx(2)} 472`,
    // perna esquerda interna
    `C ${lx(L.legInX * ll)} 444 ${lx(L.legInX * ll + 2)} 416 ${lx(L.legInX * ll + 2)} 388`,
    `C ${lx(L.legInX * ll + 2)} 360 ${lx(L.legInX * ll)} 332 ${lx(L.legInX * ll - 2)} 306`,
    // virilha
    `L ${rx(L.legInX * rl - 2)} 306`,
    // perna direita interna
    `C ${rx(L.legInX * rl)} 332 ${rx(L.legInX * rl + 2)} 360 ${rx(L.legInX * rl + 2)} 388`,
    `C ${rx(L.legInX * rl + 2)} 416 ${rx(L.legInX * rl)} 444 ${rx(2)} 472`,
    `L ${rx(10)} 472`,
    // pé direito
    `C ${rx(L.legOutX * rl - 6)} 470 ${rx(L.legOutX * rl - 2)} 462 ${rx(L.legOutX * rl)} 450`,
    // perna direita externa
    `C ${rx(L.legOutX * rl + 4)} 424 ${rx(L.legOutX * rl + 6)} 396 ${rx(L.legOutX * rl + 6)} 368`,
    `C ${rx(L.legOutX * rl + 6)} 340 ${rx(L.legOutX * rl + 4)} 312 ${rx(L.hipX)} 286`,
    // flanco direito
    `C ${rx(L.hipX * 0.9)} 258 ${rx(L.hipX * 0.85)} 228 ${rx(L.waistX * 0.95)} 196`,
    `C ${rx(L.waistX)} 168 ${rx(L.waistX * 0.9)} 142 ${rx(L.shoulderX * 0.55)} 122`,
    // braço direito interno
    `C ${rx(armIn * ra + 10)} 140 ${rx(armIn * ra + 6)} 162 ${rx(armIn * ra + 6)} 186`,
    `C ${rx(armIn * ra + 6)} 210 ${rx(armIn * ra + 10)} 234 ${rx(L.handX * ra - 20)} 252`,
    // mão direita
    `C ${rx(L.handX * ra - 14)} 256 ${rx(L.handX * ra - 6)} 252 ${rx(L.handX * ra - 4)} 242`,
    // braço direito externo
    `C ${rx(L.handX * ra + 2)} 222 ${rx(L.handX * ra + 4)} 198 ${rx(L.handX * ra + 2)} 172`,
    `C ${rx(L.handX * ra)} 146 ${rx(L.shoulderX + 8 * ra)} 122 ${rx(L.shoulderX)} 104`,
    // ombro direito → pescoço
    `C ${rx(L.shoulderX * 0.85)} 88 ${rx(L.shoulderX * 0.55)} 78 ${rx(L.neck)} 74`,
    `C 118 72 114 72 110 72`,
    `C 106 72 102 72 ${lx(L.neck)} 74 Z`,
  ].join(' ');
}

/**
 * Âncoras ajustadas pelos fatores (ombros/coxas acompanham a forma).
 * @param {ReturnType<typeof computeShapeFactors>} f
 */
export function computeAnchors(f) {
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

/**
 * Monta o markup SVG completo da silhueta.
 * @param {BodyMetrics} metrics
 * @param {{ strokeColor?: string; strokeWidth?: number; showAnchors?: boolean }} [opts]
 */
export function renderBodySilhouetteSvg(metrics, opts = {}) {
  const strokeColor = opts.strokeColor ?? '#C7A25A';
  const strokeWidth = opts.strokeWidth ?? 2;
  const showAnchors = opts.showAnchors ?? true;
  const factors = computeShapeFactors(metrics);
  const path = buildBodyPath(factors);
  const anchors = computeAnchors(factors);

  const headRx = (24 * (0.96 + (factors.shoulderW - 1) * 0.15)).toFixed(1);
  const headRy = (30 * (0.98 + (factors.torsoDepth - 1) * 0.08)).toFixed(1);

  const anchorCircles = showAnchors
    ? Object.values(anchors)
        .map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${strokeColor}"/>`)
        .join('\n')
    : '';

  const callouts = showAnchors
    ? `
    <path d="M 18 110 L ${(anchors.leftShoulder.x - 16).toFixed(1)} 110 L ${anchors.leftShoulder.x.toFixed(1)} ${anchors.leftShoulder.y.toFixed(1)}" fill="none" stroke="${strokeColor}" stroke-width="1.3" stroke-linecap="round" opacity="0.85"/>
    <path d="M 202 110 L ${(anchors.rightShoulder.x + 16).toFixed(1)} 110 L ${anchors.rightShoulder.x.toFixed(1)} ${anchors.rightShoulder.y.toFixed(1)}" fill="none" stroke="${strokeColor}" stroke-width="1.3" stroke-linecap="round" opacity="0.85"/>
    <path d="M 18 350 L ${(anchors.leftThigh.x - 12).toFixed(1)} 350 L ${anchors.leftThigh.x.toFixed(1)} ${anchors.leftThigh.y.toFixed(1)}" fill="none" stroke="${strokeColor}" stroke-width="1.3" stroke-linecap="round" opacity="0.85"/>
    <path d="M 202 350 L ${(anchors.rightThigh.x + 12).toFixed(1)} 350 L ${anchors.rightThigh.x.toFixed(1)} ${anchors.rightThigh.y.toFixed(1)}" fill="none" stroke="${strokeColor}" stroke-width="1.3" stroke-linecap="round" opacity="0.85"/>
  `
    : '';

  return {
    factors,
    anchors,
    svg: `<svg viewBox="0 0 220 520" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <g id="Head">
    <ellipse cx="110" cy="42" rx="${headRx}" ry="${headRy}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g id="Torso">
    <path d="${path}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g id="LeftArm"></g>
  <g id="RightArm"></g>
  <g id="LeftLeg"></g>
  <g id="RightLeg"></g>
  <g id="Anchors">${anchorCircles}</g>
  <g id="Callouts">${callouts}</g>
</svg>`,
  };
}
