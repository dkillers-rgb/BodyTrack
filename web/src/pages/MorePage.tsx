import { Link } from 'react-router-dom';

export default function MorePage() {
  return (
    <div>
      <div className="page-header">
        <h1>Mais</h1>
        <p>Configurações e opções adicionais</p>
      </div>

      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <Link to="/company" className="btn-secondary" style={{ textAlign: 'left' }}>
          Dados da empresa
        </Link>
        <Link to="/manual-entry" className="btn-secondary" style={{ textAlign: 'left' }}>
          Nova avaliação manual
        </Link>
      </div>
    </div>
  );
}
