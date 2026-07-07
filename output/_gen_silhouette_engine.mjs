/**
 * Gera relatório de prévia do Motor de Silhueta Corporal.
 * Não altera o projeto — apenas arquivos em output/.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { renderBodySilhouetteSvg, computeShapeFactors } from './bodySilhouetteEngine.preview.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Paciente atlético — mais músculo, menos gordura */
const athletic = {
  name: 'Perfil Atlético',
  weight: 72,
  heightCm: 178,
  skeletalMuscle: 34,
  bodyFatKg: 10,
  bodyFatPct: 13.9,
  bmi: 22.7,
  segments: {
    leftArm: { muscle: 3.4, fat: 0.6 },
    rightArm: { muscle: 3.5, fat: 0.6 },
    trunk: { muscle: 26.0, fat: 4.2 },
    leftLeg: { muscle: 9.2, fat: 1.8 },
    rightLeg: { muscle: 9.4, fat: 1.8 },
  },
};

/** Paciente do relatório de teste (dados TCY típicos) */
const standard = {
  name: 'Paciente Teste',
  weight: 59.2,
  heightCm: 158,
  skeletalMuscle: 22.8,
  bodyFatKg: 17.5,
  bodyFatPct: 29.6,
  bmi: 23.7,
  segments: {
    leftArm: { muscle: 2.1, fat: 1.3 },
    rightArm: { muscle: 2.1, fat: 1.3 },
    trunk: { muscle: 18.5, fat: 9.0 },
    leftLeg: { muscle: 6.5, fat: 3.1 },
    rightLeg: { muscle: 6.7, fat: 3.2 },
  },
};

/** Paciente com mais adiposidade — cintura/quadril mais largos */
const higherFat = {
  name: 'Perfil Maior Adiposidade',
  weight: 82,
  heightCm: 165,
  skeletalMuscle: 24,
  bodyFatKg: 32,
  bodyFatPct: 39,
  bmi: 30.1,
  segments: {
    leftArm: { muscle: 2.0, fat: 2.4 },
    rightArm: { muscle: 1.9, fat: 2.5 },
    trunk: { muscle: 17.2, fat: 14.5 },
    leftLeg: { muscle: 6.1, fat: 5.8 },
    rightLeg: { muscle: 5.8, fat: 6.0 },
  },
};

function pct(muscle, sm, factor) {
  if (sm <= 0) return '0.0%';
  return `${(Math.round((muscle / sm) * 100 * factor * 10) / 10).toFixed(1)}%`;
}

function profileCard(profile, theme) {
  const { svg, factors } = renderBodySilhouetteSvg(profile, {
    strokeColor: theme.gold,
    strokeWidth: 2,
    showAnchors: true,
  });
  const s = profile.segments;
  const sm = profile.skeletalMuscle;

  return `
  <section class="card">
    <div class="card-title">
      <div class="badge">4</div>
      <div>
        <h2>MÚSCULOS SEGMENTARES</h2>
        <p class="subtitle">${profile.name}</p>
      </div>
    </div>

    <div class="meta-row">
      <span>Peso <b>${profile.weight} kg</b></span>
      <span>Altura <b>${profile.heightCm} cm</b></span>
      <span>IMC <b>${profile.bmi}</b></span>
      <span>Gordura <b>${profile.bodyFatPct}%</b></span>
      <span>Músculo <b>${profile.skeletalMuscle} kg</b></span>
    </div>

    <div class="seg">
      <div class="col left">
        <div class="metric">
          <b>${s.leftArm.muscle.toFixed(1)} kg</b>
          <span class="pct">${pct(s.leftArm.muscle, sm, 1.719)}</span>
          <span class="side">(E)</span>
        </div>
        <div class="metric">
          <b>${s.leftLeg.muscle.toFixed(1)} kg</b>
          <span class="pct">${pct(s.leftLeg.muscle, sm, 0.75)}</span>
          <span class="side">(E)</span>
        </div>
      </div>

      <div class="body-wrap">
        ${svg}
        <div class="trunk-label">
          <b>${s.trunk.muscle.toFixed(1)} kg</b>
          <div class="pct">${pct(s.trunk.muscle, sm, 0.231)}</div>
        </div>
      </div>

      <div class="col right">
        <div class="metric">
          <b>${s.rightArm.muscle.toFixed(1)} kg</b>
          <span class="pct">${pct(s.rightArm.muscle, sm, 1.719)}</span>
          <span class="side">(D)</span>
        </div>
        <div class="metric">
          <b>${s.rightLeg.muscle.toFixed(1)} kg</b>
          <span class="pct">${pct(s.rightLeg.muscle, sm, 0.735)}</span>
          <span class="side">(D)</span>
        </div>
      </div>
    </div>

    <div class="factors">
      <div><span>Ombros</span><b>×${factors.shoulderW.toFixed(2)}</b></div>
      <div><span>Cintura</span><b>×${factors.waistW.toFixed(2)}</b></div>
      <div><span>Quadril</span><b>×${factors.hipW.toFixed(2)}</b></div>
      <div><span>Braços</span><b>×${factors.armThickness.toFixed(2)}</b></div>
      <div><span>Pernas</span><b>×${factors.legThickness.toFixed(2)}</b></div>
    </div>
  </section>`;
}

