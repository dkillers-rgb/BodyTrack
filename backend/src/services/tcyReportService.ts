/**
 * Índices do array codeValue retornado por /tcy/qrcode?key=
 * (equipamento BodyAnalyse / TCY).
 */
const TCY = {
  BODY_FAT_KG: 15,
  WEIGHT_KG: 18,
  SKELETAL_MUSCLE_KG: 21,
  VISCERAL_FAT_INDEX: 37,
} as const;

export interface TcyMappedReport {
  peso: number;
  massaMuscularEsqueletica: number;
  gorduraCorporal: number;
  gorduraVisceral?: number;
  rawCodeValue: string;
}

interface TcyQrCodeResponse {
  code?: number;
  message?: string;
  data?: {
    codeValue?: string;
  };
}

function toNumber(value: unknown): number | undefined {
  const n = parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

export function mapTcyCodeValue(codeValue: unknown): TcyMappedReport {
  let values: unknown[];
  if (typeof codeValue === 'string') {
    values = JSON.parse(codeValue) as unknown[];
  } else if (Array.isArray(codeValue)) {
    values = codeValue;
  } else {
    throw new Error('codeValue inválido no relatório do equipamento');
  }

  const peso = toNumber(values[TCY.WEIGHT_KG]);
  const massaMuscularEsqueletica = toNumber(values[TCY.SKELETAL_MUSCLE_KG]);
  const gorduraCorporal = toNumber(values[TCY.BODY_FAT_KG]);
  const gorduraVisceral = toNumber(values[TCY.VISCERAL_FAT_INDEX]);

  if (peso == null || massaMuscularEsqueletica == null || gorduraCorporal == null) {
    throw new Error('Relatório incompleto: peso, massa muscular ou gordura não encontrados');
  }

  const rawCodeValue = typeof codeValue === 'string' ? codeValue : JSON.stringify(codeValue);

  return {
    peso,
    massaMuscularEsqueletica,
    gorduraCorporal,
    rawCodeValue,
    ...(gorduraVisceral != null ? { gorduraVisceral } : {}),
  };
}

/** Ex.: https://119.23.70.228/tcy/index.html?lang=en&key=... */
export function extractKeyFromQrUrl(rawUrl: string): string | null {
  try {
    const trimmed = rawUrl.trim();
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(normalized);
    if (!url.pathname.includes('/tcy/')) return null;
    return url.searchParams.get('key');
  } catch {
    return null;
  }
}

export async function fetchTcyReportByKey(key: string): Promise<TcyMappedReport> {
  const upstreamBase = (process.env.TCY_UPSTREAM_URL || 'http://119.23.70.228:8080').replace(/\/$/, '');
  const upstreamUrl = `${upstreamBase}/tcy/qrcode?key=${encodeURIComponent(key)}`;

  const response = await fetch(upstreamUrl, {
    signal: AbortSignal.timeout(Number(process.env.TCY_FETCH_TIMEOUT_MS || 15000)),
  });

  if (!response.ok) {
    throw new Error(`Equipamento retornou erro HTTP ${response.status}`);
  }

  const payload = (await response.json()) as TcyQrCodeResponse;
  const codeValue = payload?.data?.codeValue;

  if (!codeValue) {
    throw new Error('Relatório não encontrado para esta chave');
  }

  return mapTcyCodeValue(codeValue);
}
