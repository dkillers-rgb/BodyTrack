import type { ClientDashboard } from '../services/types';

function formatGender(gender: string): string {
  if (gender === 'MALE') return 'Masculino';
  if (gender === 'FEMALE') return 'Feminino';
  return 'Outro';
}

function bodyFatPercent(weight: number, bodyFat: number): string {
  if (weight <= 0) return '—';
  return `${((bodyFat / weight) * 100).toFixed(1)}%`;
}

function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('pt-BR');
}

function buildChartSvg(data: ClientDashboard['chartData']): string {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return '';

  const panels = [
    { label: 'Peso', unit: 'kg', get: (p: (typeof sorted)[0]) => p.weight },
    { label: 'Massa Muscular Esquelética', unit: 'kg', get: (p: (typeof sorted)[0]) => p.skeletalMuscle },
    {
      label: 'Percentual de Gordura Corporal',
      unit: '%',
      get: (p: (typeof sorted)[0]) => (p.weight > 0 ? (p.bodyFat / p.weight) * 100 : 0),
    },
  ];

  const width = 720;
  const panelHeight = 90;
  const gap = 6;
  const margin = { top: 8, right: 12, bottom: 44, left: 8 };
  const labelWidth = 130;
  const chartLeft = margin.left + labelWidth;
  const chartWidth = width - chartLeft - margin.right;
  const height = margin.top + panels.length * panelHeight + (panels.length - 1) * gap + margin.bottom;

  const buildScale = (values: number[]) => {
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const span = maxVal - minVal || Math.abs(maxVal) * 0.2 || 1;
    const padding = span * 0.18;
    let min = minVal - padding;
    let max = maxVal + padding;
    if (max - min < 1) {
      const center = (min + max) / 2;
      min = center - 0.5;
      max = center + 0.5;
    }
    return { min, max };
  };

  const pointX = (index: number) => {
    if (sorted.length <= 1) return chartLeft + chartWidth / 2;
    return chartLeft + (index / (sorted.length - 1)) * chartWidth;
  };

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

  panels.forEach((panel, panelIndex) => {
    const panelTop = margin.top + panelIndex * (panelHeight + gap);
    const values = sorted.map(panel.get);
    const { min, max } = buildScale(values);
    const chartTop = panelTop + 14;
    const chartBottom = panelTop + panelHeight - 14;
    const chartInnerHeight = panelHeight - 28;

    const valueToY = (value: number) =>
      chartTop + chartInnerHeight - ((value - min) / (max - min)) * chartInnerHeight;

    svg += `<rect x="${margin.left}" y="${panelTop}" width="${width - margin.left - margin.right}" height="${panelHeight}" fill="#fff" stroke="#e5e7eb"/>`;
    svg += `<text x="${margin.left + 8}" y="${panelTop + panelHeight / 2 - 4}" fill="#111" font-size="10" font-weight="600">${panel.label}</text>`;
    svg += `<text x="${margin.left + 8}" y="${panelTop + panelHeight / 2 + 10}" fill="#374151" font-size="9">(${panel.unit})</text>`;

    const ticks = Array.from({ length: 5 }, (_, i) => {
      const tick = min + ((max - min) / 4) * i;
      return Math.round(tick * 10) / 10;
    });

    ticks.forEach((tick) => {
      const y = valueToY(tick);
      svg += `<line x1="${chartLeft}" y1="${y}" x2="${chartLeft + chartWidth}" y2="${y}" stroke="#e5e7eb"/>`;
      svg += `<text x="${chartLeft - 6}" y="${y + 3}" fill="#6b7280" font-size="8" text-anchor="end">${tick.toFixed(1)}</text>`;
    });

    svg += `<line x1="${chartLeft}" y1="${chartBottom}" x2="${chartLeft + chartWidth}" y2="${chartBottom}" stroke="#d1d5db"/>`;

    const path = values
      .map((value, index) => `${index === 0 ? 'M' : 'L'} ${pointX(index).toFixed(1)} ${valueToY(value).toFixed(1)}`)
      .join(' ');
    svg += `<path d="${path}" fill="none" stroke="#111" stroke-width="1.5"/>`;

    values.forEach((value, index) => {
      const x = pointX(index);
      const y = valueToY(value);
      svg += `<circle cx="${x}" cy="${y}" r="3.5" fill="#111" stroke="#fff"/>`;
      svg += `<text x="${x}" y="${Math.max(chartTop + 10, y - 8)}" fill="#111" font-size="9" font-weight="600" text-anchor="middle">${value.toFixed(1)}</text>`;
    });

    if (panelIndex === panels.length - 1) {
      sorted.forEach((point, index) => {
        svg += `<text x="${pointX(index)}" y="${panelTop + panelHeight + 20}" fill="#111" font-size="8" text-anchor="middle">${formatDate(point.date)}</text>`;
      });
    }
  });

  svg += '</svg>';
  return svg;
}

