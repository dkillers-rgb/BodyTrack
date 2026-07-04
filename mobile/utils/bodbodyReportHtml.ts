import type { ClientDashboard, CompanySettings } from '../services/types';
import type { BodbodyReportSnapshot, RangeValue } from '../services/bodbodyReportTypes';
import { REPORT_LABELS } from '../services/bodbodyReportLabels';
import { buildSegmentSvgMarkup, SILHOUETTE_THEME_PRINT } from '../utils/segmentBodyArt';

const T = {
  page: '#F7F8FA',
  card: '#FFFFFF',
  border: '#D7D7D7',
  header: '#163040',
  gold: '#C7A25A',
  title: '#163040',
  text: '#202124',
  muted: '#5F6368',
  zoneLow: '#B0BEC5',
  zoneNormal: '#81C784',
  zoneOver: '#FFB74D',
  gaugeLow: '#64B5F6',
  gaugeMid: '#81C784',
  gaugeHigh: '#E57373',
  marker: '#163040',
} as const;

function fmt(n: number, d = 1) {
  return n.toFixed(d);
}

function genderLabel(g: string) {
  if (g === 'MALE') return 'Masculino';
  if (g === 'FEMALE') return 'Feminino';
  return 'Outro';
}

function zonePos(item: RangeValue, min: number, max: number) {
  const span = max - min || 1;
  return Math.max(0, Math.min(100, ((item.value - min) / span) * 100));
}

function muscleFatBarHtml(item: RangeValue, unit: string): string {
  const min = item.low * 0.75;
  const max = item.high * 1.25;
  const pos = zonePos(item, min, max);
  return `<div class="mf-track">
    <div class="mf-low"></div><div class="mf-normal"></div><div class="mf-over"></div>
    <div class="mf-marker" style="left:${pos}%"></div>
  </div>
  <div class="mf-meta"><span class="mf-zones">${REPORT_LABELS.zoneLow} · ${REPORT_LABELS.zoneNormal} · ${REPORT_LABELS.zoneOver}</span><b>${fmt(item.value)} ${unit}</b></div>`;
}

function gaugeBarHtml(item: RangeValue, unit: string, decimals = 1): string {
  const pos = zonePos(item, item.low, item.high);
  return `<div class="gauge-track">
    <div class="gauge-bar"></div>
    <div class="gauge-marker" style="left:${pos}%"></div>
  </div>
  <div class="gauge-meta">
    <span>${fmt(item.low, decimals)}</span>
    <b>${fmt(item.value, decimals)}${unit}</b>
    <span>${fmt(item.high, decimals)}</span>
  </div>`;
}

function buildChartSvg(data: ClientDashboard['chartData']): string {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date)).slice(-5);
  if (!sorted.length) return '';

  const panels = [
    { label: REPORT_LABELS.chartWeight, get: (p: (typeof sorted)[0]) => p.weight },
    { label: REPORT_LABELS.chartMuscle, get: (p: (typeof sorted)[0]) => p.skeletalMuscle },
    {
      label: REPORT_LABELS.chartFat,
      get: (p: (typeof sorted)[0]) => (p.weight > 0 ? (p.bodyFat / p.weight) * 100 : 0),
    },
  ];

  const panelW = 248;
  const ph = 92;
  const gap = 10;
  const w = panels.length * panelW + (panels.length - 1) * gap;
  const h = ph + 20;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" class="chart-svg">`;

  panels.forEach((panel, pi) => {
    const values = sorted.map(panel.get);
    const min = Math.min(...values) * 0.95;
    const max = Math.max(...values) * 1.05;
    const left = pi * (panelW + gap);
    const top = 18;
    const cw = panelW - 8;
    const ih = ph - 30;

    svg += `<text x="${left + cw / 2}" y="${top - 6}" font-size="9" font-weight="600" fill="${T.title}" text-anchor="middle">${panel.label}</text>`;
    svg += `<rect x="${left}" y="${top}" width="${cw}" height="${ph - 16}" fill="#fff" stroke="${T.border}" stroke-width="1" rx="8"/>`;

    for (let g = 1; g <= 3; g++) {
      const gy = top + 8 + (ih * g) / 4;
      svg += `<line x1="${left + 8}" y1="${gy}" x2="${left + cw - 8}" y2="${gy}" stroke="#ECEFF1" stroke-width="1"/>`;
    }

    const pts = values.map((v, i) => {
      const x = left + (sorted.length <= 1 ? cw / 2 : (i / (sorted.length - 1)) * cw * 0.8 + cw * 0.1);
      const y = top + 8 + ih - ((v - min) / (max - min || 1)) * ih;
      return { x, y, v, i };
    });

    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    svg += `<path d="${path}" fill="none" stroke="${T.gold}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    pts.forEach((p) => {
      svg += `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${T.gold}"/>`;
      svg += `<text x="${p.x}" y="${p.y - 6}" text-anchor="middle" font-size="8" font-weight="700" fill="${T.text}">${p.v.toFixed(1)}</text>`;
      const d = sorted[p.i].date.split('-').reverse().slice(0, 2).join('/');
      svg += `<text x="${p.x}" y="${top + ph - 20}" text-anchor="middle" font-size="7.5" fill="${T.muted}">${d}</text>`;
    });
  });
  svg += '</svg>';
  return svg;
}

