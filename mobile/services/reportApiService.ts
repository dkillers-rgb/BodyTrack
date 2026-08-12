import { API_BASE_URL } from './config';
import { extractReportKey } from './reportKeyUtils';
import { fetchTcyReportDirect, findNamedNumeric } from './tcyReportMapper';
import { setScanDraft } from './scanDraft';
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
    if (!response.ok) throw new Error(body.error || `Falha ao buscar relatório (${response.status})`);
    return body;
  } finally {
    clearTimeout(timer);
  }
}

export function reportDataToPreview(
  data: ReportData,
  extras?: { rawCodeValue?: string; bodbodyReport?: import('./bodbodyReportTypes').BodbodyReportSnapshot }
): OcrPreview {
  const examDate = extras?.bodbodyReport?.examDate
    ? `${extras.bodbodyReport.examDate}T12:00:00`
    : undefined;
  const preview: OcrPreview = {
    preview: {
      patient: { examDate },
      muscleFat: {
        weight: data.peso,
        skeletalMuscle: data.massaMuscularEsqueletica,
        bodyFat: data.gorduraCorporal,
        visceralFat: data.gorduraVisceral,
      },
    },
    ocr: {
      rawText: [
        'Dados extraídos do equipamento TCY.',
        `Peso: ${data.peso} kg`,
        `Massa muscular esquelética: ${data.massaMuscularEsqueletica} kg`,
        `Gordura corporal: ${data.gorduraCorporal} kg`,
        ...(data.gorduraVisceral != null ? [`Gordura visceral: ${data.gorduraVisceral}`] : []),
      ].join('\n'),
    },
    rawCodeValue: extras?.rawCodeValue,
    bodbodyReport: extras?.bodbodyReport,
  };

  // Se houver rawCodeValue e não houver bodyAge em bodbodyReport, tente extrair nomes típicos de age/idade
  if (extras?.rawCodeValue) {
    try {
      // Try a deep search for named numeric fields (handles nested structures)
      const foundDeep = findNamedNumeric(extras.rawCodeValue, ['Body Age', 'BodyAge', 'Idade', 'Age', 'idade', 'idade corporal', 'body_age', 'idade_corporal']);
      if (foundDeep != null && Number.isFinite(foundDeep)) {
        const pb = (preview.bodbodyReport as any) || ((preview.bodbodyReport = {} as any), preview.bodbodyReport as any);
        pb.section6 = pb.section6 || { targetWeight: 0, weightControl: 0, basalMetabolism: 0, comprehensiveScore: 0 };
        pb.section6.bodyAge = Math.round(foundDeep);
      }
    } catch {
      // ignore
    }
  }

  return preview;
}

export async function processQrCodeUrl(qrUrl: string): Promise<OcrPreview> {
  const key = extractReportKey(qrUrl);
  if (!key) {
    throw new Error(
      'QR Code inválido. Use o link exibido no aparelho (ex.: http://119.23.70.228/tcy/index.html?key=...).'
    );
  }

  if (USE_DIRECT_TCY) {
    const full = await fetchTcyReportDirect(key);
    setScanDraft({ rawCodeValue: full.rawCodeValue, bodbodyReport: full.bodbodyReport });
    return reportDataToPreview(full, {
      rawCodeValue: full.rawCodeValue,
      bodbodyReport: full.bodbodyReport,
    });
  }

  try {
    const report = await fetchReportViaBodytrackApi(key);
    // Try to also fetch raw code value from device so we can populate the scan draft
    try {
      const full = await fetchTcyReportDirect(key);
      // if successful, persist draft and include bodbodyReport in preview
      setScanDraft({ rawCodeValue: full.rawCodeValue, bodbodyReport: full.bodbodyReport });
      return reportDataToPreview(report, {
        rawCodeValue: full.rawCodeValue,
        bodbodyReport: full.bodbodyReport,
      });
    } catch {
      // if direct fetch fails, still return the basic preview
      return reportDataToPreview(report);
    }
  } catch {
    const full = await fetchTcyReportDirect(key);
    setScanDraft({ rawCodeValue: full.rawCodeValue, bodbodyReport: full.bodbodyReport });
    return reportDataToPreview(full, {
      rawCodeValue: full.rawCodeValue,
      bodbodyReport: full.bodbodyReport,
    });
  }
}
