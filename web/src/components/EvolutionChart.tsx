import { useMemo } from 'react';
import { ChartPoint } from '../services/api';
import './EvolutionChart.css';

interface Props {
  data: ChartPoint[];
}

interface PanelConfig {
  label: string;
  unit: string;
  decimals: number;
  getValue: (point: ChartPoint) => number;
}

const PANELS: PanelConfig[] = [
  {
    label: 'Peso',
    unit: 'kg',
    decimals: 1,
    getValue: (p) => p.weight,
  },
  {
    label: 'Massa Muscular Esquelética',
    unit: 'kg',
    decimals: 1,
    getValue: (p) => p.skeletalMuscle,
  },
  {
    label: 'Percentual de Gordura Corporal',
    unit: '%',
    decimals: 1,
    getValue: (p) => (p.weight > 0 ? (p.bodyFat / p.weight) * 100 : 0),
  },
];

const SVG_WIDTH = 920;
const MARGIN = { top: 8, right: 20, bottom: 44, left: 16 };
const LABEL_WIDTH = 168;
const PANEL_HEIGHT = 108;
const PANEL_GAP = 6;
const CHART_LEFT = MARGIN.left + LABEL_WIDTH;
const CHART_WIDTH = SVG_WIDTH - CHART_LEFT - MARGIN.right;

function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('pt-BR');
}

function formatValue(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

function buildScale(values: number[]) {
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
}

function generateTicks(min: number, max: number, count = 5): number[] {
  if (count < 2) return [min, max];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => {
    const tick = min + step * i;
    return Math.round(tick * 10) / 10;
  });
}

function pointX(index: number, count: number): number {
  if (count <= 1) return CHART_LEFT + CHART_WIDTH / 2;
  return CHART_LEFT + (index / (count - 1)) * CHART_WIDTH;
}

function valueToY(value: number, min: number, max: number, panelTop: number): number {
  const chartTop = panelTop + 14;
  const chartHeight = PANEL_HEIGHT - 28;
  const ratio = (value - min) / (max - min);
  return chartTop + chartHeight - ratio * chartHeight;
}

function MetricPanel({
  config,
  values,
  panelTop,
  pointCount,
  showDates,
  dates,
}: {
  config: PanelConfig;
  values: number[];
  panelTop: number;
  pointCount: number;
  showDates: boolean;
  dates: string[];
}) {
  const { min, max } = buildScale(values);
  const ticks = generateTicks(min, max);
  const chartTop = panelTop + 14;
  const chartBottom = panelTop + PANEL_HEIGHT - 14;

  const linePath = values
    .map((value, index) => {
      const x = pointX(index, pointCount);
      const y = valueToY(value, min, max, panelTop);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <g>
      <rect
        x={MARGIN.left}
        y={panelTop}
        width={SVG_WIDTH - MARGIN.left - MARGIN.right}
        height={PANEL_HEIGHT}
        fill="#ffffff"
        stroke="#e5e7eb"
        strokeWidth={1}
      />

      <text
        x={MARGIN.left + 10}
        y={panelTop + PANEL_HEIGHT / 2 - 6}
        fill="#111111"
        fontSize={11}
        fontWeight={600}
      >
        {config.label}
      </text>
      <text
        x={MARGIN.left + 10}
        y={panelTop + PANEL_HEIGHT / 2 + 10}
        fill="#374151"
        fontSize={10}
        fontWeight={500}
      >
        ({config.unit})
      </text>

      {ticks.map((tick) => {
        const y = valueToY(tick, min, max, panelTop);
        return (
          <g key={`${config.label}-tick-${tick}`}>
            <line
              x1={CHART_LEFT}
              y1={y}
              x2={CHART_LEFT + CHART_WIDTH}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
            <text
              x={CHART_LEFT - 8}
              y={y + 3}
              fill="#6b7280"
              fontSize={9}
              textAnchor="end"
            >
              {formatValue(tick, config.decimals)}
            </text>
          </g>
        );
      })}

      <line
        x1={CHART_LEFT}
        y1={chartBottom}
        x2={CHART_LEFT + CHART_WIDTH}
        y2={chartBottom}
        stroke="#d1d5db"
        strokeWidth={1}
      />

      <path d={linePath} fill="none" stroke="#111111" strokeWidth={1.5} strokeLinejoin="round" />

      {values.map((value, index) => {
        const x = pointX(index, pointCount);
        const y = valueToY(value, min, max, panelTop);
        return (
          <g key={`${config.label}-point-${index}`}>
            <circle cx={x} cy={y} r={3.5} fill="#111111" stroke="#ffffff" strokeWidth={1} />
            <text
              x={x}
              y={Math.max(chartTop + 10, y - 10)}
              fill="#111111"
              fontSize={10}
              fontWeight={600}
              textAnchor="middle"
            >
              {formatValue(value, config.decimals)}
            </text>
          </g>
        );
      })}

      {showDates &&
        dates.map((date, index) => {
          const x = pointX(index, pointCount);
          return (
            <text
              key={`${config.label}-date-${date}`}
              x={x}
              y={panelTop + PANEL_HEIGHT + 22}
              fill="#111111"
              fontSize={9}
              textAnchor="middle"
            >
              {formatDate(date)}
            </text>
          );
        })}
    </g>
  );
}

export default function EvolutionChart({ data }: Props) {
  const sortedData = useMemo(
    () => [...data].sort((a, b) => a.date.localeCompare(b.date)),
    [data]
  );

  const svgHeight =
    MARGIN.top + PANELS.length * PANEL_HEIGHT + (PANELS.length - 1) * PANEL_GAP + MARGIN.bottom;

  if (sortedData.length === 0) {
    return (
      <div className="inbody-chart__empty">
        Nenhuma avaliação registrada ainda.
      </div>
    );
  }

  const dates = sortedData.map((point) => point.date);

  return (
    <div className="inbody-chart">
      <h3 className="inbody-chart__title">Histórico da Composição Corporal</h3>
      <svg
        className="inbody-chart__svg"
        viewBox={`0 0 ${SVG_WIDTH} ${svgHeight}`}
        role="img"
        aria-label="Histórico da composição corporal"
      >
        {PANELS.map((panel, index) => {
          const panelTop = MARGIN.top + index * (PANEL_HEIGHT + PANEL_GAP);
          const values = sortedData.map(panel.getValue);
          const isLastPanel = index === PANELS.length - 1;

          return (
            <MetricPanel
              key={panel.label}
              config={panel}
              values={values}
              panelTop={panelTop}
              pointCount={sortedData.length}
              showDates={isLastPanel}
              dates={dates}
            />
          );
        })}
      </svg>
    </div>
  );
}