function formatExam(r: BodbodyReportSnapshot): string {
  if (r.examTime) {
    return `${r.examTime} · ${r.examDate.split('-').reverse().join('/')}`;
  }
  return new Date(`${r.examDate}T12:00:00`).toLocaleDateString('pt-BR');
}

function renderReport(
  r: BodbodyReportSnapshot,
  client: ClientDashboard['client'],
  chartData: ClientDashboard['chartData'],
  generatedAt: string,
  company?: CompanySettings
): string {
  const exam = formatExam(r);
  const companyName = company?.name?.trim() || 'BodyTrack';
  const address = company?.address?.trim() || '';
  const phone = company?.phone?.trim() || '';
  const logo = company?.logoDataUri
    ? `<img class="logo" src="${company.logoDataUri}" alt="Logo"/>`
    : `<div class="logo-fallback">BT</div>`;

  const evalRows = r.section5
    .map(
      (row) =>
        `<tr>
          <td>${row.label}</td>
          <td>${row.status === 'under' ? '✔' : ''}</td>
          <td>${row.status === 'normal' ? '✔' : ''}</td>
          <td>${row.status === 'over' ? '✔' : ''}</td>
        </tr>`
    )
    .join('');

  const segmentSvg = buildSegmentSvgMarkup(r, client.height, {
    theme: SILHOUETTE_THEME_PRINT,
    compact: true,
    fillPage: true,
  });

  return `
  <div class="sheet">
    <header class="header">
      <div class="header-brand">
        ${logo}
        <div>
          <div class="clinic-name">${companyName}</div>
          ${address ? `<div class="clinic-meta">${address}</div>` : ''}
          ${phone ? `<div class="clinic-meta">Tel: ${phone}</div>` : ''}
        </div>
      </div>
      <div class="header-title">${REPORT_LABELS.reportSubtitle}</div>
    </header>

    <section class="patient card">
      <div class="patient-item"><span>Paciente</span><b>${client.name}</b></div>
      <div class="patient-item"><span>Data</span><b>${exam}</b></div>
      <div class="patient-item"><span>Sexo</span><b>${genderLabel(client.gender)}</b></div>
      <div class="patient-item"><span>Altura</span><b>${client.height} cm</b></div>
      <div class="patient-item"><span>Idade</span><b>${client.age} anos</b></div>
      <div class="patient-item"><span>Peso</span><b>${fmt(r.section2.weight.value)} kg</b></div>
    </section>

    <section class="card block">
      <h2 class="block-title">${REPORT_LABELS.section1}</h2>
      <div class="comp-grid">
        <div class="comp-card">
          <div class="comp-icon">💧</div>
          <div class="comp-name">${REPORT_LABELS.moisture}</div>
          <div class="comp-value">${fmt(r.section1.moisture.value)} <small>kg</small></div>
        </div>
        <div class="comp-card">
          <div class="comp-icon">🧬</div>
          <div class="comp-name">${REPORT_LABELS.protein}</div>
          <div class="comp-value">${fmt(r.section1.protein.value)} <small>kg</small></div>
        </div>
        <div class="comp-card">
          <div class="comp-icon">🦴</div>
          <div class="comp-name">${REPORT_LABELS.minerals}</div>
          <div class="comp-value">${fmt(r.section1.minerals.value)} <small>kg</small></div>
        </div>
        <div class="comp-card">
          <div class="comp-icon">🔴</div>
          <div class="comp-name">${REPORT_LABELS.bodyFat}</div>
          <div class="comp-value">${fmt(r.section1.bodyFat.value)} <small>kg</small></div>
        </div>
      </div>
    </section>

    <div class="row-3">
      <section class="card block">
        <h2 class="block-title">${REPORT_LABELS.section2}</h2>
        <div class="metric">
          <div class="metric-label">${REPORT_LABELS.weight}</div>
          ${muscleFatBarHtml(r.section2.weight, 'kg')}
        </div>
        <div class="metric">
          <div class="metric-label">${REPORT_LABELS.skeletalMuscle}</div>
          ${muscleFatBarHtml(r.section2.skeletalMuscle, 'kg')}
        </div>
        <div class="metric">
          <div class="metric-label">${REPORT_LABELS.bodyFat}</div>
          ${muscleFatBarHtml(r.section2.bodyFat, 'kg')}
        </div>
      </section>

      <section class="card block">
        <h2 class="block-title">${REPORT_LABELS.section3}</h2>
        <div class="metric">
          <div class="metric-label">${REPORT_LABELS.bmi}</div>
          ${gaugeBarHtml(r.section3.bmi, '')}
        </div>
        <div class="metric">
          <div class="metric-label">${REPORT_LABELS.bodyFatPct}</div>
          ${gaugeBarHtml(r.section3.bodyFatPct, '%')}
        </div>
        <div class="metric">
          <div class="metric-label">${REPORT_LABELS.waistHip}</div>
          ${gaugeBarHtml(r.section3.waistHip, '', 2)}
        </div>
      </section>

      <section class="card block seg-block">
        <h2 class="block-title">${REPORT_LABELS.section4}</h2>
        <div class="seg-wrap">${segmentSvg}</div>
      </section>
    </div>

    <div class="row-2">
      <section class="card block">
        <h2 class="block-title">${REPORT_LABELS.section5}</h2>
        <table class="eval">
          <thead>
            <tr>
              <th></th>
              <th>${REPORT_LABELS.evalUnder}</th>
              <th>${REPORT_LABELS.evalNormal}</th>
              <th>${REPORT_LABELS.evalOver}</th>
            </tr>
          </thead>
          <tbody>${evalRows}</tbody>
        </table>
      </section>

      <section class="card block">
        <h2 class="block-title">${REPORT_LABELS.section6}</h2>
        <div class="control-list">
          <div><span>${REPORT_LABELS.targetWeight}</span><b>${fmt(r.section6.targetWeight)} kg</b></div>
          <div><span>${REPORT_LABELS.weightControl}</span><b>${fmt(r.section6.weightControl)} kg</b></div>
          <div><span>${REPORT_LABELS.bmr}</span><b>${Math.round(r.section6.basalMetabolism)} kcal</b></div>
          <div><span>${REPORT_LABELS.score}</span><b>${Math.round(r.section6.comprehensiveScore)} / 100</b></div>
        </div>
      </section>
    </div>

    <section class="card block chart-block">
      <h2 class="block-title">${REPORT_LABELS.section7}</h2>
      <div class="chart-wrap">${buildChartSvg(chartData)}</div>
    </section>

    <footer class="footer">
      <span>${companyName}</span>
      <span>Relatório gerado em ${generatedAt}</span>
    </footer>
  </div>`;
}

