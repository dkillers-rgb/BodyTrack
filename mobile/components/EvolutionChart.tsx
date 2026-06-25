import { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Rect, Line, Path, Circle, Text as SvgText, G } from 'react-native-svg';
import type { ChartPoint } from '../services/types';

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
  { label: 'Peso', unit: 'kg', decimals: 1, getValue: (p) => p.weight },
  { label: 'Massa Muscular Esquelética', unit: 'kg', decimals: 1, getValue: (p) => p.skeletalMuscle },
  {
    label: 'Percentual de Gordura Corporal',
    unit: '%',
    decimals: 1,
    getValue: (p) => (p.weight > 0 ? (p.bodyFat / p.weight) * 100 : 0),
  },
];

const MARGIN = { top: 8, right: 12, bottom: 44, left: 8 };
const LABEL_WIDTH = 130;
const PANEL_HEIGHT = 90;
const PANEL_GAP = 6;

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
  return Array.from({ length: count }, (_, i) => Math.round((min + step * i) * 10) / 10);
}

function MetricPanel({
  config,
  values,
  panelTop,
  pointCount,
  showDates,
  dates,
  svgWidth,
  chartLeft,
  chartWidth,
}: {
  config: PanelConfig;
  values: number[];
  panelTop: number;
  pointCount: number;
  showDates: boolean;
  dates: string[];
  svgWidth: number;
  chartLeft: number;
  chartWidth: number;
}) {
  const { min, max } = buildScale(values);
  const ticks = generateTicks(min, max);
  const chartTop = panelTop + 14;
  const chartBottom = panelTop + PANEL_HEIGHT - 14;

  const pointX = (index: number) => {
    if (pointCount <= 1) return chartLeft + chartWidth / 2;
    return chartLeft + (index / (pointCount - 1)) * chartWidth;
  };

  const valueToY = (value: number) => {
    const chartHeight = PANEL_HEIGHT - 28;
    const ratio = (value - min) / (max - min);
    return chartTop + chartHeight - ratio * chartHeight;
  };

  const linePath = values
    .map((value, index) => {
      const x = pointX(index);
      const y = valueToY(value);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <G>
      <Rect
        x={MARGIN.left}
        y={panelTop}
        width={svgWidth - MARGIN.left - MARGIN.right}
        height={PANEL_HEIGHT}
        fill="#ffffff"
        stroke="#e5e7eb"
        strokeWidth={1}
      />
      <SvgText x={MARGIN.left + 8} y={panelTop + PANEL_HEIGHT / 2 - 4} fill="#111111" fontSize={10} fontWeight="600">
        {config.label}
      </SvgText>
      <SvgText x={MARGIN.left + 8} y={panelTop + PANEL_HEIGHT / 2 + 10} fill="#374151" fontSize={9} fontWeight="500">
        ({config.unit})
      </SvgText>

      {ticks.map((tick) => {
        const y = valueToY(tick);
        return (
          <G key={`${config.label}-tick-${tick}`}>
            <Line x1={chartLeft} y1={y} x2={chartLeft + chartWidth} y2={y} stroke="#e5e7eb" strokeWidth={1} />
            <SvgText x={chartLeft - 6} y={y + 3} fill="#6b7280" fontSize={8} textAnchor="end">
              {formatValue(tick, config.decimals)}
            </SvgText>
          </G>
        );
      })}

      <Line x1={chartLeft} y1={chartBottom} x2={chartLeft + chartWidth} y2={chartBottom} stroke="#d1d5db" strokeWidth={1} />
      <Path d={linePath} fill="none" stroke="#111111" strokeWidth={1.5} />

      {values.map((value, index) => {
        const x = pointX(index);
        const y = valueToY(value);
        return (
          <G key={`${config.label}-point-${index}`}>
            <Circle cx={x} cy={y} r={3.5} fill="#111111" stroke="#ffffff" strokeWidth={1} />
            <SvgText
              x={x}
              y={Math.max(chartTop + 10, y - 8)}
              fill="#111111"
              fontSize={9}
              fontWeight="600"
              textAnchor="middle"
            >
              {formatValue(value, config.decimals)}
            </SvgText>
          </G>
        );
      })}

      {showDates &&
        dates.map((date, index) => (
          <SvgText
            key={`${config.label}-date-${date}-${index}`}
            x={pointX(index)}
            y={panelTop + PANEL_HEIGHT + 20}
            fill="#111111"
            fontSize={8}
            textAnchor="middle"
          >
            {formatDate(date)}
          </SvgText>
        ))}
    </G>
  );
}

export default function EvolutionChart({ data }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const svgWidth = Math.min(screenWidth - 32, 920);
  const chartLeft = MARGIN.left + LABEL_WIDTH;
  const chartWidth = svgWidth - chartLeft - MARGIN.right;

  const sortedData = useMemo(
    () => [...data].sort((a, b) => a.date.localeCompare(b.date)),
    [data]
  );

  const svgHeight =
    MARGIN.top + PANELS.length * PANEL_HEIGHT + (PANELS.length - 1) * PANEL_GAP + MARGIN.bottom;

  if (sortedData.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Nenhuma avaliação registrada ainda.</Text>
      </View>
    );
  }

  const dates = sortedData.map((point) => point.date);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Histórico da Composição Corporal</Text>
      <Svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        {PANELS.map((panel, index) => {
          const panelTop = MARGIN.top + index * (PANEL_HEIGHT + PANEL_GAP);
          const values = sortedData.map(panel.getValue);
          return (
            <MetricPanel
              key={panel.label}
              config={panel}
              values={values}
              panelTop={panelTop}
              pointCount={sortedData.length}
              showDates={index === PANELS.length - 1}
              dates={dates}
              svgWidth={svgWidth}
              chartLeft={chartLeft}
              chartWidth={chartWidth}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  title: { fontSize: 14, fontWeight: '700', color: '#111111', marginBottom: 10 },
  empty: { padding: 20, alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 13 },
});
