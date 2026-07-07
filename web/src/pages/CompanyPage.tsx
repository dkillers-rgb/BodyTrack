import { FormEvent, useState } from 'react';
import {
  CompanySettings,
  fileToDataUri,
  loadCompanySettings,
  saveCompanySettings,
} from '../services/companyStorage';

export default function CompanyPage() {
  const [form, setForm] = useState<CompanySettings>(loadCompanySettings());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const logoDataUri = await fileToDataUri(file);
      const next = { ...form, logoDataUri };
      setForm(next);
      saveCompanySettings(next);
      setMessage('Logo atualizado.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Falha ao carregar logo');
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveLogo = () => {
    const next = { ...form, logoDataUri: undefined };
    setForm(next);
    saveCompanySettings(next);
    setMessage('Logo removido.');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    saveCompanySettings(form);
    setMessage('Dados da empresa atualizados. Eles aparecerão no cabeçalho do relatório.');
    setSaving(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Empresa</h1>
        <p>Estes dados aparecem no cabeçalho e no rodapé do relatório impresso/PDF.</p>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nome da clínica</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex.: Clínica Levèz"
          />
        </div>
        <div className="form-group">
          <label>Endereço</label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Rua, número, cidade"
          />
        </div>
        <div className="form-group">
          <label>Telefone</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="(00) 00000-0000"
          />
        </div>

        <div className="form-group">
          <label>Logo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {form.logoDataUri ? (
              <img src={form.logoDataUri} alt="Logo" style={{ width: 72, height: 72, objectFit: 'contain' }} />
            ) : (
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 8,
                  background: 'var(--surface-2)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                BT
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label className="btn-secondary" style={{ cursor: 'pointer' }}>
                Escolher logo
                <input type="file" accept="image/*" hidden onChange={handleLogo} />
              </label>
              {form.logoDataUri && (
                <button type="button" className="btn-danger" onClick={handleRemoveLogo}>
                  Remover logo
                </button>
              )}
            </div>
          </div>
        </div>

        {message && <p className="success">{message}</p>}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}