export function buildReportHtml(data: ClientDashboard): string {
  const { client, evaluations, chartData, analysis, summary } = data;
  const generatedAt = new Date().toLocaleString('pt-BR');
  const latestBodyFatPercent =
    summary.latestWeight && summary.latestFat != null
      ? bodyFatPercent(summary.latestWeight, summary.latestFat)
      : '—';

  const tableRows = [...evaluations]
    .reverse()
    .map(
      (ev) => `<tr>
        <td>${new Date(ev.examDate).toLocaleDateString('pt-BR')}</td>
        <td>${ev.weight}</td>
        <td>${ev.skeletalMuscle}</td>
        <td>${ev.bodyFat}</td>
        <td>${bodyFatPercent(ev.weight, ev.bodyFat)}</td>
      </tr>`
    )
    .join('');

  const chartSvg = buildChartSvg(chartData);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; padding: 24px; }
    .brand { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; }
    .title { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
    .meta { font-size: 13px; color: #374151; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #111; }
    .stats { display: flex; gap: 12px; margin-bottom: 20px; }
    .stat { flex: 1; border: 1px solid #d1d5db; padding: 12px; text-align: center; }
    .stat-value { font-size: 20px; font-weight: 700; }
    .stat-label { font-size: 11px; color: #6b7280; margin-top: 4px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; font-weight: 700; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
    .analysis { font-size: 13px; line-height: 1.6; color: #1f2937; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; }
    th { background: #f3f4f6; font-weight: 600; }
    .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; text-align: center; }
    .chart-title { font-size: 14px; font-weight: 700; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="brand">BodyTrack — Relatório de Composição Corporal</div>
  <div class="title">${client.name}</div>
  <div class="meta">${formatGender(client.gender)} · ${client.age} anos · ${client.height} cm · ${summary.totalEvaluations} avaliação${summary.totalEvaluations !== 1 ? 'ões' : ''}</div>

  <div class="stats">
    <div class="stat"><div class="stat-value">${summary.latestWeight ?? '—'}</div><div class="stat-label">Peso atual (kg)</div></div>
    <div class="stat"><div class="stat-value">${summary.latestMuscle ?? '—'}</div><div class="stat-label">Músculo esquelético (kg)</div></div>
    <div class="stat"><div class="stat-value">${latestBodyFatPercent}</div><div class="stat-label">Gordura corporal (%)</div></div>
  </div>

  <div class="section">
    <div class="chart-title">Histórico da Composição Corporal</div>
    ${chartSvg}
  </div>

  ${analysis ? `<div class="section"><div class="section-title">Análise de evolução</div><p class="analysis">${analysis}</p></div>` : ''}

  <div class="section">
    <div class="section-title">Histórico de avaliações</div>
    <table>
      <thead><tr><th>Data</th><th>Peso (kg)</th><th>Músculo (kg)</th><th>Gordura (kg)</th><th>Gordura (%)</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  </div>

  <div class="footer">Relatório gerado em ${generatedAt}</div>
</body>
</html>`;
}
