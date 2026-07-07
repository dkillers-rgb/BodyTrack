import type { BodbodyReportSnapshot } from './bodbodyReportTypes';
import { mapCodeValueToBodbodyReport } from './bodbodyReportMapper';

export interface TcyMetrics {
  peso: number;
  massaMuscularEsqueletica: number;
  gorduraCorporal: number;
  gorduraVisceral?: number;
}

export interface TcyFullReport extends TcyMetrics {
  rawCodeValue: string;
  bodbodyReport: BodbodyReportSnapshot;
}

interface TcyQrCodeResponse {
  code?: number;
  message?: string;
  data?: { codeValue?: string } | null;
}

function toNumber(value: unknown): number | undefined {
  const n = parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function mapMetrics(codeValue: unknown): TcyMetrics {
  let values: unknown[];
  if (typeof codeValue === 'string') values = JSON.parse(codeValue) as unknown[];
  else if (Array.isArray(codeValue)) values = codeValue;
  else throw new Error('Dados do relatório inválidos');

  const peso = toNumber(values[18]);
  const massaMuscularEsqueletica = toNumber(values[21]);
  const gorduraCorporal = toNumber(values[15]);
  const gorduraVisceral = toNumber(values[37]);
  if (peso == null || massaMuscularEsqueletica == null || gorduraCorporal == null) {
    throw new Error('Relatório incompleto: peso, massa muscular ou gordura não encontrados');
  }
  return {
    peso,
    massaMuscularEsqueletica,
    gorduraCorporal,
    ...(gorduraVisceral != null ? { gorduraVisceral } : {}),
  };
}

export async function fetchTcyReportDirect(key: string): Promise<TcyFullReport> {
  const upstreamBase = (
    process.env.EXPO_PUBLIC_TCY_UPSTREAM_URL || 'http://119.23.70.228:8080'
  ).replace(/\/$/, '');
  const url = `${upstreamBase}/tcy/qrcode?key=${encodeURIComponent(key)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Equipamento retornou erro HTTP ${response.status}`);

    const payload = (await response.json()) as TcyQrCodeResponse;
    if (payload.code !== 200 || !payload.data?.codeValue) {
      throw new Error(
        'Relatório não encontrado no equipamento. Escaneie o QR Code na tela do aparelho (não use foto antiga).'
      );
    }

    const rawCodeValue = payload.data.codeValue;
    const metrics = mapMetrics(rawCodeValue);
    const bodbodyReport = mapCodeValueToBodbodyReport(rawCodeValue);
    return { ...metrics, rawCodeValue, bodbodyReport };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Tempo esgotado ao consultar o equipamento');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// compat
export function mapTcyCodeValue(codeValue: unknown): TcyMetrics {
  return mapMetrics(codeValue);
}
