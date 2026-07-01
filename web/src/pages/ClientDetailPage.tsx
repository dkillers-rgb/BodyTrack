import { useEffect, useRef, useState, FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { api, ClientDashboard, ClientInput } from '../services/api';
import EvolutionChart from '../components/EvolutionChart';
import ClientReport from '../components/ClientReport';
import { exportElementToPdf } from '../utils/exportPdf';

const emptyForm: ClientInput = { name: '', gender: 'MALE', age: 0, height: 0 };

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ClientDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ClientInput>(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const loadData = () => {
    if (!id) return;
    const clientId = parseInt(id, 10);
    if (Number.isNaN(clientId)) return;
    setLoading(true);
    api.reports
      .clientDashboard(clientId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const startEdit = () => {
    if (!data) return;
    setForm({
      name: data.client.name,
      gender: data.client.gender,
      age: data.client.age,
      height: data.client.height,
    });
    setError('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    setError('');
    try {
      await api.clients.update(data.client.id, form);
      setEditing(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (!reportRef.current || !data) return;
    const container = reportRef.current.parentElement;
    if (!container) return;

    setExportingPdf(true);
    setError('');

    const previousStyle = container.style.cssText;
    container.style.cssText =
      'position: fixed; left: 0; top: 0; width: 794px; z-index: 9999; opacity: 0; pointer-events: none;';

    try {
      const slug = data.client.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
      await exportElementToPdf(reportRef.current, `relatorio-${slug || 'cliente'}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar PDF');
    } finally {
      container.style.cssText = previousStyle;
      setExportingPdf(false);
    }
  };

  if (loading) return <div className="loading">Carregando...</div>;
  if (!data) return <div className="error">Cliente não encontrado</div>;

  const { client, evaluations, chartData, analysis, summary } = data;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>{client.name}</h1>
          <p>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              ID: <code>{client.id}</code>
            </span>
            {' · '}
            {client.gender === 'MALE' ? 'Masculino' : client.gender === 'FEMALE' ? 'Feminino' : 'Outro'}
            {' · '}{client.age} anos · {client.height} cm
          </p>
        </div>
        {!editing && (
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn-primary" onClick={handleExportPdf} disabled={exportingPdf}>
              {exportingPdf ? 'Gerando PDF...' : 'Imprimir relatório (PDF)'}
            </button>
            <button className="btn-secondary" onClick={startEdit}>
              Editar dados
            </button>
          </div>
        )}
      </div>

      {error && !editing && (
        <p className="error" style={{ marginBottom: 16 }}>{error}</p>
      )}

      <div
        aria-hidden="true"
        style={{ position: 'fixed', left: '-9999px', top: 0, width: 794, pointerEvents: 'none' }}
      >
        <ClientReport ref={reportRef} data={data} />
      </div>

      {editing && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="card-title">Editar cliente</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label>Nome</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Sexo</label>
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as ClientInput['gender'] })}>
                  <option value="MALE">Masculino</option>
                  <option value="FEMALE">Feminino</option>
                  <option value="OTHER">Outro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Idade</label>
                <input type="number" value={form.age || ''} onChange={(e) => setForm({ ...form, age: parseInt(e.target.value) })} required min={1} />
              </div>
              <div className="form-group">
                <label>Altura (cm)</label>
                <input type="number" value={form.height || ''} onChange={(e) => setForm({ ...form, height: parseFloat(e.target.value) })} required min={50} step={0.1} />
              </div>
            </div>
            {error && <p className="error">{error}</p>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button type="button" className="btn-secondary" onClick={cancelEdit}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value">{summary.latestWeight ?? '—'}</div>
          <div className="stat-label">Peso atual (kg)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.latestMuscle ?? '—'}</div>
          <div className="stat-label">Músculo (kg)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {summary.latestWeight && summary.latestFat != null
              ? `${((summary.latestFat / summary.latestWeight) * 100).toFixed(1)}%`
              : '—'}
          </div>
          <div className="stat-label">Gordura corporal (%)</div>
        </div>
      </div>

      {analysis && (
        <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid var(--primary)' }}>
          <h3 className="card-title">Análise IA</h3>
          <p>{analysis}</p>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <EvolutionChart data={chartData} />
      </div>

      <div className="card">
        <h3 className="card-title">Histórico de avaliações</h3>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Peso</th>
              <th>Músculo</th>
              <th>Gordura</th>
            </tr>
          </thead>
          <tbody>
            {[...evaluations].reverse().map((ev) => (
              <tr key={ev.id}>
                <td>{new Date(ev.examDate).toLocaleDateString('pt-BR')}</td>
                <td>{ev.weight} kg</td>
                <td>{ev.skeletalMuscle} kg</td>
                <td>{ev.bodyFat} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
