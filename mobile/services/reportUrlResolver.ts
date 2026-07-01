import * as FileSystem from 'expo-file-system';
import {
  buildBodbodyShareImageCandidates,
  buildImageCandidateUrls,
  expandBodbodyPageUrls,
  extractImageReferenceFromJson,
  extractMuscleFatFromJson,
  findApiEndpointsInHtml,
  findImageUrlInHtml,
  isBodbodyShareUrl,
  isImageBytes,
  isSpaShell,
  looksLikeHtml,
  normalizeReportUrl,
  type BodbodyMetrics,
} from './reportUrlUtils';

export {
  normalizeReportUrl,
  findImageUrlInHtml,
  buildImageCandidateUrls,
  parseReportPageUrl,
  isBodbodyShareUrl,
  expandBodbodyPageUrls,
  buildBodbodyShareImageCandidates,
} from './reportUrlUtils';

export interface ResolvedQrReport {
  imageUri?: string;
  muscleFat?: BodbodyMetrics;
  rawText?: string;
}

const BODBODY_HOST = /(?:^|\.)bodbody\.(?:com(?:\.cn)?|cn)$/i;

const FETCH_TIMEOUT_MS = 8_000;
const RESOLVE_TIMEOUT_MS = 35_000;
const MAX_PROBE_CANDIDATES = 24;
const PROBE_BATCH_SIZE = 4;

function fetchTimeoutSignal(ms: number = FETCH_TIMEOUT_MS): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function bodbodyHostHeader(pageUrl: string, targetUrl: string): string | undefined {
  try {
    const page = new URL(pageUrl);
    const target = new URL(targetUrl);
    if (BODBODY_HOST.test(page.hostname) && /^\d+\.\d+\.\d+\.\d+$/.test(target.hostname)) {
      return page.hostname;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

function extensionFromBytes(bytes: Uint8Array): string {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50) return '.pdf';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50) return '.png';
  return '.jpg';
}

function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triplet = (a << 16) | (b << 8) | c;
    output += alphabet[(triplet >> 18) & 63];
    output += alphabet[(triplet >> 12) & 63];
    output += i + 1 < bytes.length ? alphabet[(triplet >> 6) & 63] : '=';
    output += i + 2 < bytes.length ? alphabet[triplet & 63] : '=';
  }
  return output;
}

async function saveBytesToCache(bytes: Uint8Array): Promise<string> {
  const ext = extensionFromBytes(bytes);
  const destUri = `${FileSystem.cacheDirectory}qr-temp-${Date.now()}${ext}`;
  await FileSystem.writeAsStringAsync(destUri, bytesToBase64(bytes), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return destUri;
}

async function saveDataUriToCache(dataUri: string): Promise<string> {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) {
    throw new Error('Formato de imagem embutida no link não suportado.');
  }
  const mime = match[1].toLowerCase();
  const ext = mime.includes('png') ? '.png' : mime.includes('pdf') ? '.pdf' : '.jpg';
  const destUri = `${FileSystem.cacheDirectory}qr-temp-${Date.now()}${ext}`;
  await FileSystem.writeAsStringAsync(destUri, match[2], {
    encoding: FileSystem.EncodingType.Base64,
  });
  return destUri;
}

interface FetchResult {
  finalUrl: string;
  bytes: Uint8Array;
  contentType: string;
}

