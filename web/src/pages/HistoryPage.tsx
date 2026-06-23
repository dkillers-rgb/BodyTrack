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

      <div className="card">
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
                  <Link to={`/clients/${ev.clientId}`}>
                    {ev.client?.name || '—'}
                  </Link>
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
        {evaluations.length === 0 && (
          <p style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>
            Nenhuma avaliação registrada.
          </p>
        )}
      </div>
    </div>
  );
}
