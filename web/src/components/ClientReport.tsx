import { forwardRef } from 'react';
import { ClientDashboard } from '../services/api';
import EvolutionChart from './EvolutionChart';
import './ClientReport.css';

interface Props {
  data: ClientDashboard;
}

function formatGender(gender: string): string {
  if (gender === 'MALE') return 'Masculino';
  if (gender === 'FEMALE') return 'Feminino';
  return 'Outro';
}

function bodyFatPercent(weight: number, bodyFat: number): string {
  if (weight <= 0) return '—';
  return `${((bodyFat / weight) * 100).toFixed(1)}%`;
}

const ClientReport = forwardRef<HTMLDivElement, Props>(function ClientReport({ data }, ref) {
  const { client, evaluations, chartData, analysis, summary } = data;
  const generatedAt = new Date().toLocaleString('pt-BR');

  return (
    <div ref={ref} className="client-report">
      <header className="client-report__header">
        <div className="client-report__brand">BodyTrack — Relatório de Composição Corporal</div>
        <h2 className="client-report__title">{client.name}</h2>
        <p className="client-report__meta">
          {formatGender(client.gender)} · {client.age} anos · {client.height} cm ·{' '}
          {summary.totalEvaluations} avaliação{summary.totalEvaluations !== 1 ? 'ões' : ''}
        </p>
      </header>

      <div className="client-report__stats">
        <div className="client-report__stat">
          <div className="client-report__stat-value">{summary.latestWeight ?? '—'}</div>
          <div className="client-report__stat-label">Peso atual (kg)</div>
        </div>
        <div className="client-report__stat">
          <div className="client-report__stat-value">{summary.latestMuscle ?? '—'}</div>
          <div className="client-report__stat-label">Músculo esquelético (kg)</div>
        </div>
        <div className="client-report__stat">
          <div className="client-report__stat-value">
            {summary.latestWeight && summary.latestFat != null
              ? bodyFatPercent(summary.latestWeight, summary.latestFat)
              : '—'}
          </div>
          <div className="client-report__stat-label">Gordura corporal (%)</div>
        </div>
      </div>

      <section className="client-report__section">
        <EvolutionChart data={chartData} />
      </section>

      {analysis && (
        <section className="client-report__section">
          <h3 className="client-report__section-title">Análise de evolução</h3>
          <p className="client-report__analysis">{analysis}</p>
        </section>
      )}

      <section className="client-report__section">
        <h3 className="client-report__section-title">Histórico de avaliações</h3>
        <table className="client-report__table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Peso (kg)</th>
              <th>Músculo (kg)</th>
              <th>Gordura (kg)</th>
              <th>Gordura (%)</th>
            </tr>
          </thead>
          <tbody>
            {[...evaluations].reverse().map((ev) => (
              <tr key={ev.id}>
                <td>{new Date(ev.examDate).toLocaleDateString('pt-BR')}</td>
                <td>{ev.weight}</td>
                <td>{ev.skeletalMuscle}</td>
                <td>{ev.bodyFat}</td>
                <td>{bodyFatPercent(ev.weight, ev.bodyFat)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="client-report__footer">
        Relatório gerado em {generatedAt}
      </footer>
    </div>
  );
});

export default ClientReport;
