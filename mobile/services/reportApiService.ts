import { API_BASE_URL } from './config';
import { extractReportKey } from './reportKeyUtils';
import { fetchTcyReportDirect } from './tcyReportMapper';
import type { OcrPreview, ReportData } from './types';

const FETCH_TIMEOUT_MS = 20000;
const USE_DIRECT_TCY = process.env.EXPO_PUBLIC_USE_BODYTRACK_API !== '1';

async function fetchReportViaBodytrackApi(key: string): Promise<ReportData> {
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
        'Dados extraídos do equipamento TCY.',
        `Peso: ${data.peso} kg`,
        `Massa muscular esquelética: ${data.massaMuscularEsqueletica} kg`,
        `Gordura corporal: ${data.gorduraCorporal} kg`,
      ].join('\n'),
    },
  };
}

/** Lê QR TCY → extrai key → busca dados no equipamento. */
export async function processQrCodeUrl(qrUrl: string): Promise<OcrPreview> {
  const key = extractReportKey(qrUrl);
  if (!key) {
    throw new Error(
      'QR Code inválido. Use o link exibido no aparelho (ex.: http://119.23.70.228/tcy/index.html?key=...).'
    );
  }

  let report: ReportData;

  if (USE_DIRECT_TCY) {
    report = await fetchTcyReportDirect(key);
  } else {
    try {
      report = await fetchReportViaBodytrackApi(key);
    } catch {
      report = await fetchTcyReportDirect(key);
    }
  }

  return reportDataToPreview(report);
}
