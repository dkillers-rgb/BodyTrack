import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ClientWithMeta } from '../services/api';

export default function ReportsPage() {
  const [clients, setClients] = useState<ClientWithMeta[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.clients
      .list()
      .then(setClients)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Carregando...</div>;

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1>Relatórios</h1>
        <p>Selecione um cliente para ver a evolução detalhada</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrar por nome"
          style={{ width: '100%', padding: '8px 12px', fontSize: '1rem' }}
        />
      </div>

      <div className="grid-2">
        {filteredClients.map((c) => (
          <Link key={c.id} to={`/clients/${c.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h3 style={{ marginBottom: 8 }}>{c.name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {c._count.evaluations} avaliação(ões)
              {c.evaluations[0] && (
                <> · Último exame: {new Date(c.evaluations[0].examDate).toLocaleDateString('pt-BR')}</>
              )}
            </p>
            {c.evaluations[0] && (
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                <span className="badge badge-success">Peso: {c.evaluations[0].weight} kg</span>
                <span className="badge">Músculo: {c.evaluations[0].skeletalMuscle} kg</span>
                <span className="badge">Gordura: {c.evaluations[0].bodyFat} kg</span>
              </div>
            )}
          </Link>
        ))}
      </div>

      {clients.length === 0 && (
        <div className="card">
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
            Cadastre clientes e realize avaliações para gerar relatórios.
          </p>
        </div>
      )}
    </div>
  );
}
