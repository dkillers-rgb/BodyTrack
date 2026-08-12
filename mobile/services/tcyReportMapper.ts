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
  bodyFatPct?: number;
  waistHip?: number;
  bodyAge?: number;
}

interface TcyQrCodeResponse {
  code?: number;
  message?: string;
  data?: { codeValue?: string } | null;
}

const TcyFieldIndexes = {
  weight: 18,
  skeletalMuscle: 21,
  bodyFatKg: 15,
  visceralFat: 37,
  bodyFatPct: 28,
  waistHipRatio: 31,
} as const;

const TcyFieldNames = {
  bodyFatPercentage: ['Body Fat Percentage', 'Fat %', 'PBF', 'Body Fat'],
  waistHipRatio: ['Waist Hip Ratio', 'WHR', 'Waist/Hip Ratio'],
} as const;

function toNumber(value: unknown): number | undefined {
  const n = parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}

function getFieldName(item: unknown): string {
  if (!isRecord(item)) return '';
  const candidates = [item.fieldId, item.field_id, item.key, item.name, item.label, item.title];
  return candidates.filter((value): value is string => typeof value === 'string').join(' | ');
}

function dumpCodeValue(codeValue: unknown): Array<{ index: number; name: string; value: unknown }> {
  const raw = typeof codeValue === 'string' ? JSON.parse(codeValue) : codeValue;
  if (!Array.isArray(raw)) return [];

  return raw.map((item, index) => ({
    index,
    name: getFieldName(item),
    value: item,
  }));
}

function resolveNamedFieldValue(codeValue: unknown, candidateNames: readonly string[]): unknown {
  const raw = typeof codeValue === 'string' ? JSON.parse(codeValue) : codeValue;
  if (!Array.isArray(raw)) return undefined;

  for (const item of raw) {
    if (!isRecord(item)) continue;
    const fieldName = getFieldName(item).toLowerCase();
    if (candidateNames.some((name) => fieldName.includes(name.toLowerCase()))) {
      return item.value ?? item.amount ?? item.result ?? item.data ?? item;
    }
  }

  return undefined;
}

export function findNamedNumeric(codeValue: unknown, candidateNames: readonly string[]): number | undefined {
  const raw = typeof codeValue === 'string' ? JSON.parse(codeValue) : codeValue;

  function walk(node: unknown): number | undefined {
    if (node == null) return undefined;
    if (typeof node === 'number') return undefined;
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = walk(item);
        if (found != null) return found;
      }
      return undefined;
    }
    if (isRecord(node)) {
      const nameParts: string[] = [];
      for (const k of ['fieldId', 'field_id', 'key', 'name', 'label', 'title']) {
        if (k in node && typeof (node as any)[k] === 'string') nameParts.push((node as any)[k]);
      }
      const keys = Object.keys(node);
      const combined = (nameParts.concat(keys)).join(' | ').toLowerCase();
      if (candidateNames.some((n) => combined.includes(n.toLowerCase()))) {
        const v = (node as any).value ?? (node as any).amount ?? (node as any).result ?? (node as any).data ?? (node as any).val ?? undefined;
        const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(String(v).replace(',', '.')) : undefined;
        if (Number.isFinite(n)) return n;
      }
      for (const k of keys) {
        const found = walk((node as any)[k]);
        if (found != null) return found;
      }
    }
    return undefined;
  }

  try {
    return walk(raw);
  } catch {
    return undefined;
  }
}

function mapMetrics(codeValue: unknown): TcyMetrics {
  const values = typeof codeValue === 'string' ? JSON.parse(codeValue) as unknown[] : Array.isArray(codeValue) ? codeValue : undefined;
  if (!values) throw new Error('Dados do relatório inválidos');

  const payloadDump = dumpCodeValue(codeValue);
  console.log('[TCY] codeValue dump:', payloadDump);

  const namedBodyFatPct = resolveNamedFieldValue(codeValue, TcyFieldNames.bodyFatPercentage);
  const namedWaistHip = resolveNamedFieldValue(codeValue, TcyFieldNames.waistHipRatio);

  const peso = toNumber(values[TcyFieldIndexes.weight]);
  const massaMuscularEsqueletica = toNumber(values[TcyFieldIndexes.skeletalMuscle]);
  const gorduraCorporal = toNumber(values[TcyFieldIndexes.bodyFatKg]);
  const gorduraVisceral = toNumber(values[TcyFieldIndexes.visceralFat]);

  if (namedBodyFatPct != null) {
    console.log('[TCY] bodyFat percentage via name:', namedBodyFatPct);
  }
  if (namedWaistHip != null) {
    console.log('[TCY] waist/hip ratio via name:', namedWaistHip);
  }

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
    const parsedValues = typeof rawCodeValue === 'string' ? JSON.parse(rawCodeValue) as unknown[] : Array.isArray(rawCodeValue) ? rawCodeValue : undefined;
    const metrics = mapMetrics(rawCodeValue);
    const bodbodyReport = mapCodeValueToBodbodyReport(rawCodeValue);
    // Tenta extrair Body Age de fields nomeados (vários aliases) se não houver em section6
    try {
      // First try shallow named resolution
      const candidateNames = ['Body Age', 'BodyAge', 'Idade', 'Age', 'idade', 'idade corporal', 'body_age', 'idade_corporal'];
      let maybeAgeRaw = resolveNamedFieldValue(rawCodeValue, candidateNames);
      // If not found, try deep recursive search
      if (maybeAgeRaw == null) {
        const deep = findNamedNumeric(rawCodeValue, candidateNames);
        maybeAgeRaw = deep;
      }
      const maybeAge = typeof maybeAgeRaw === 'number' ? maybeAgeRaw : typeof maybeAgeRaw === 'string' ? parseFloat(String(maybeAgeRaw).replace(',', '.')) : undefined;
      if (maybeAge != null && Number.isFinite(maybeAge)) {
        if (!bodbodyReport.section6) bodbodyReport.section6 = { targetWeight: 0, weightControl: 0, basalMetabolism: 0, comprehensiveScore: 0 } as any;
        bodbodyReport.section6.bodyAge = Math.round(maybeAge);
      }
    } catch (e) {
      /* ignore extraction errors */
    }
    const bodyFatPct = toNumber(resolveNamedFieldValue(rawCodeValue, TcyFieldNames.bodyFatPercentage)) ?? toNumber(parsedValues?.[TcyFieldIndexes.bodyFatPct]);
    const waistHip = toNumber(resolveNamedFieldValue(rawCodeValue, TcyFieldNames.waistHipRatio)) ?? toNumber(parsedValues?.[TcyFieldIndexes.waistHipRatio]);
    return { ...metrics, rawCodeValue, bodbodyReport, bodyFatPct, waistHip, bodyAge: bodbodyReport.section6?.bodyAge };
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
