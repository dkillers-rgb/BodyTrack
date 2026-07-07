import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop, Path, Circle, Ellipse, Text as SvgText } from 'react-native-svg';
import type { ClientDashboard, CompanySettings } from '../services/types';
import type { BodbodyReportSnapshot, RangeValue } from '../services/bodbodyReportTypes';
import { REPORT_LABELS } from '../services/bodbodyReportLabels';
import { api } from '../services/api';
import { resolveLocalUri } from '../services/fileStorage';
import {
  buildSilhouetteGeometry,
  calcSegmentMusclePercent,
  fmtSegmentKg,
  fmtSegmentPct,
  metricsFromReport,
  SILHOUETTE_THEME_SCREEN,
} from '../utils/segmentBodyArt';
import EvolutionChart from './EvolutionChart';

/** Tema escuro — apenas visualização no app */
const GOLD = '#C7A25A';
const BG = '#0B1720';
const CARD = '#12222D';
const BORDER = '#8D6E3C';
const TEXT = '#F5F5F5';
const MUTED = '#A8B5C4';

interface Props {
  data: ClientDashboard;
}

function fmt(n: number, d = 1) {
  return n.toFixed(d);
}

function formatGender(g: string) {
  if (g === 'MALE') return 'Masculino';
  if (g === 'FEMALE') return 'Feminino';
  return 'Outro';
}

function zonePosition(item: RangeValue, min: number, max: number) {
  const span = max - min || 1;
  return Math.max(0, Math.min(100, ((item.value - min) / span) * 100));
}

function SectionTitle({ n, title }: { n: number; title: string }) {
  return (
    <View style={styles.sectionTitleWrap}>
      <View style={styles.sectionNum}>
        <Text style={styles.sectionNumText}>{n}</Text>
      </View>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
    </View>
  );
}

function MuscleFatBar({ item, unit, decimals = 1 }: { item: RangeValue; unit: string; decimals?: number }) {
  const pos = zonePosition(item, item.low * 0.75, item.high * 1.25);
  return (
    <View style={styles.mfRow}>
      <View style={styles.mfTrack}>
        <View style={[styles.mfZone, { flex: 1, backgroundColor: '#3D5A4A' }]} />
        <View style={[styles.mfZone, { flex: 2, backgroundColor: '#4CAF6A' }]} />
        <View style={[styles.mfZone, { flex: 1, backgroundColor: '#D4A017' }]} />
        <View style={[styles.mfMarker, { left: `${pos}%` }]} />
      </View>
      <Text style={styles.mfValue}>
        {fmt(item.value, decimals)}
        {unit ? ` ${unit}` : ''}
      </Text>
    </View>
  );
}

function GaugeBar({ item, unit, decimals = 1 }: { item: RangeValue; unit: string; decimals?: number }) {
  const pos = zonePosition(item, item.low, item.high);
  return (
    <View style={styles.gaugeRow}>
      <View style={styles.gaugeTrack}>
        <Svg width="100%" height={12} viewBox="0 0 200 12" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="gaugeGradDark" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#3B82C4" />
              <Stop offset="0.5" stopColor="#4CAF6A" />
              <Stop offset="1" stopColor="#C94C4C" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="200" height="12" fill="url(#gaugeGradDark)" rx="2" />
        </Svg>
        <View style={[styles.gaugePointer, { left: `${pos}%` }]}>
          <Text style={styles.gaugePointerText}>▼</Text>
        </View>
      </View>
      <View style={styles.gaugeLabels}>
        <Text style={styles.gaugeScale}>{fmt(item.low, decimals)}</Text>
        <Text style={styles.gaugeValue}>
          {fmt(item.value, decimals)}
          {unit}
        </Text>
        <Text style={styles.gaugeScale}>{fmt(item.high, decimals)}</Text>
      </View>
    </View>
  );
}

