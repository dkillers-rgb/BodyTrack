import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { api, ClientWithMeta, OcrPreview } from '../services/api';
import './ScanPage.css';

function toDateInputValue(value?: string): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

interface EvaluationForm {
  examDate: string;
  weight: string;
  skeletalMuscle: string;
  bodyFat: string;
}

export default function ScanPage() {
  const [mode, setMode] = useState<'qr' | 'upload'>('qr');
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<OcrPreview | null>(null);
  const [form, setForm] = useState<EvaluationForm>({
    examDate: '',
    weight: '',
    skeletalMuscle: '',
    bodyFat: '',
  });
  const [clients, setClients] = useState<ClientWithMeta[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | ''>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    api.clients.list().then(setClients).catch(console.error);
  }, []);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        /* scanner may not be running */
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const resetPreview = () => {
    setPreview(null);
    setForm({ examDate: '', weight: '', skeletalMuscle: '', bodyFat: '' });
    setSelectedClientId('');
    setError('');
    setSuccess('');
  };

  const applyPreview = async (result: OcrPreview) => {
    setPreview(result);
    setForm({
      examDate: toDateInputValue(result.preview.patient.examDate),
      weight: result.preview.muscleFat.weight != null ? String(result.preview.muscleFat.weight) : '',
      skeletalMuscle:
        result.preview.muscleFat.skeletalMuscle != null
          ? String(result.preview.muscleFat.skeletalMuscle)
          : '',
      bodyFat: result.preview.muscleFat.bodyFat != null ? String(result.preview.muscleFat.bodyFat) : '',
    });
    if (clients.length === 0) {
      const list = await api.clients.list();
      setClients(list);
    }
    setSelectedClientId('');
  };

  const startScanner = async () => {
    setError('');
    resetPreview();

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await stopScanner();
          await processUrl(decodedText);
        },
        () => {}
      );
      setScanning(true);
    } catch {
      setError('Não foi possível acessar a câmera. Use o upload de imagem.');
      setMode('upload');
    }
  };

  const processUrl = async (url: string) => {
    setProcessing(true);
    setError('');
    try {
      const result = await api.evaluations.scanQr(url);
      applyPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar QR Code');
    } finally {
      setProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    resetPreview();

    try {
      const result = await api.evaluations.processImage(file);
      applyPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivo');
    } finally {
      setProcessing(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!preview || !selectedClientId) return;

    const weight = parseFloat(form.weight.replace(',', '.'));
    const skeletalMuscle = parseFloat(form.skeletalMuscle.replace(',', '.')) || 0;
    const bodyFat = parseFloat(form.bodyFat.replace(',', '.')) || 0;

    if (!Number.isFinite(weight) || weight <= 0) {
      setError('Informe o peso (kg) para salvar a avaliação.');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const result = await api.evaluations.create({
        clientId: selectedClientId,
        examDate: new Date(`${form.examDate}T12:00:00`).toISOString(),
        weight,
        skeletalMuscle,
        bodyFat,
        imagePath: preview.imagePath,
        rawOcrText: preview.ocr.rawText,
      });

      const clientName = clients.find((c) => c.id === selectedClientId)?.name || 'cliente';
      setSuccess(`Avaliação salva para ${clientName}!`);
      setTimeout(() => navigate(`/clients/${result.clientId}`), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setProcessing(false);
    }
  };

  const canSave =
    !!selectedClientId &&
    !!form.examDate &&
    !!form.weight &&
    Number.isFinite(parseFloat(form.weight.replace(',', '.'))) &&
    parseFloat(form.weight.replace(',', '.')) > 0;

  return (
    <div>
      <div className="page-header">
        <h1>Ler QR Code</h1>
        <p>Escaneie o QR Code do equipamento ou envie a imagem/PDF do relatório</p>
      </div>

      <div className="scan-modes">
        <button
          className={mode === 'qr' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => { setMode('qr'); stopScanner(); }}
        >
          📷 Câmera
        </button>
        <button
          className={mode === 'upload' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => { setMode('upload'); stopScanner(); }}
        >
          📁 Upload
        </button>
      </div>

      {mode === 'qr' && (
        <div className="card scan-area">
          <div id="qr-reader" style={{ width: '100%', maxWidth: 400, margin: '0 auto' }} />
          {!scanning && !processing && (
            <button className="btn-primary" onClick={startScanner}>
              Iniciar câmera
            </button>
          )}
        </div>
      )}

      {mode === 'upload' && (
        <div className="card scan-area">
          <label className="upload-zone">
            <input type="file" accept="image/*,application/pdf,.pdf" onChange={handleFileUpload} hidden />
            <span className="upload-icon">📄</span>
            <span>Clique para enviar imagem ou PDF do relatório</span>
          </label>
        </div>
      )}

      {processing && <div className="loading">Processando OCR...</div>}
      {error && <p className="error" style={{ marginTop: 16 }}>{error}</p>}
      {success && <p className="success" style={{ marginTop: 16 }}>{success}</p>}

      {preview && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3 className="card-title">Dados extraídos (OCR)</h3>

          <div className="form-group">
            <label>Cliente *</label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value ? Number(e.target.value) : '')}
              required
            >
              <option value="">Selecione o cliente cadastrado</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} — {client.age} anos, {client.height} cm
                </option>
              ))}
            </select>
            {clients.length === 0 && (
              <p className="error" style={{ marginTop: 8 }}>
                Nenhum cliente cadastrado. Cadastre em Clientes antes de salvar.
              </p>
            )}
          </div>

          <h4 style={{ marginBottom: 12, color: 'var(--text-muted)' }}>Muscle Fat Analysis</h4>
          <div className="grid-2">
            <div className="form-group">
              <label>Data do exame *</label>
              <input
                type="date"
                value={form.examDate}
                onChange={(e) => setForm((prev) => ({ ...prev, examDate: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Peso (kg) *</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.weight}
                onChange={(e) => setForm((prev) => ({ ...prev, weight: e.target.value }))}
                placeholder="Weight"
                required
              />
            </div>
            <div className="form-group">
              <label>Músculo esquelético (kg)</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.skeletalMuscle}
                onChange={(e) => setForm((prev) => ({ ...prev, skeletalMuscle: e.target.value }))}
                placeholder="Skeletal Muscle"
              />
            </div>
            <div className="form-group">
              <label>Gordura corporal (kg)</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.bodyFat}
                onChange={(e) => setForm((prev) => ({ ...prev, bodyFat: e.target.value }))}
                placeholder="Body Fat"
              />
            </div>
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={processing || !canSave}
            >
              Salvar avaliação
            </button>
            <button className="btn-secondary" onClick={resetPreview}>
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
