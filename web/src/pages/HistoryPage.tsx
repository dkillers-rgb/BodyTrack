import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Evaluation } from '../services/api';

export default function HistoryPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.evaluations
      .list()
      .then(setEvaluations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Carregando...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Histórico de avaliações</h1>
        <p>Todas as avaliações realizadas</p>
      </div>

      <div className="mobile-only list-stack">
        {evaluations.map((ev) => (
          <article key={ev.id} className="list-card">
            <div className="list-card-header">
              <Link to={`/clients/${ev.clientId}`}>
                <strong>{ev.client?.name || 'Cliente'}</strong>
              </Link>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {new Date(ev.examDate).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="list-card-meta">
              <span>Peso: {ev.weight} kg</span>
              <span>Músculo: {ev.skeletalMuscle} kg</span>
              <span>Gordura: {ev.bodyFat} kg</span>
              {ev.visceralFat != null && <span>Visceral: {ev.visceralFat}</span>}
            </div>
            {ev.aiAnalysis && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>{ev.aiAnalysis}</p>
            )}
          </article>
        ))}
        {evaluations.length === 0 && (
          <p style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>Nenhuma avaliação registrada.</p>
        )}
      </div>

      <div className="card desktop-only">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Data do exame</th>
                <th>Peso</th>
                <th>Músculo</th>
                <th>Gordura</th>
                <th>Análise IA</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((ev) => (
                <tr key={ev.id}>
                  <td>
                    <Link to={`/clients/${ev.clientId}`}>{ev.client?.name || '—'}</Link>
                  </td>
                  <td>{new Date(ev.examDate).toLocaleString('pt-BR')}</td>
                  <td>{ev.weight} kg</td>
                  <td>{ev.skeletalMuscle} kg</td>
                  <td>{ev.bodyFat} kg</td>
                  <td style={{ maxWidth: 300, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {ev.aiAnalysis || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {evaluations.length === 0 && (
          <p style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>Nenhuma avaliação registrada.</p>
        )}
      </div>
    </div>
  );
}
