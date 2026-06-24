import { forwardRef } from 'react';
import { ClientDashboard } from '../services/api';
import EvolutionChart from './EvolutionChart';
import reportReferenceImage from '../assets/report-reference.jpg';
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

function getBodyFatCategory(bodyFatPercent: number): string {
  if (bodyFatPercent < 10) return 'Magreza';
  if (bodyFatPercent < 18) return 'Normal';
  if (bodyFatPercent < 25) return 'Sobrepeso';
  return 'Obesidade';
}

const ClientReport = forwardRef<HTMLDivElement, Props>(function ClientReport({ data }, ref) {
  const { client, evaluations, chartData, analysis, summary } = data;
  const generatedAt = new Date().toLocaleString('pt-BR');
  const latestBodyFatPercent =
    summary.latestWeight && summary.latestFat != null
      ? (summary.latestFat / summary.latestWeight) * 100
      : undefined;
  const obesityCategory =
    latestBodyFatPercent != null ? getBodyFatCategory(latestBodyFatPercent) : '—';
  const targetWeight = summary.latestWeight != null ? summary.latestWeight - 1.5 : undefined;
  const basalMetabolism = summary.latestWeight != null ? Math.round(summary.latestWeight * 24) : undefined;
  const healthyPoints = latestBodyFatPercent != null ? Math.max(50, Math.round(100 - latestBodyFatPercent)) : undefined;

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

      <section className="client-report__section client-report__reference-section">
        <div className="client-report__reference-grid">
          <article className="client-report__reference-card">
            <div className="client-report__reference-card-header">
              <span>4</span>
              <h4>Segmental Muscles</h4>
            </div>
            <div className="client-report__reference-card-body">
              <img className="client-report__reference-image" src={reportReferenceImage} alt="Referência seção 4" crossOrigin="anonymous" />
              <p className="client-report__reference-label">Seção 4 estática</p>
              <p>Valores fixos de referência para composição muscular.</p>
              <ul className="client-report__reference-list">
                <li>
                  <span>Peso</span>
                  <strong>{summary.latestWeight != null ? `${summary.latestWeight.toFixed(1)} kg` : '—'}</strong>
                </li>
                <li>
                  <span>Músculo esquelético</span>
                  <strong>{summary.latestMuscle != null ? `${summary.latestMuscle.toFixed(1)} kg` : '—'}</strong>
                </li>
                <li>
                  <span>Gordura subcutânea</span>
                  <strong>{summary.latestFat != null ? `${summary.latestFat.toFixed(1)} kg` : '—'}</strong>
                </li>
                <li>
                  <span>Gordura (%)</span>
                  <strong>
                    {summary.latestWeight && summary.latestFat != null
                      ? bodyFatPercent(summary.latestWeight, summary.latestFat)
                      : '—'}
                  </strong>
                </li>
              </ul>
            </div>
          </article>

          <article className="client-report__reference-card">
            <div className="client-report__reference-card-header">
              <span>5</span>
              <h4>Diagnóstico de Obesidade</h4>
            </div>
            <div className="client-report__reference-card-body">
              <img className="client-report__reference-image" src={reportReferenceImage} alt="Referência seção 5" crossOrigin="anonymous" />
              <p className="client-report__reference-label">Seção 5 estática</p>
              <p>Referência fixa para classificação de obesidade.</p>
              <ul className="client-report__reference-list">
                <li>
                  <span>Percentual de gordura</span>
                  <strong>
                    {summary.latestWeight && summary.latestFat != null
                      ? bodyFatPercent(summary.latestWeight, summary.latestFat)
                      : '—'}
                  </strong>
                </li>
                <li>
                  <span>Categoria</span>
                  <strong>{obesityCategory}</strong>
                </li>
                <li>
                  <span>Estado</span>
                  <strong>{obesityCategory === 'Normal' ? 'Normal' : 'Requer atenção'}</strong>
                </li>
              </ul>
            </div>
          </article>

          <article className="client-report__reference-card">
            <div className="client-report__reference-card-header">
              <span>7</span>
              <h4>Controle de Peso</h4>
            </div>
            <div className="client-report__reference-card-body">
              <img className="client-report__reference-image" src={reportReferenceImage} alt="Referência seção 7" crossOrigin="anonymous" />
              <p className="client-report__reference-label">Seção 7 estática</p>
              <p>Meta e controle de peso fixos para impressão.</p>
              <ul className="client-report__reference-list">
                <li>
                  <span>Peso alvo</span>
                  <strong>{targetWeight != null ? `${targetWeight.toFixed(1)} kg` : '—'}</strong>
                </li>
                <li>
                  <span>Controle de peso</span>
                  <strong>{targetWeight != null ? '−1.5 kg' : '—'}</strong>
                </li>
                <li>
                  <span>Controle de gordura</span>
                  <strong>{summary.latestFat != null ? '−1.5 kg' : '—'}</strong>
                </li>
                <li>
                  <span>Metabolismo basal</span>
                  <strong>{basalMetabolism != null ? `${basalMetabolism} kcal` : '—'}</strong>
                </li>
              </ul>
            </div>
          </article>
        </div>
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

      <section className="client-report__section client-report__final-image-section">
        <img
          className="client-report__final-image"
          src={reportReferenceImage}
          alt="Imagem final do relatório"
          crossOrigin="anonymous"
        />
      </section>

      <footer className="client-report__footer">
        Relatório gerado em {generatedAt}
      </footer>
    </div>
  );
});

export default ClientReport;
