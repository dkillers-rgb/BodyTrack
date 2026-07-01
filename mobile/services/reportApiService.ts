import { API_BASE_URL } from './config';
import { extractReportKey } from './reportKeyUtils';
import type { OcrPreview, ReportData } from './types';

const FETCH_TIMEOUT_MS = 20000;

export async function fetchReportByKey(key: string): Promise<ReportData> {
  const url = `${API_BASE_URL}/report?key=${encodeURIComponent(key)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const body = (await response.json().catch(() => ({}))) as ReportData & { error?: string };

    if (!response.ok) {
      throw new Error(body.error || `Falha ao buscar relatório (${response.status})`);
    }

    return body;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Tempo esgotado ao buscar dados do relatório');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function reportDataToPreview(data: ReportData): OcrPreview {
  return {
    preview: {
      patient: {},
      muscleFat: {
        weight: data.peso,
        skeletalMuscle: data.massaMuscularEsqueletica,
        bodyFat: data.gorduraCorporal,
      },
    },
    ocr: {
      rawText: [
        'Dados extraídos via API BodyTrack.',
        `Peso: ${data.peso} kg`,
        `Massa muscular esquelética: ${data.massaMuscularEsqueletica} kg`,
        `Gordura corporal: ${data.gorduraCorporal} kg`,
      ].join('\n'),
    },
  };
}

/** Lê QR TCY → extrai key → consulta backend → retorna preview para o formulário. */
export async function processQrCodeUrl(qrUrl: string): Promise<OcrPreview> {
  const key = extractReportKey(qrUrl);
  if (!key) {
    throw new Error(
      'QR Code inválido. Use o link do equipamento (ex.: https://119.23.70.228/tcy/index.html?key=...).'
    );
  }

  const report = await fetchReportByKey(key);
  return reportDataToPreview(report);
}