const theme = { gold: '#C7A25A', bg: '#0A111A', card: '#0F1A24' };

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>Motor de Silhueta Corporal — Prévia</title>
<style>
  @page { size: A4 portrait; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Inter, Roboto, Arial, sans-serif;
    background: ${theme.bg};
    color: #F5F5F5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet { max-width: 210mm; margin: 0 auto; padding: 12px; }
  .header {
    background: #163040;
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header h1 { font-size: 15px; font-weight: 700; color: #C7A25A; }
  .header p { font-size: 11px; color: rgba(255,255,255,0.8); margin-top: 4px; }
  .intro {
    background: #12222D;
    border: 1px solid #8D6E3C;
    border-radius: 8px;
    padding: 12px 14px;
    margin-bottom: 12px;
    font-size: 11px;
    color: #A8B5C4;
    line-height: 1.45;
  }
  .intro strong { color: #C7A25A; }
  .card {
    background: ${theme.card};
    border: 1px solid #3A4550;
    border-radius: 8px;
    padding: 14px 16px 16px;
    margin-bottom: 12px;
    page-break-inside: avoid;
  }
  .card-title { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .badge {
    width: 22px; height: 22px; background: #C7A25A; color: #0A111A;
    font-weight: 800; font-size: 12px; border-radius: 3px;
    display: flex; align-items: center; justify-content: center;
  }
  .card-title h2 { font-size: 13px; letter-spacing: 0.05em; }
  .subtitle { font-size: 11px; color: #C7A25A; margin-top: 2px; }
  .meta-row {
    display: flex; flex-wrap: wrap; gap: 12px;
    font-size: 10px; color: #A8B5C4; margin-bottom: 10px;
    padding-bottom: 8px; border-bottom: 1px solid #2A3540;
  }
  .meta-row b { color: #F5F5F5; }
  .seg {
    display: grid;
    grid-template-columns: 1fr 1.2fr 1fr;
    gap: 4px;
    align-items: center;
    min-height: 340px;
  }
  .col {
    display: flex; flex-direction: column; justify-content: space-between;
    height: 300px; padding: 16px 0;
  }
  .col.left { align-items: flex-start; }
  .col.right { align-items: flex-end; text-align: right; }
  .metric b { display: block; font-size: 14px; color: #F5F5F5; }
  .metric .pct { display: block; margin-top: 2px; font-size: 13px; color: #C7A25A; font-weight: 600; }
  .metric .side { display: block; margin-top: 2px; font-size: 11px; color: #A8B5C4; }
  .body-wrap {
    position: relative; display: flex; justify-content: center; align-items: center;
    height: 340px;
  }
  .body-wrap svg { height: 100%; width: auto; max-width: 100%; }
  .trunk-label {
    position: absolute; top: 36%; left: 50%; transform: translateX(-50%);
    text-align: center; pointer-events: none;
  }
  .trunk-label b { font-size: 14px; color: #F5F5F5; }
  .trunk-label .pct { font-size: 13px; color: #C7A25A; font-weight: 600; }
  .factors {
    display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;
    margin-top: 10px; padding-top: 10px; border-top: 1px solid #2A3540;
  }
  .factors div {
    background: #12222D; border-radius: 6px; padding: 8px;
    text-align: center; font-size: 10px; color: #A8B5C4;
  }
  .factors b { display: block; margin-top: 3px; color: #C7A25A; font-size: 13px; }
  .footer {
    text-align: center; font-size: 10px; color: #8A96A3; margin-top: 8px;
  }
</style>
</head>
<body>
<div class="sheet">
  <header class="header">
    <div>
      <h1>Motor de Silhueta Corporal</h1>
      <p>Prévia conceitual — geometria SVG recalculada pelos dados de bioimpedância</p>
    </div>
    <div style="color:#C7A25A;font-size:12px;font-weight:600;">BodyTrack</div>
  </header>

  <div class="intro">
    <strong>Como funciona:</strong> o motor recebe massa muscular e gordura segmentares, IMC e % de gordura,
    calcula fatores (ombros, cintura, quadril, espessura de braços/pernas e assimetria) e regenera o
    <strong>path SVG</strong> em tempo real. Cada paciente passa a ter uma silhueta coerente com seus resultados —
    não apenas um boneco ilustrativo fixo.
  </div>

  ${profileCard(athletic, theme)}
  ${profileCard(standard, theme)}
  ${profileCard(higherFat, theme)}

  <p class="footer">Prévia isolada em output/ — não integrado ao projeto. Compare as 3 silhuetas: a forma muda com os dados.</p>
</div>
</body>
</html>`;

const htmlPath = path.join(__dirname, 'relatorio-motor-silhueta.html');
const pdfPath = path.join(__dirname, 'relatorio-motor-silhueta.pdf');
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('HTML:', htmlPath);

const browser = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => fs.existsSync(p));

execSync(
  `"${browser}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" --virtual-time-budget=10000 "file:///${htmlPath.replace(/\\/g, '/')}"`,
  { stdio: 'pipe', timeout: 30000 }
);
console.log('PDF:', pdfPath);

// Log fatores para conferência
for (const p of [athletic, standard, higherFat]) {
  const f = computeShapeFactors(p);
  console.log(p.name, {
    ombros: f.shoulderW.toFixed(2),
    cintura: f.waistW.toFixed(2),
    quadril: f.hipW.toFixed(2),
    bracos: f.armThickness.toFixed(2),
    pernas: f.legThickness.toFixed(2),
  });
}
