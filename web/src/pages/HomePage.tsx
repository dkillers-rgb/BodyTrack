import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Overview } from '../services/api';

export default function HomePage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.reports
      .overview()
      .then(setOverview)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Carregando...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Visão geral das avaliações corporais</p>
      </div>

      <div className="grid-3" style={{ marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-value">{overview?.totalClients ?? 0}</div>
          <div className="stat-label">Clientes cadastrados</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{overview?.totalEvaluations ?? 0}</div>
          <div className="stat-label">Avaliações realizadas</div>
        </div>
        <Link to="/scan" className="stat-card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
          <div className="stat-value">📷</div>
          <div className="stat-label">Nova leitura de QR Code</div>
        </Link>
      </div>

      <div className="card">
        <h3 className="card-title">Avaliações recentes</h3>
        {overview?.recentEvaluations.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>
            Nenhuma avaliação ainda.{' '}
            <Link to="/scan">Faça a primeira leitura</Link>.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Data</th>
                <th>Peso</th>
                <th>Músculo</th>
                <th>Gordura</th>
              </tr>
            </thead>
            <tbody>
              {overview?.recentEvaluations.map((ev) => (
                <tr key={ev.id}>
                  <td>
                    <Link to={`/clients/${ev.client.id}`}>{ev.client.name}</Link>
                  </td>
                  <td>{new Date(ev.examDate).toLocaleDateString('pt-BR')}</td>
                  <td>{ev.weight} kg</td>
                  <td>{ev.skeletalMuscle} kg</td>
                  <td>{ev.bodyFat} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
