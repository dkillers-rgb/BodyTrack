import type { ReactNode } from 'react';
import type { RangeValue, BodbodyReportSnapshot } from '../types/bodbodyReportTypes';
import type { ClientDashboard } from '../services/api';
import { REPORT_LABELS } from '../services/bodbodyReportLabels';
import {
  buildSilhouetteGeometry,
  metricsFromReport,
  SILHOUETTE_THEME_SCREEN,
} from '../utils/bodySilhouetteEngine';
import EvolutionChart from './EvolutionChart';
import { loadCompanySettings } from '../services/companyStorage';
import './BodbodyReportView.css';

const GOLD = '#C7A25A';
const TEXT = '#F5F5F5';
const MUTED = '#A8B5C4';

function fmt(n: number, d = 1) {
  return n.toFixed(d);
}

function zonePos(item: RangeValue, min: number, max: number) {
  const span = max - min || 1;
  return Math.max(0, Math.min(100, ((item.value - min) / span) * 100));
}

function MuscleFatBar({ item, unit, decimals = 1 }: { item: RangeValue; unit: string; decimals?: number }) {
  const pos = zonePos(item, item.low * 0.75, item.high * 1.25);
  return (
    <div className="bb-mf">
      <div className="bb-mf-track">
        <div className="bb-mf-low" />
        <div className="bb-mf-normal" />
        <div className="bb-mf-over" />
        <div className="bb-mf-fill" style={{ left: `${pos}%` }} />
      </div>
      <div className="bb-mf-val">
        {fmt(item.value, decimals)}
        {unit ? ` ${unit}` : ''}
      </div>
    </div>
  );
}

function GaugeBar({ item, unit, decimals = 1 }: { item: RangeValue; unit: string; decimals?: number }) {
  const pos = zonePos(item, item.low, item.high);
  return (
    <div className="bb-gauge">
      <div className="bb-gauge-bar" />
      <div className="bb-gauge-pointer" style={{ left: `${pos}%` }}>
        ▼
      </div>
      <div className="bb-gauge-labels">
        <span>{fmt(item.low, decimals)}</span>
        <b>
          {fmt(item.value, decimals)}
          {unit}
        </b>
        <span>{fmt(item.high, decimals)}</span>
      </div>
    </div>
  );
}

const SEGMENT_PCT_FACTOR = {
  leftArm: 1.719,
  rightArm: 1.719,
  trunk: 0.231,
  leftLeg: 0.751,
  rightLeg: 0.735,
} as const;

function segPct(muscle: number, sm: number, key: keyof typeof SEGMENT_PCT_FACTOR) {
  if (sm <= 0) return '0.0%';
  const v = Math.round((muscle / sm) * 100 * SEGMENT_PCT_FACTOR[key] * 10) / 10;
  return `${v.toFixed(1)}%`;
}

