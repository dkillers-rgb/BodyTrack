import { useEffect, useState, FormEvent, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api, ClientWithMeta, ClientInput } from '../services/api';
import './ClientsPage.css';

const emptyForm: ClientInput = { name: '', gender: 'MALE', age: 0, height: 0 };

function matchesSearch(client: ClientWithMeta, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const genderLabel =
    client.gender === 'MALE' ? 'masculino' : client.gender === 'FEMALE' ? 'feminino' : 'outro';

  return (
    client.id.toString().includes(q) ||
    client.name.toLowerCase().includes(q) ||
    genderLabel.includes(q) ||
    String(client.age).includes(q) ||
    String(client.height).includes(q)
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ClientInput>(emptyForm);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const filteredClients = useMemo(
    () => clients.filter((c) => matchesSearch(c, search)),
    [clients, search]
  );

  const loadClients = () => {
    api.clients
      .list()
      .then(setClients)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadClients(); }, []);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  };

  const openEditForm = (client: ClientWithMeta) => {
    setEditingId(client.id);
    setForm({
      name: client.name,
      gender: client.gender,
      age: client.age,
      height: client.height,
    });
    setError('');
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.clients.update(editingId, form);
      } else {
        await api.clients.create(form);
      }
      cancelForm();
      loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir este cliente e todas as avaliações?')) return;
    await api.clients.delete(id);
    loadClients();
  };

  if (loading) return <div className="loading">Carregando...</div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Clientes</h1>
          <p>Gerencie o cadastro de clientes</p>
        </div>
        <button className="btn-primary" onClick={() => (showForm && !editingId ? cancelForm() : openCreateForm())}>
          {showForm && !editingId ? 'Cancelar' : '+ Novo cliente'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="card-title">{editingId ? 'Editar cliente' : 'Cadastrar cliente'}</h3>
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
              <button type="submit" className="btn-primary">
                {editingId ? 'Salvar alterações' : 'Salvar'}
              </button>
              <button type="button" className="btn-secondary" onClick={cancelForm}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="clients-search">
        <input
          type="search"
          placeholder="Buscar por nome, ID, idade ou altura..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar clientes"
        />
        {search && (
          <span className="clients-search-count">
            {filteredClients.length} de {clients.length} cliente(s)
          </span>
        )}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Sexo</th>
              <th>Idade</th>
              <th>Altura</th>
              <th>Avaliações</th>
              <th>Último peso</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((c) => (
              <tr key={c.id}>
                <td>
                  <code style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.id}</code>
                </td>
                <td><Link to={`/clients/${c.id}`}>{c.name}</Link></td>
                <td>{c.gender === 'MALE' ? 'M' : c.gender === 'FEMALE' ? 'F' : '—'}</td>
                <td>{c.age}</td>
                <td>{c.height} cm</td>
                <td><span className="badge">{c._count.evaluations}</span></td>
                <td>{c.evaluations[0] ? `${c.evaluations[0].weight} kg` : '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => openEditForm(c)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn-danger"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => handleDelete(c.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && (
          <p style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>
            Nenhum cliente cadastrado.
          </p>
        )}
        {clients.length > 0 && filteredClients.length === 0 && (
          <p style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>
            Nenhum cliente encontrado para &quot;{search}&quot;.
          </p>
        )}
      </div>
    </div>
  );
}