function SegmentBody({
  report,
  heightCm,
}: {
  report: BodbodyReportSnapshot;
  heightCm: number;
}) {
  const s = report.section4;
  const sm = report.section2.skeletalMuscle.value;
  const pct = (muscle: number, key: 'leftArm' | 'rightArm' | 'trunk' | 'leftLeg' | 'rightLeg') =>
    fmtSegmentPct(calcSegmentMusclePercent(muscle, sm, key));
  const stroke = SILHOUETTE_THEME_SCREEN.stroke;
  const theme = SILHOUETTE_THEME_SCREEN;
  const { path, anchors: a, head } = buildSilhouetteGeometry(metricsFromReport(report, heightCm));

  const Callout = ({ lx, ly, ax, ay }: { lx: number; ly: number; ax: number; ay: number }) => {
    const elbow = lx < ax ? ax - 14 : ax + 14;
    return (
      <Path
        d={`M ${lx} ${ly} L ${elbow} ${ly} L ${ax} ${ay}`}
        fill="none"
        stroke={stroke}
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity={0.85}
      />
    );
  };

  return (
    <View style={styles.segmentContainer}>
      <Svg width="100%" height={280} viewBox="0 0 220 520">
        <Ellipse cx="110" cy="42" rx={head.rx} ry={head.ry} fill="none" stroke={stroke} strokeWidth="2" />
        <Path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={a.leftShoulder.x} cy={a.leftShoulder.y} r="4" fill={stroke} />
        <Circle cx={a.rightShoulder.x} cy={a.rightShoulder.y} r="4" fill={stroke} />
        <Circle cx={a.chestCenter.x} cy={a.chestCenter.y} r="4" fill={stroke} />
        <Circle cx={a.leftThigh.x} cy={a.leftThigh.y} r="4" fill={stroke} />
        <Circle cx={a.rightThigh.x} cy={a.rightThigh.y} r="4" fill={stroke} />
        <Callout lx={28} ly={100} ax={a.leftShoulder.x} ay={a.leftShoulder.y} />
        <Callout lx={192} ly={100} ax={a.rightShoulder.x} ay={a.rightShoulder.y} />
        <Callout lx={28} ly={340} ax={a.leftThigh.x} ay={a.leftThigh.y} />
        <Callout lx={192} ly={340} ax={a.rightThigh.x} ay={a.rightThigh.y} />
        <SegmentLabel x={28} y={92} kg={fmtSegmentKg(s.leftArm.muscle)} pct={pct(s.leftArm.muscle, 'leftArm')} side={REPORT_LABELS.sideLeft} theme={theme} />
        <SegmentLabel x={192} y={92} kg={fmtSegmentKg(s.rightArm.muscle)} pct={pct(s.rightArm.muscle, 'rightArm')} side={REPORT_LABELS.sideRight} theme={theme} />
        <SegmentLabel x={a.chestCenter.x} y={a.chestCenter.y + 18} kg={fmtSegmentKg(s.trunk.muscle)} pct={pct(s.trunk.muscle, 'trunk')} theme={theme} />
        <SegmentLabel x={28} y={332} kg={fmtSegmentKg(s.leftLeg.muscle)} pct={pct(s.leftLeg.muscle, 'leftLeg')} side={REPORT_LABELS.sideLeft} theme={theme} />
        <SegmentLabel x={192} y={332} kg={fmtSegmentKg(s.rightLeg.muscle)} pct={pct(s.rightLeg.muscle, 'rightLeg')} side={REPORT_LABELS.sideRight} theme={theme} />
      </Svg>
    </View>
  );
}

function SegmentLabel({
  x,
  y,
  kg,
  pct,
  side,
  theme,
}: {
  x: number;
  y: number;
  kg: string;
  pct: string;
  side?: string;
  theme: typeof SILHOUETTE_THEME_SCREEN;
}) {
  return (
    <>
      <SvgText x={x} y={y} fontSize="10" fontWeight="700" fill={theme.text} textAnchor="middle">{kg}</SvgText>
      <SvgText x={x} y={y + 14} fontSize="10" fontWeight="600" fill={theme.pct} textAnchor="middle">{pct}</SvgText>
      {side ? (
        <SvgText x={x} y={y + 28} fontSize="9" fill={theme.side} textAnchor="middle">
          {side}
        </SvgText>
      ) : null}
    </>
  );
}