function SegmentSvg({ r, heightCm }: { r: BodbodyReportSnapshot; heightCm: number }) {
  const s = r.section4;
  const sm = r.section2.skeletalMuscle.value;
  const kg = (n: number) => `${n.toFixed(1)} kg`;
  const stroke = SILHOUETTE_THEME_SCREEN.stroke;
  const { path, anchors: a, head } = buildSilhouetteGeometry(metricsFromReport(r, heightCm));

  const callout = (lx: number, ly: number, ax: number, ay: number) => {
    const elbow = lx < ax ? ax - 14 : ax + 14;
    return (
      <path
        d={`M ${lx} ${ly} L ${elbow} ${ly} L ${ax} ${ay}`}
        fill="none"
        stroke={stroke}
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.85"
      />
    );
  };

  const label = (x: number, y: number, weight: string, percent: string, side?: string) => (
    <>
      <text x={x} y={y} fontSize="10" fontWeight="700" fill={TEXT} textAnchor="middle">{weight}</text>
      <text x={x} y={y + 14} fontSize="10" fontWeight="600" fill={GOLD} textAnchor="middle">{percent}</text>
      {side ? <text x={x} y={y + 28} fontSize="9" fill={MUTED} textAnchor="middle">{side}</text> : null}
    </>
  );

  return (
    <div className="bb-seg-wrap">
      <svg viewBox="0 0 220 520" width="100%" height="280" className="bb-seg-svg">
        <ellipse cx="110" cy="42" rx={head.rx} ry={head.ry} fill="none" stroke={stroke} strokeWidth="2" />
        <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={a.leftShoulder.x} cy={a.leftShoulder.y} r="4" fill={stroke} />
        <circle cx={a.rightShoulder.x} cy={a.rightShoulder.y} r="4" fill={stroke} />
        <circle cx={a.chestCenter.x} cy={a.chestCenter.y} r="4" fill={stroke} />
        <circle cx={a.leftThigh.x} cy={a.leftThigh.y} r="4" fill={stroke} />
        <circle cx={a.rightThigh.x} cy={a.rightThigh.y} r="4" fill={stroke} />
        {callout(28, 100, a.leftShoulder.x, a.leftShoulder.y)}
        {callout(192, 100, a.rightShoulder.x, a.rightShoulder.y)}
        {callout(28, 340, a.leftThigh.x, a.leftThigh.y)}
        {callout(192, 340, a.rightThigh.x, a.rightThigh.y)}
        {label(28, 92, kg(s.leftArm.muscle), segPct(s.leftArm.muscle, sm, 'leftArm'), REPORT_LABELS.sideLeft)}
        {label(192, 92, kg(s.rightArm.muscle), segPct(s.rightArm.muscle, sm, 'rightArm'), REPORT_LABELS.sideRight)}
        {label(a.chestCenter.x, a.chestCenter.y + 18, kg(s.trunk.muscle), segPct(s.trunk.muscle, sm, 'trunk'))}
        {label(28, 332, kg(s.leftLeg.muscle), segPct(s.leftLeg.muscle, sm, 'leftLeg'), REPORT_LABELS.sideLeft)}
        {label(192, 332, kg(s.rightLeg.muscle), segPct(s.rightLeg.muscle, sm, 'rightLeg'), REPORT_LABELS.sideRight)}
      </svg>
    </div>
  );
}

