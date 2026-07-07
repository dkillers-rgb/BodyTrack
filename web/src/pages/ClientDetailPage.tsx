import { useEffect, useRef, useState, FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { api, ClientDashboard, ClientInput } from '../services/api';
import EvolutionChart from '../components/EvolutionChart';
import ClientReport from '../components/ClientReport';
import { exportDashboardToPdf, printDashboardReport } from '../utils/exportPdf';

const emptyForm: ClientInput = { externalId: '', name: '', gender: 'MALE', age: 0, height: 0, phone: '' };

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
      externalId: data.client.externalId,
      name: data.client.name,
      gender: data.client.gender,
      age: data.client.age,
      height: data.client.height,
      phone: data.client.phone ?? '',
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
    if (!form.externalId.trim()) {
      setError('Informe o ID do cliente.');
      return;
    }
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
    if (!data) return;
    setExportingPdf(true);
    setError('');
    try {
      const slug = data.client.externalId || String(data.client.id);
      await exportDashboardToPdf(data, `relatorio-${slug}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const handlePrint = () => {
    if (!data) return;
    try {
      printDashboardReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao imprimir');
    }
  };

  if (loading) return <div className="loading">Carregando...</div>;
  if (!data) return <div className="error">Cliente não encontrado</div>;

  const { client, evaluations, chartData, analysis, summary } = data;

  return (
    <div className="client-detail-page">
      <div className="page-header no-print page-header-row">
        <div>
          <h1>{client.name}</h1>
          <p className="client-meta-line">
            <span>
              ID: <code>{client.externalId}</code>
            </span>
            <span>
              {client.gender === 'MALE' ? 'Masculino' : client.gender === 'FEMALE' ? 'Feminino' : 'Outro'}
              {' · '}{client.age} anos · {client.height} cm
              {client.phone ? ` · ${client.phone}` : ''}
            </span>
          </p>
        </div>
        {!editing && (
          <div className="page-header-actions">
            <button className="btn-primary" onClick={handleExportPdf} disabled={exportingPdf}>
              {exportingPdf ? 'Gerando PDF...' : 'Exportar PDF'}
            </button>
            <button className="btn-secondary" onClick={handlePrint}>
              Imprimir
            </button>
            <button className="btn-secondary" onClick={startEdit}>
              Editar dados
            </button>
          </div>
        )}
      </div>

      {error && !editing && <p className="error no-print" style={{ marginBottom: 16 }}>{error}</p>}

      {editing && (
        <div className="card no-print" style={{ marginBottom: 24 }}>
          <h3 className="card-title">Editar cliente</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label>ID *</label>
                <input value={form.externalId} onChange={(e) => setForm({ ...form, externalId: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Nome *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Telefone</label>
                <input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
            <div className="form-actions">
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

      <div className="grid-3 no-print" style={{ marginBottom: 24 }}>
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
        <div className="card no-print" style={{ marginBottom: 24, borderLeft: '4px solid var(--primary)' }}>
          <h3 className="card-title">Análise</h3>
          <p>{analysis}</p>
        </div>
      )}

      <div className="no-print" style={{ marginBottom: 24 }}>
        <EvolutionChart data={chartData} />
      </div>

      <div className="card printable-report" style={{ marginBottom: 24 }}>
        <ClientReport ref={reportRef} data={data} />
      </div>

      <div className="card no-print">
        <h3 className="card-title">Histórico de avaliações</h3>
        <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Peso</th>
              <th>Músculo</th>
              <th>Gordura</th>
              <th>Visceral</th>
            </tr>
          </thead>
          <tbody>
            {[...evaluations].reverse().map((ev) => (
              <tr key={ev.id}>
                <td>{new Date(ev.examDate).toLocaleDateString('pt-BR')}</td>
                <td>{ev.weight} kg</td>
                <td>{ev.skeletalMuscle} kg</td>
                <td>{ev.bodyFat} kg</td>
                <td>{ev.visceralFat ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
