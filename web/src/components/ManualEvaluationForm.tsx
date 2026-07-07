import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Client } from '../services/api';
import { clearScanDraft, getScanDraft } from '../services/scanDraft';

interface EvaluationFormValues {
  examDate: string;
  weight: string;
  skeletalMuscle: string;
  bodyFat: string;
  visceralFat: string;
}

function defaultExamDate(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  onSaved?: (clientId: number) => void;
  onCancel?: () => void;
}

export default function ManualEvaluationForm({ onSaved, onCancel }: Props) {
  const draft = getScanDraft();
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<number | ''>('');
  const [form, setForm] = useState<EvaluationFormValues>({
    examDate: draft?.initialValues?.examDate || defaultExamDate(),
    weight: draft?.initialValues?.weight || '',
    skeletalMuscle: draft?.initialValues?.skeletalMuscle || '',
    bodyFat: draft?.initialValues?.bodyFat || '',
    visceralFat: draft?.initialValues?.visceralFat || '',
  });

  const loadClients = () => {
    setLoadingClients(true);
    api.clients
      .list()
      .then(setClients)
      .catch(console.error)
      .finally(() => setLoadingClients(false));
  };

  useEffect(() => {
    loadClients();
  }, []);

  const canSave =
    !!selectedClientId &&
    !!form.examDate &&
    !!form.weight &&
    Number.isFinite(parseFloat(form.weight.replace(',', '.'))) &&
    parseFloat(form.weight.replace(',', '.')) > 0;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !canSave) return;

    const weight = parseFloat(form.weight.replace(',', '.'));
    const skeletalMuscle = parseFloat(form.skeletalMuscle.replace(',', '.')) || 0;
    const bodyFat = parseFloat(form.bodyFat.replace(',', '.')) || 0;
    const visceralParsed = parseFloat(form.visceralFat.replace(',', '.'));
    const visceralFat = Number.isFinite(visceralParsed) ? visceralParsed : undefined;

    const currentDraft = getScanDraft();
    const rawReportJson = currentDraft?.bodbodyReport
      ? JSON.stringify(currentDraft.bodbodyReport)
      : currentDraft?.rawCodeValue;

    setSaving(true);
    setError('');
    try {
      const result = await api.evaluations.create({
        clientId: selectedClientId,
        examDate: new Date(`${form.examDate}T12:00:00`).toISOString(),
        weight,
        skeletalMuscle,
        bodyFat,
        visceralFat:
          visceralFat ?? currentDraft?.bodbodyReport?.section2.visceralFat?.value ?? undefined,
        imagePath: currentDraft?.imagePath,
        rawOcrText: currentDraft?.rawOcrText,
        rawReportJson,
      });
      clearScanDraft();
      onSaved?.(result.clientId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const filteredClients = clients;

  return (
    <form onSubmit={handleSave} className="card">
      {draft?.showHint && (
        <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
          Revise os dados extraídos antes de salvar a avaliação.
        </p>
      )}

      <div className="form-group">
        <label>Cliente *</label>
        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value ? Number(e.target.value) : '')}
          required
        >
          <option value="">Selecione o cliente</option>
          {filteredClients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name} — ID {client.externalId} · {client.age} anos · {client.height} cm
            </option>
          ))}
        </select>
        {clients.length === 0 && !loadingClients && (
          <p className="error" style={{ marginTop: 8 }}>
            Nenhum cliente cadastrado.{' '}
            <Link to="/clients?create=1">Cadastrar cliente</Link>
          </p>
        )}
      </div>

      <h4 style={{ margin: '16px 0 12px', color: 'var(--text-muted)' }}>Análise de Músculo e Gordura</h4>
      <div className="grid-2">
        <div className="form-group">
          <label>Data do exame *</label>
          <input
            type="date"
            value={form.examDate}
            onChange={(e) => setForm({ ...form, examDate: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label>Peso (kg) *</label>
          <input
            type="text"
            inputMode="decimal"
            value={form.weight}
            onChange={(e) => setForm({ ...form, weight: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label>Músculo esquelético (kg)</label>
          <input
            type="text"
            inputMode="decimal"
            value={form.skeletalMuscle}
            onChange={(e) => setForm({ ...form, skeletalMuscle: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Gordura corporal (kg)</label>
          <input
            type="text"
            inputMode="decimal"
            value={form.bodyFat}
            onChange={(e) => setForm({ ...form, bodyFat: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Gordura visceral</label>
          <input
            type="text"
            inputMode="decimal"
            value={form.visceralFat}
            onChange={(e) => setForm({ ...form, visceralFat: e.target.value })}
          />
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button type="submit" className="btn-primary" disabled={saving || !canSave}>
          {saving ? 'Salvando...' : 'Salvar avaliação'}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