async function fetchResource(url: string, referer?: string, pageUrl?: string): Promise<FetchResult> {
  const hostHeader = pageUrl ? bodbodyHostHeader(pageUrl, url) : undefined;
  const response = await fetch(url, {
    headers: {
      Accept: 'image/avif,image/webp,image/apng,image/*,application/pdf,application/json,text/html,*/*',
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      ...(referer ? { Referer: referer } : {}),
      ...(hostHeader ? { Host: hostHeader } : {}),
    },
    redirect: 'follow',
    signal: fetchTimeoutSignal(),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  return {
    finalUrl: response.url || url,
    bytes: new Uint8Array(buffer),
    contentType: (response.headers.get('content-type') || '').toLowerCase(),
  };
}

async function probeImageUrl(url: string, referer?: string, pageUrl?: string): Promise<string | null> {
  try {
    const { bytes, contentType, finalUrl } = await fetchResource(url, referer, pageUrl || referer);

    if (isImageBytes(bytes)) {
      return saveBytesToCache(bytes);
    }

    if (contentType.startsWith('image/') || contentType.includes('pdf')) {
      return finalUrl;
    }

    if (contentType.includes('json') || bytes[0] === 0x7b || bytes[0] === 0x5b) {
      const text = new TextDecoder('utf-8').decode(bytes);
      const imageRef = extractImageReferenceFromJson(text, finalUrl);
      if (!imageRef) return null;
      if (imageRef.startsWith('data:')) return saveDataUriToCache(imageRef);
      return probeImageUrl(imageRef, referer || finalUrl, pageUrl || referer);
    }

    const text = new TextDecoder('utf-8').decode(bytes);
    if (looksLikeHtml(text)) {
      const imageRef = findImageUrlInHtml(text, finalUrl);
      if (!imageRef) return null;
      if (imageRef.startsWith('data:')) return saveDataUriToCache(imageRef);
      return probeImageUrl(imageRef, referer || finalUrl, pageUrl || referer);
    }

    return null;
  } catch {
    return null;
  }
}

async function probeMetricsUrl(
  url: string,
  referer: string,
  pageUrl: string
): Promise<BodbodyMetrics | null> {
  try {
    const { bytes, contentType } = await fetchResource(url, referer, pageUrl);
    if (!contentType.includes('json') && bytes[0] !== 0x7b && bytes[0] !== 0x5b) return null;
    return extractMuscleFatFromJson(new TextDecoder('utf-8').decode(bytes));
  } catch {
    return null;
  }
}

async function probeCandidateUrls(urls: string[], pageUrl: string): Promise<string | null> {
  const unique = [...new Set(urls)].slice(0, MAX_PROBE_CANDIDATES);

  for (let i = 0; i < unique.length; i += PROBE_BATCH_SIZE) {
    const batch = unique.slice(i, i + PROBE_BATCH_SIZE);
    const results = await Promise.all(batch.map((url) => probeImageUrl(url, pageUrl, pageUrl)));
    const hit = results.find((value): value is string => !!value);
    if (hit) return hit;
  }

  return null;
}

async function resolveFromFetchedPage(
  page: FetchResult,
  refererUrl: string
): Promise<{ imageUri?: string; muscleFat?: BodbodyMetrics } | null> {
  if (isImageBytes(page.bytes)) {
    return { imageUri: await saveBytesToCache(page.bytes) };
  }

  if (page.contentType.startsWith('image/') || page.contentType.includes('pdf')) {
    return { imageUri: page.finalUrl };
  }

  const html = new TextDecoder('utf-8').decode(page.bytes);

  if (page.contentType.includes('json') || page.bytes[0] === 0x7b || page.bytes[0] === 0x5b) {
    const metrics = extractMuscleFatFromJson(html);
    if (metrics) return { muscleFat: metrics };

    const imageRef = extractImageReferenceFromJson(html, page.finalUrl);
    if (imageRef) {
      if (imageRef.startsWith('data:')) return { imageUri: await saveDataUriToCache(imageRef) };
      const nested = await probeImageUrl(imageRef, refererUrl, refererUrl);
      if (nested) return { imageUri: nested };
    }
  }

  if (looksLikeHtml(html)) {
    const imageRef = findImageUrlInHtml(html, page.finalUrl);
    if (imageRef) {
      if (imageRef.startsWith('data:')) return { imageUri: await saveDataUriToCache(imageRef) };
      const nested = await probeImageUrl(imageRef, refererUrl, refererUrl);
      if (nested) return { imageUri: nested };
    }

    const apiEndpoints = findApiEndpointsInHtml(html, page.finalUrl);
    if (apiEndpoints.length) {
      for (let i = 0; i < apiEndpoints.length; i += 4) {
        const batch = apiEndpoints.slice(i, i + 4);
        const metricResults = await Promise.all(
          batch.map((url) => probeMetricsUrl(url, refererUrl, refererUrl))
        );
        const metrics = metricResults.find((m): m is BodbodyMetrics => !!m);
        if (metrics) return { muscleFat: metrics };

        const probed = await probeCandidateUrls(batch, refererUrl);
        if (probed) return { imageUri: probed };
      }
    }
  }

  if (isSpaShell(html) || looksLikeHtml(html)) {
    const candidates = buildImageCandidateUrls(page.finalUrl || refererUrl);
    const probed = await probeCandidateUrls(candidates, refererUrl);
    if (probed) return { imageUri: probed };
  }

  return null;
}

async function tryResolvePageUrl(
  currentPageUrl: string,
  refererUrl: string
): Promise<{ imageUri?: string; muscleFat?: BodbodyMetrics } | null> {
  const page = await fetchResource(currentPageUrl, refererUrl, refererUrl);
  return resolveFromFetchedPage(page, refererUrl);
}

async function probeBodbodyMetrics(pageUrl: string): Promise<BodbodyMetrics | null> {
  const jsonCandidates = buildBodbodyShareImageCandidates(pageUrl)
    .filter((url) => /(?:getdata|getreportdata|querydata|\/data|\/api\/)/i.test(url))
    .slice(0, 12);

  for (let i = 0; i < jsonCandidates.length; i += PROBE_BATCH_SIZE) {
    const batch = jsonCandidates.slice(i, i + PROBE_BATCH_SIZE);
    const results = await Promise.all(batch.map((url) => probeMetricsUrl(url, pageUrl, pageUrl)));
    const hit = results.find((m): m is BodbodyMetrics => !!m);
    if (hit) return hit;
  }
  return null;
}

async function resolveQrReportInternal(rawUrl: string): Promise<ResolvedQrReport> {
  const pageUrl = normalizeReportUrl(rawUrl);

  if (isBodbodyShareUrl(pageUrl)) {
    const metrics = await probeBodbodyMetrics(pageUrl);
    if (metrics) {
      return { muscleFat: metrics, rawText: 'Dados extraídos da API Bodbody (JSON).' };
    }
  }

  const imageUri = await resolveReportImageSource(rawUrl);
  return { imageUri };
}

/**
 * Resolve relatório do QR: imagem para OCR ou métricas JSON da API Bodbody.
 */
export async function resolveQrReport(rawUrl: string): Promise<ResolvedQrReport> {
  return withTimeout(
    resolveQrReportInternal(rawUrl),
    RESOLVE_TIMEOUT_MS,
    'Tempo esgotado ao buscar o relatório. Verifique a conexão ou preencha os dados manualmente.'
  );
}

/**
 * Acessa o link do QR Code e resolve a URL (ou arquivo local) da imagem do relatório.
 * Suporta o padrão Bodbody: /share/index.html?id=&time=&sn=
 */
export async function resolveReportImageSource(rawUrl: string): Promise<string> {
  const pageUrl = normalizeReportUrl(rawUrl);
  const pageUrls = isBodbodyShareUrl(pageUrl) ? expandBodbodyPageUrls(pageUrl) : [pageUrl];
  let lastError: Error | null = null;

  for (const currentPageUrl of pageUrls) {
    try {
      const resolved = await tryResolvePageUrl(currentPageUrl, pageUrl);
      if (resolved?.imageUri) return resolved.imageUri;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = error instanceof Error ? error : new Error(message);
      if (/HTTP 404|ENOTFOUND|ETIMEDOUT|Network/i.test(message)) continue;
    }
  }

  if (isBodbodyShareUrl(pageUrl)) {
    const bodbodyCandidates = buildBodbodyShareImageCandidates(pageUrl).slice(0, MAX_PROBE_CANDIDATES);
    const probed = await probeCandidateUrls(bodbodyCandidates, pageUrl);
    if (probed) return probed;
  }

  try {
    const resolved = await tryResolvePageUrl(pageUrl, pageUrl);
    if (resolved?.imageUri) return resolved.imageUri;
  } catch (error) {
    lastError = error instanceof Error ? error : new Error(String(error));
  }

  const message = lastError?.message || '';
  if (message.includes('Não foi possível encontrar')) throw lastError;
  if (/HTTP|Network|fetch|Failed|ENOTFOUND/i.test(message)) {
    throw new Error(`Falha ao acessar o link do QR Code: ${message}`);
  }

  throw new Error(
    'Não foi possível encontrar a imagem do relatório na página. Verifique se o link do QR Code está acessível.'
  );
}