export default function BodbodyReportView({ data }: { data: ClientDashboard }) {
  const r = data.bodbodyReport;
  if (!r) return <div className="bb-report"><p>Sem dados de relatório Bodbody.</p></div>;

  const company = loadCompanySettings();
  const companyName = company.name.trim() || 'BodyTrack';
  const addressParts = company.address.split(',').map((p) => p.trim()).filter(Boolean);
  const g = data.client.gender === 'MALE' ? 'Masculino' : data.client.gender === 'FEMALE' ? 'Feminino' : 'Outro';
  const exam = r.examTime
    ? `${r.examTime} · ${r.examDate.split('-').reverse().join('.')}`
    : new Date(`${r.examDate}T12:00:00`).toLocaleDateString('pt-BR');

  return (
    <div className="bb-report">
      <div className="bb-header">
        <div className="bb-header-brand">
          {company.logoDataUri ? (
            <img className="bb-logo" src={company.logoDataUri} alt="Logo" />
          ) : (
            <div className="bb-logo-fallback">BT</div>
          )}
          <div className="bb-clinic-name">{companyName}</div>
        </div>
        <div className="bb-header-divider" />
        <div>
          {addressParts.map((line) => (
            <div key={line} className="bb-clinic-meta">{line}</div>
          ))}
          {company.phone ? <div className="bb-clinic-meta">Tel: {company.phone}</div> : null}
        </div>
        <div className="bb-header-title">{REPORT_LABELS.reportSubtitle.toUpperCase()}</div>
      </div>

      <div className="bb-patient">
        <span>ID {data.client.externalId}</span>
        <span>{data.client.name}</span>
        <span>{g}</span>
        <span>{data.client.age} anos</span>
        <span>{data.client.height} cm</span>
        <span>{exam}</span>
      </div>

      <Section n={1} title={REPORT_LABELS.section1}>
        <div className="bb-comp-grid">
          <Comp icon="💧" label={REPORT_LABELS.moisture} item={r.section1.moisture} unit="kg" />
          <Comp icon="🧬" label={REPORT_LABELS.protein} item={r.section1.protein} unit="kg" />
          <Comp icon="🦴" label={REPORT_LABELS.minerals} item={r.section1.minerals} unit="kg" />
          <Comp icon="🔴" label={REPORT_LABELS.bodyFat} item={r.section1.bodyFat} unit="kg" />
        </div>
      </Section>

      <div className="bb-row3">
        <Section n={2} title={REPORT_LABELS.section2}>
          <Bar label={REPORT_LABELS.weight} item={r.section2.weight} unit="kg" type="muscle" />
          <Bar label={REPORT_LABELS.skeletalMuscle} item={r.section2.skeletalMuscle} unit="kg" type="muscle" />
          <Bar label={REPORT_LABELS.bodyFat} item={r.section2.bodyFat} unit="kg" type="muscle" />
          <Bar label={REPORT_LABELS.visceralFat} item={r.section2.visceralFat} unit="" type="muscle" decimals={0} />
        </Section>
        <Section n={3} title={REPORT_LABELS.section3}>
          <Bar label={REPORT_LABELS.bmi} item={r.section3.bmi} unit="" type="gauge" />
          <Bar label={REPORT_LABELS.bodyFatPct} item={r.section3.bodyFatPct} unit="%" type="gauge" />
          <Bar label={REPORT_LABELS.waistHip} item={r.section3.waistHip} unit="" type="gauge" decimals={2} />
        </Section>
        <Section n={4} title={REPORT_LABELS.section4}>
          <SegmentSvg r={r} heightCm={data.client.height} />
        </Section>
      </div>

      <div className="bb-row2">
        <Section n={5} title={REPORT_LABELS.section5}>
          <table className="bb-eval">
            <thead>
              <tr>
                <th></th>
                <th>{REPORT_LABELS.evalUnder}</th>
                <th>{REPORT_LABELS.evalNormal}</th>
                <th>{REPORT_LABELS.evalOver}</th>
              </tr>
            </thead>
            <tbody>
              {r.section5.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.status === 'under' ? '✔' : ''}</td>
                  <td>{row.status === 'normal' ? '✔' : ''}</td>
                  <td>{row.status === 'over' ? '✔' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
        <Section n={6} title={REPORT_LABELS.section6}>
          <div className="bb-wc">
            <div><span>{REPORT_LABELS.targetWeight}</span><b>{fmt(r.section6.targetWeight)} kg</b></div>
            <div><span>{REPORT_LABELS.weightControl}</span><b>{fmt(r.section6.weightControl)} kg</b></div>
            <div><span>{REPORT_LABELS.bmr}</span><b>{Math.round(r.section6.basalMetabolism)} kcal</b></div>
            <div><span>{REPORT_LABELS.score}</span><b>{Math.round(r.section6.comprehensiveScore)} / 100</b></div>
          </div>
        </Section>
      </div>

      <Section n={7} title={REPORT_LABELS.section7}>
        <EvolutionChart data={data.chartData} />
      </Section>

      <div className="bb-footer">
        {company.logoDataUri ? <img className="bb-footer-logo" src={company.logoDataUri} alt="" /> : null}
        <span>
          {companyName.toUpperCase()} | Relatório gerado em {new Date().toLocaleString('pt-BR')}
        </span>
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="bb-section">
      <div className="bb-sh">
        <span className="bb-num">{n}</span>
        <span>{title.toUpperCase()}</span>
      </div>
      <div className="bb-sb">{children}</div>
    </div>
  );
}

function Comp({ icon, label, item, unit }: { icon: string; label: string; item: RangeValue; unit: string }) {
  return (
    <div className="bb-comp">
      <div className="bb-ci">{icon}</div>
      <div className="bb-cl">{label}</div>
      <div className="bb-cv">
        {fmt(item.value)} {unit}
      </div>
    </div>
  );
}

function Bar({
  label,
  item,
  unit,
  type,
  decimals,
}: {
  label: string;
  item: RangeValue;
  unit: string;
  type: 'muscle' | 'gauge';
  decimals?: number;
}) {
  return (
    <div className="bb-br">
      <div className="bb-bl">{label}</div>
      {type === 'muscle' ? (
        <MuscleFatBar item={item} unit={unit} decimals={decimals} />
      ) : (
        <GaugeBar item={item} unit={unit} decimals={decimals} />
      )}
    </div>
  );
}