export function buildBodbodyReportHtml(
  data: ClientDashboard,
  company?: CompanySettings
): string {
  const r = data.bodbodyReport;
  const generatedAt = new Date().toLocaleString('pt-BR');

  if (!r) {
    return `<!DOCTYPE html><html><body><p>Sem dados de relatório.</p></body></html>`;
  }

  const body = renderReport(r, data.client, data.chartData, generatedAt, company);

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<style>
  @page { size: A4 portrait; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 100%;
    min-height: 277mm;
    background: ${T.page};
  }
  body {
    font-family: Inter, Roboto, Arial, Helvetica, sans-serif;
    color: ${T.text};
    font-size: 10px;
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    width: 100%;
    min-height: 277mm;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: ${T.page};
  }
  .card {
    background: ${T.card};
    border: 1px solid ${T.border};
    border-radius: 10px;
    box-shadow: 0 1px 2px rgba(22,48,64,0.04);
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    background: ${T.header};
    color: #fff;
    border-radius: 10px;
    padding: 12px 16px;
  }
  .header-brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .logo {
    height: 42px;
    width: auto;
    max-width: 120px;
    object-fit: contain;
    background: #fff;
    border-radius: 6px;
    padding: 3px 6px;
  }
  .logo-fallback {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    border: 1px solid ${T.gold};
    color: ${T.gold};
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 12px;
  }
  .clinic-name { font-size: 15px; font-weight: 600; letter-spacing: 0.01em; }
  .clinic-meta { font-size: 9px; color: rgba(255,255,255,0.78); margin-top: 2px; }
  .header-title {
    font-size: 12px;
    font-weight: 600;
    color: ${T.gold};
    text-align: right;
    max-width: 42%;
    line-height: 1.3;
  }
  .patient {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
    padding: 10px 12px;
  }
  .patient-item span {
    display: block;
    font-size: 8.5px;
    color: ${T.muted};
    font-weight: 500;
    margin-bottom: 2px;
  }
  .patient-item b { font-size: 11px; font-weight: 700; color: ${T.text}; }
  .block { padding: 10px 12px 12px; }
  .block-title {
    font-size: 11px;
    font-weight: 600;
    color: ${T.title};
    padding-bottom: 6px;
    margin-bottom: 8px;
    border-bottom: 1.5px solid ${T.gold};
  }
  .comp-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  .comp-card {
    text-align: center;
    padding: 10px 6px;
    border: 1px solid ${T.border};
    border-radius: 10px;
    background: #FCFCFD;
  }
  .comp-icon { font-size: 18px; filter: grayscale(0.2); }
  .comp-name {
    margin-top: 4px;
    font-size: 9px;
    font-weight: 500;
    color: ${T.muted};
  }
  .comp-value {
    margin-top: 4px;
    font-size: 18px;
    font-weight: 700;
    color: ${T.title};
  }
  .comp-value small { font-size: 10px; font-weight: 500; color: ${T.muted}; }
  .row-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1.05fr;
    gap: 8px;
    flex: 1;
    min-height: 0;
  }
  .row-2 {
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    gap: 8px;
  }
  .metric { margin-bottom: 10px; }
  .metric:last-child { margin-bottom: 0; }
  .metric-label {
    font-size: 9.5px;
    font-weight: 600;
    color: ${T.title};
    margin-bottom: 4px;
  }
  .mf-track {
    position: relative;
    display: flex;
    height: 12px;
    border-radius: 999px;
    overflow: hidden;
  }
  .mf-low { flex: 1; background: ${T.zoneLow}; }
  .mf-normal { flex: 2; background: ${T.zoneNormal}; }
  .mf-over { flex: 1; background: ${T.zoneOver}; }
  .mf-marker {
    position: absolute;
    top: -2px;
    bottom: -2px;
    width: 3px;
    margin-left: -1.5px;
    background: ${T.marker};
    border-radius: 2px;
  }
  .mf-meta, .gauge-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 3px;
    font-size: 8.5px;
    color: ${T.muted};
  }
  .mf-meta b, .gauge-meta b {
    font-size: 11px;
    font-weight: 700;
    color: ${T.text};
  }
  .gauge-track { position: relative; height: 18px; }
  .gauge-bar {
    height: 10px;
    border-radius: 999px;
    background: linear-gradient(90deg, ${T.gaugeLow}, ${T.gaugeMid}, ${T.gaugeHigh});
  }
  .gauge-marker {
    position: absolute;
    top: 10px;
    width: 0;
    height: 0;
    margin-left: -4px;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-bottom: 6px solid ${T.marker};
  }
  .seg-block { display: flex; flex-direction: column; min-height: 0; }
  .seg-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 150px;
  }
  .seg-body-svg, .seg-body-svg-fill {
    display: block;
    width: 100%;
    height: 100%;
    max-height: 220px;
  }
  .eval { width: 100%; border-collapse: collapse; }
  .eval th, .eval td {
    padding: 7px 4px;
    text-align: center;
    border-bottom: 1px solid #ECEFF1;
    font-size: 10px;
  }
  .eval th { color: ${T.gold}; font-weight: 600; }
  .eval td:first-child { text-align: left; font-weight: 600; color: ${T.title}; }
  .eval td { color: ${T.gold}; font-weight: 700; }
  .control-list { display: flex; flex-direction: column; gap: 8px; }
  .control-list div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #ECEFF1;
  }
  .control-list div:last-child { border-bottom: none; }
  .control-list span { color: ${T.muted}; font-weight: 500; }
  .control-list b { color: ${T.text}; font-weight: 700; font-size: 12px; }
  .chart-block { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .chart-wrap { flex: 1; min-height: 100px; }
  .chart-svg { width: 100%; height: 100%; min-height: 100px; }
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 4px 0;
    font-size: 8.5px;
    color: ${T.muted};
    border-top: 1px solid ${T.border};
  }
  .footer span:first-child { color: ${T.gold}; font-weight: 600; }
  @media print {
    html, body { background: ${T.page}; }
    .sheet { min-height: 277mm; }
  }
</style></head><body>
${body}
</body></html>`;
}