export default function BodbodyReport({ data }: Props) {
  const { client, bodbodyReport, chartData } = data;
  const [company, setCompany] = useState<CompanySettings | null>(null);

  useEffect(() => {
    api.company.get().then(setCompany).catch(console.error);
  }, []);

  if (!bodbodyReport) {
    return (
      <View style={styles.report}>
        <Text style={styles.fallback}>Sem dados de relatório Bodbody para exibir.</Text>
      </View>
    );
  }

  const r = bodbodyReport;
  const examDisplay = r.examTime
    ? `${r.examTime} · ${r.examDate.split('-').reverse().join('.')}`
    : new Date(`${r.examDate}T12:00:00`).toLocaleDateString('pt-BR');
  const companyName = company?.name?.trim() || 'BodyTrack';
  const addressParts = (company?.address || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <View style={styles.report}>
      <View style={styles.companyHeader}>
        <View style={styles.companyBrand}>
          {company?.logoPath ? (
            <Image source={{ uri: resolveLocalUri(company.logoPath) }} style={styles.logo} resizeMode="contain" />
          ) : (
            <View style={styles.logoFallback}>
              <Text style={styles.logoFallbackText}>BT</Text>
            </View>
          )}
          <Text style={styles.companyName}>{companyName}</Text>
        </View>
        <View style={styles.companyDivider} />
        <View style={styles.companyContact}>
          {addressParts.map((line) => (
            <Text key={line} style={styles.companyLine}>
              {line}
            </Text>
          ))}
          {company?.phone ? <Text style={styles.companyLine}>Tel: {company.phone}</Text> : null}
        </View>
        <Text style={styles.companyTitle}>{REPORT_LABELS.reportSubtitle.toUpperCase()}</Text>
      </View>

      <View style={styles.patientBar}>
        <Text style={styles.patientText}>ID {client.externalId}</Text>
        <Text style={styles.patientText}>{client.name}</Text>
        <Text style={styles.patientText}>{formatGender(client.gender)}</Text>
        <Text style={styles.patientText}>{client.age} anos</Text>
        <Text style={styles.patientText}>{client.height} cm</Text>
        <Text style={styles.patientText}>{examDisplay}</Text>
      </View>

      <View style={styles.card}>
        <SectionTitle n={1} title={REPORT_LABELS.section1} />
        <View style={styles.compRow}>
          <CompCell icon="💧" label={REPORT_LABELS.moisture} value={r.section1.moisture} unit="kg" />
          <CompCell icon="🧬" label={REPORT_LABELS.protein} value={r.section1.protein} unit="kg" />
          <CompCell icon="🦴" label={REPORT_LABELS.minerals} value={r.section1.minerals} unit="kg" />
          <CompCell icon="🔴" label={REPORT_LABELS.bodyFat} value={r.section1.bodyFat} unit="kg" />
        </View>
      </View>

      <View style={styles.card}>
        <SectionTitle n={2} title={REPORT_LABELS.section2} />
        <BarRow label={REPORT_LABELS.weight} item={r.section2.weight} unit="kg" bar="muscle" />
        <BarRow label={REPORT_LABELS.skeletalMuscle} item={r.section2.skeletalMuscle} unit="kg" bar="muscle" />
        <BarRow label={REPORT_LABELS.bodyFat} item={r.section2.bodyFat} unit="kg" bar="muscle" />
        <BarRow
          label={REPORT_LABELS.visceralFat}
          item={r.section2.visceralFat}
          unit=""
          bar="muscle"
          decimals={0}
        />
      </View>

      <View style={styles.card}>
        <SectionTitle n={3} title={REPORT_LABELS.section3} />
        <BarRow label={REPORT_LABELS.bmi} item={r.section3.bmi} unit="" bar="gauge" />
        <BarRow label={REPORT_LABELS.bodyFatPct} item={r.section3.bodyFatPct} unit="%" bar="gauge" />
        <BarRow label={REPORT_LABELS.waistHip} item={r.section3.waistHip} unit="" bar="gauge" decimals={2} />
      </View>

      <View style={styles.card}>
        <SectionTitle n={4} title={REPORT_LABELS.section4} />
        <SegmentBody report={r} heightCm={client.height} />
      </View>

      <View style={styles.card}>
        <SectionTitle n={5} title={REPORT_LABELS.section5} />
        <View style={styles.evalHeader}>
          <Text style={[styles.evalCol, styles.evalColWide]}> </Text>
          <Text style={styles.evalColHead}>{REPORT_LABELS.evalUnder}</Text>
          <Text style={styles.evalColHead}>{REPORT_LABELS.evalNormal}</Text>
          <Text style={styles.evalColHead}>{REPORT_LABELS.evalOver}</Text>
        </View>
        {r.section5.map((row) => (
          <View key={row.label} style={styles.evalRow}>
            <Text style={[styles.evalCol, styles.evalColWide]}>{row.label}</Text>
            <Text style={styles.evalMark}>{row.status === 'under' ? '✔' : ''}</Text>
            <Text style={styles.evalMark}>{row.status === 'normal' ? '✔' : ''}</Text>
            <Text style={styles.evalMark}>{row.status === 'over' ? '✔' : ''}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <SectionTitle n={6} title={REPORT_LABELS.section6} />
        <ControlRow label={REPORT_LABELS.targetWeight} value={`${fmt(r.section6.targetWeight)} kg`} />
        <ControlRow label={REPORT_LABELS.weightControl} value={`${fmt(r.section6.weightControl)} kg`} />
        <ControlRow label={REPORT_LABELS.bmr} value={`${Math.round(r.section6.basalMetabolism)} kcal`} />
        <ControlRow label={REPORT_LABELS.score} value={`${Math.round(r.section6.comprehensiveScore)} / 100`} />
      </View>

      <View style={styles.card}>
        <SectionTitle n={7} title={REPORT_LABELS.section7} />
        <EvolutionChart data={chartData} />
      </View>

      <View style={styles.footer}>
        {company?.logoPath ? (
          <Image source={{ uri: resolveLocalUri(company.logoPath) }} style={styles.footerLogo} resizeMode="contain" />
        ) : null}
        <Text style={styles.footerText}>
          {companyName.toUpperCase()} | Relatório gerado em {new Date().toLocaleString('pt-BR')}
        </Text>
      </View>
    </View>
  );
}

function CompCell({ icon, label, value, unit }: { icon: string; label: string; value: RangeValue; unit: string }) {
  return (
    <View style={styles.compCell}>
      <Text style={styles.compIcon}>{icon}</Text>
      <Text style={styles.compLabel}>{label}</Text>
      <Text style={styles.compValue}>
        {fmt(value.value)} {unit}
      </Text>
    </View>
  );
}

function BarRow({
  label,
  item,
  unit,
  bar,
  decimals,
}: {
  label: string;
  item: RangeValue;
  unit: string;
  bar: 'muscle' | 'gauge';
  decimals?: number;
}) {
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      {bar === 'muscle' ? (
        <MuscleFatBar item={item} unit={unit} decimals={decimals} />
      ) : (
        <GaugeBar item={item} unit={unit} decimals={decimals} />
      )}
    </View>
  );
}

function ControlRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.controlRow}>
      <Text style={styles.controlLabel}>{label}</Text>
      <Text style={styles.controlValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  report: {
    backgroundColor: BG,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  fallback: { padding: 20, color: MUTED },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: BG,
  },
  companyBrand: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1.1 },
  logo: { width: 48, height: 40, backgroundColor: '#000', borderRadius: 4 },
  logoFallback: {
    width: 36,
    height: 36,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallbackText: { color: GOLD, fontWeight: '800', fontSize: 11 },
  companyName: { color: GOLD, fontWeight: '800', fontSize: 14, flexShrink: 1 },
  companyDivider: { width: 1, height: 40, backgroundColor: BORDER },
  companyContact: { flex: 1 },
  companyLine: { color: MUTED, fontSize: 10, lineHeight: 14 },
  companyTitle: { flex: 1.1, color: TEXT, fontWeight: '700', fontSize: 10, textAlign: 'right' },
  patientBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: CARD,
    padding: 10,
    margin: 8,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
  },
  patientText: { fontSize: 11, color: TEXT, fontWeight: '600' },
  card: {
    marginHorizontal: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    backgroundColor: CARD,
    overflow: 'hidden',
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  sectionNum: {
    width: 18,
    height: 18,
    borderRadius: 3,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumText: { color: BG, fontWeight: '800', fontSize: 11 },
  sectionTitle: { color: GOLD, fontWeight: '700', fontSize: 12, letterSpacing: 0.4 },
  compRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 6 },
  compCell: { flex: 1, minWidth: '22%', alignItems: 'center', padding: 8 },
  compIcon: { fontSize: 20 },
  compLabel: { fontSize: 10, color: MUTED, marginTop: 4, textAlign: 'center' },
  compValue: { fontSize: 15, fontWeight: '700', color: TEXT, marginTop: 4 },
  barRow: { paddingHorizontal: 10, marginBottom: 12 },
  barLabel: { fontSize: 11, fontWeight: '600', color: MUTED, marginBottom: 4 },
  mfRow: { gap: 4 },
  mfTrack: { height: 12, flexDirection: 'row', borderRadius: 2, overflow: 'hidden', position: 'relative' },
  mfZone: { height: '100%' },
  mfMarker: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: TEXT },
  mfValue: { fontSize: 12, fontWeight: '700', color: TEXT },
  gaugeRow: { gap: 4 },
  gaugeTrack: { height: 20, position: 'relative' },
  gaugePointer: { position: 'absolute', top: 10, marginLeft: -5 },
  gaugePointerText: { fontSize: 10, color: GOLD },
  gaugeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  gaugeScale: { fontSize: 10, color: MUTED },
  gaugeValue: { fontSize: 12, fontWeight: '700', color: TEXT },
  segmentContainer: { alignItems: 'center', paddingVertical: 8, backgroundColor: CARD },
  evalHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: 'rgba(141,110,60,0.45)',
    paddingBottom: 6,
    paddingHorizontal: 10,
  },
  evalRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(141,110,60,0.25)',
  },
  evalCol: { flex: 1, fontSize: 11, textAlign: 'center', color: TEXT },
  evalColWide: { flex: 2, textAlign: 'left', fontWeight: '600' },
  evalColHead: { flex: 1, fontSize: 11, textAlign: 'center', color: GOLD, fontWeight: '600' },
  evalMark: { flex: 1, fontSize: 12, textAlign: 'center', color: GOLD, fontWeight: '700' },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(141,110,60,0.35)',
  },
  controlLabel: { fontSize: 12, color: MUTED },
  controlValue: { fontSize: 13, fontWeight: '700', color: TEXT },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  footerLogo: { width: 24, height: 16, backgroundColor: '#000', borderRadius: 2 },
  footerText: { fontSize: 10, color: GOLD },
});
