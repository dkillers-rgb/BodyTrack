import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { setScanDraft } from '../services/scanDraft';
import { api } from '../services/api';
import './ScanPage.css';

function toDateInputValue(value?: string): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function hasMuscleFatData(preview: {
  preview: { muscleFat: { weight?: number; skeletalMuscle?: number; bodyFat?: number } };
}): boolean {
  const { weight, skeletalMuscle, bodyFat } = preview.preview.muscleFat;
  return weight != null || skeletalMuscle != null || bodyFat != null;
}

function isCameraAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.isSecureContext) return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

function pickCameraId(cameras: { id: string; label: string }[]): string {
  if (cameras.length === 0) {
    throw new Error('Nenhuma câmera encontrada.');
  }
  const back = cameras.find((camera) => /back|rear|environment|traseira|trás/i.test(camera.label));
  return back?.id ?? cameras[cameras.length - 1]?.id ?? cameras[0].id;
}

export default function ScanPage() {
  const [mode, setMode] = useState<'qr' | 'upload'>('qr');
  const [scanning, setScanning] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const navigate = useNavigate();
  const cameraAllowed = isCameraAllowed();

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (scanner) {
      try {
        await scanner.stop();
      } catch {
        /* scanner may not be running */
      }
      try {
        scanner.clear();
      } catch {
        /* element may already be cleared */
      }
    }

    setScanning(false);
  };

  const goToManualEntry = (showHint = true) => {
    setScanDraft({ showHint });
    navigate('/manual-entry');
  };

  const applyPreviewAndNavigate = (result: Awaited<ReturnType<typeof api.evaluations.scanQr>>, imagePath?: string) => {
    setScanDraft({
      bodbodyReport: result.bodbodyReport,
      rawCodeValue: result.rawCodeValue ?? (result.bodbodyReport ? JSON.stringify(result.bodbodyReport) : undefined),
      imagePath: imagePath ?? result.imagePath,
      rawOcrText: result.ocr.rawText,
      initialValues: {
        examDate: toDateInputValue(result.preview.patient.examDate),
        weight: result.preview.muscleFat.weight != null ? String(result.preview.muscleFat.weight) : '',
        skeletalMuscle:
          result.preview.muscleFat.skeletalMuscle != null ? String(result.preview.muscleFat.skeletalMuscle) : '',
        bodyFat: result.preview.muscleFat.bodyFat != null ? String(result.preview.muscleFat.bodyFat) : '',
        visceralFat:
          result.preview.muscleFat.visceralFat != null ? String(result.preview.muscleFat.visceralFat) : '',
      },
      showHint: !hasMuscleFatData(result),
    });
    navigate('/manual-entry');
  };

  const startScanner = async () => {
    setError('');
    setStartingCamera(true);
    await stopScanner();

    if (!cameraAllowed) {
      setError(
        'A câmera não funciona em http://192.168... no celular. Rode npm run dev:web:lan:https e abra https://SEU_IP:5173 (aceite o aviso de segurança), ou use Upload.'
      );
      setStartingCamera(false);
      return;
    }

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    const scanConfig = { fps: 10, qrbox: { width: 250, height: 250 } };
    const onDecode = async (decodedText: string) => {
      await stopScanner();
      await processUrl(decodedText);
    };

    const tryStart = async (camera: string | MediaTrackConstraints) => {
      await scanner.start(camera, scanConfig, onDecode, () => {});
      setScanning(true);
    };

    try {
      const cameras = await Html5Qrcode.getCameras();
      await tryStart(pickCameraId(cameras));
    } catch {
      try {
        await tryStart({ facingMode: { ideal: 'environment' } });
      } catch {
        try {
          await tryStart({ facingMode: 'user' });
        } catch (err) {
          const detail =
            err instanceof Error && err.message
              ? err.message
              : 'Permissão negada ou câmera em uso por outro aplicativo.';
          setError(`Não foi possível abrir a câmera: ${detail} Permita o acesso no navegador ou use Upload.`);
        }
      }
    } finally {
      setStartingCamera(false);
    }
  };

  const processUrl = async (url: string) => {
    setProcessing(true);
    setError('');
    try {
      const result = await api.evaluations.scanQr(url);
      applyPreviewAndNavigate(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar QR Code';
      setError(message);
    } finally {
      setProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setError('');

    try {
      const result = await api.evaluations.processImage(file);
      applyPreviewAndNavigate(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivo');
    } finally {
      setProcessing(false);
      e.target.value = '';
    }
  };

  const switchMode = (next: 'qr' | 'upload') => {
    setMode(next);
    void stopScanner();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Ler QR Code</h1>
        <p>Escaneie o QR Code do equipamento ou envie a imagem/PDF do relatório</p>
      </div>

      {!cameraAllowed && (
        <div className="scan-notice">
          Câmera pelo IP da rede exige HTTPS. No PC use <strong>http://127.0.0.1:5173</strong> ou rode{' '}
          <strong>npm run dev:web:lan:https</strong> e abra <strong>https://192.168.0.4:5173</strong> no celular.
        </div>
      )}

      <div className="scan-modes">
        <button className={mode === 'qr' ? 'btn-primary' : 'btn-secondary'} onClick={() => switchMode('qr')}>
          Câmera
        </button>
        <button className={mode === 'upload' ? 'btn-primary' : 'btn-secondary'} onClick={() => switchMode('upload')}>
          Upload
        </button>
        <button className="btn-secondary" onClick={() => goToManualEntry(false)}>
          Preencher manualmente
        </button>
      </div>

      {mode === 'qr' && (
        <div className="card scan-area">
          <div id="qr-reader" className="qr-reader" />
          {!scanning && !processing && (
            <button className="btn-primary" onClick={() => void startScanner()} disabled={startingCamera}>
              {startingCamera ? 'Abrindo câmera...' : 'Iniciar câmera'}
            </button>
          )}
          {scanning && (
            <button className="btn-secondary scan-stop-btn" onClick={() => void stopScanner()}>
              Parar câmera
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

      {processing && <div className="loading">Processando...</div>}
      {error && <p className="error scan-error">{error}</p>}
    </div>
  );
};
