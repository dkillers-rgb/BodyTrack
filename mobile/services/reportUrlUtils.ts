/** Padrão do QR Code Bodbody: http://bodbody.com.cn/share/index.html?id=164&time=...&sn=... */
const BODBODY_SHARE_PAGE = /\/share\/index\.html/i;
const BODBODY_HOST = /(?:^|\.)bodbody\.(?:com(?:\.cn)?|cn)$/i;

const BODBODY_IMAGE_PATHS = [
  '/share/report.jpg',
  '/share/report.png',
  '/share/report.jpeg',
  '/share/data/reportImg',
  '/share/data/getImg',
  '/share/report/getImg',
  '/share/getData',
  '/share/getReportData',
  '/share/queryData',
  '/share/data',
  '/share/report',
  '/share/image',
  '/share/img',
  '/share/getImage',
  '/share/getImg',
  '/share/getReport',
  '/share/getReportImage',
  '/share/getReportImg',
  '/share/download',
  '/share/print',
  '/share/showImage',
  '/share/reportImage',
  '/share/showReport',
  '/share/selectReport',
  '/share/queryReport',
  '/share/data',
  '/api/share/report',
  '/api/share/getReport',
  '/api/share/getImage',
  '/api/share/image',
  '/api/share/download',
  '/api/report/getReport',
  '/api/report/getImage',
  '/api/report/image',
  '/api/body/report',
  '/api/body/getReport',
  '/api/body/getImage',
  '/api/measure/getReport',
  '/api/measure/reportImage',
  '/body/share/report',
  '/body/share/getReport',
  '/h5/share/report',
  '/h5/share/getReport',
  '/prod-api/share/report',
  '/prod-api/report/image',
  '/web/share/report',
  '/web/share/getReport',
];

/** Normaliza URL lida do QR Code dos equipamentos de bioimpedância (geralmente HTTP em IP). */
export function normalizeReportUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('URL do relatório é obrigatória');

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^[\d.a-z-]+(?::\d+)?(?:\/|$)/i.test(trimmed)) {
    return `http://${trimmed}`;
  }

  return `http://${trimmed}`;
}

export function looksLikeHtml(text: string): boolean {
  const sample = text.trimStart().slice(0, 200).toLowerCase();
  return sample.startsWith('<!doctype') || sample.startsWith('<html') || sample.startsWith('<head');
}

export function isSpaShell(html: string): boolean {
  if (!looksLikeHtml(html)) return false;
  const lower = html.toLowerCase();
  const hasAppRoot = lower.includes('id="app"') || lower.includes("id='app'");
  const hasModuleScript = lower.includes('type="module"');
  const hasImgTag = /<img[^>]+src=/i.test(html);
  return hasAppRoot && hasModuleScript && !hasImgTag && html.length < 8000;
}

export function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

export function isPng(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

export function isPdf(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

export function isImageBytes(bytes: Uint8Array): boolean {
  return isJpeg(bytes) || isPng(bytes) || isPdf(bytes);
}

export interface ReportUrlContext {
  pageUrl: string;
  origin: string;
  pathname: string;
  hashPath: string;
  params: Record<string, string>;
  alternateOrigins: string[];
}

export function parseReportPageUrl(pageUrl: string): ReportUrlContext {
  const url = new URL(pageUrl);
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const hash = url.hash || '';
  const hashPath = hash.replace(/^#/, '').split('?')[0];
  if (hash.includes('?')) {
    const hashQuery = hash.slice(hash.indexOf('?') + 1);
    new URLSearchParams(hashQuery).forEach((value, key) => {
      params[key] = value;
    });
  }

  const alternateOrigins = new Set<string>();
  const host = url.hostname;
  const protocol = url.protocol || 'http:';
  const currentPort = url.port || (protocol === 'https:' ? '443' : '80');

  for (const port of ['8080', '8081', '8888', '9000', '80']) {
    if (port !== currentPort) {
      alternateOrigins.add(`${protocol}//${host}:${port}`);
    }
  }
  if (currentPort !== '80') {
    alternateOrigins.add(`${protocol}//${host}`);
  }

  return {
    pageUrl,
    origin: url.origin,
    pathname: url.pathname,
    hashPath,
    params,
    alternateOrigins: [...alternateOrigins],
  };
}

function resolveRelativeUrl(baseUrl: string, relative: string): string {
  const trimmed = relative.trim().replace(/&amp;/g, '&');
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `http:${trimmed}`;
  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    const base = baseUrl.replace(/\/[^/]*$/, '/');
    return `${base}${trimmed.replace(/^\//, '')}`;
  }
}

function scoreImageCandidate(url: string): number {
  let score = 0;
  const lower = url.toLowerCase();
  if (/\.(jpe?g|png|webp|bmp)(\?|$)/i.test(lower)) score += 4;
  if (/(report|result|body|analyse|analyze|print|image|img|data|composition|measure)/i.test(lower)) score += 3;
  if (/(logo|icon|qr|avatar|thumb|banner|button|home\.svg|assets\/p[0-9])/i.test(lower)) score -= 6;
  if (lower.startsWith('data:image/')) score += 3;
  return score;
}

function collectParamValues(params: Record<string, string>, pathname: string, hashPath: string): string[] {
  const values = new Set<string>();
  const idKeys = [
    'id',
    'reportId',
    'report_id',
    'rid',
    'code',
    'sn',
    'uuid',
    'token',
    'dataId',
    'testId',
    'measureId',
    'recordId',
    'fileId',
    'imgId',
    'key',
    'd',
    'data',
  ];

  for (const key of idKeys) {
    const value = params[key];
    if (value?.trim()) values.add(value.trim());
  }

  for (const value of Object.values(params)) {
    if (value?.trim() && value.length >= 4 && value.length <= 128) values.add(value.trim());
  }

  for (const segment of `${pathname}/${hashPath}`.split('/')) {
    const clean = segment.trim();
    if (!clean || clean === 'index.html') continue;
    if (/^[a-zA-Z0-9_-]{4,128}$/.test(clean)) values.add(clean);
  }

  return [...values].slice(0, 5);
}

export function isBodbodyShareUrl(url: string): boolean {
  try {
    const parsed = new URL(normalizeReportUrl(url));
    if (BODBODY_SHARE_PAGE.test(parsed.pathname)) return true;
    if (BODBODY_HOST.test(parsed.hostname) && parsed.searchParams.has('id')) return true;
    if (/\/share\//i.test(parsed.pathname) && parsed.searchParams.has('id')) return true;
    return (
      parsed.searchParams.has('id') &&
      parsed.searchParams.has('sn') &&
      parsed.searchParams.has('time')
    );
  } catch {
    return false;
  }
}

export function getBodbodyAlternateOrigins(pageUrl: string): string[] {
  const url = new URL(pageUrl);
  const prioritized = [url.origin, 'http://bodbody.com.cn', 'http://119.23.70.228'];
  return [...new Set(prioritized)];
}

/** Gera variantes de query string (time com/sem formatação) para o padrão Bodbody. */
export function buildBodbodyQueryVariants(params: Record<string, string>): string[] {
  const id = params.id || params.reportId;
  if (!id) return [];

  const time = params.time || params.t || '';
  const sn = params.sn || '';
  const queries = new Set<string>();

  const append = (timeValue: string) => {
    const search = new URLSearchParams();
    search.set('id', id);
    if (timeValue) search.set('time', timeValue);
    if (sn) search.set('sn', sn);
    queries.add(`?${search.toString()}`);
  };

  append(time);

  if (time) {
    const digits = time.replace(/\D/g, '');
    if (digits.length >= 8 && digits !== time) append(digits);

    const dashed = time.replace(/\//g, '-');
    if (dashed !== time) append(dashed);

    // Unix em segundos (ex.: 1719143163) — algumas APIs Bodbody usam milissegundos
    if (/^\d{10}$/.test(time)) {
      append(String(Number(time) * 1000));
    }
  }

  return [...queries];
}

export function expandBodbodyPageUrls(pageUrl: string): string[] {
  const normalized = normalizeReportUrl(pageUrl);
  const url = new URL(normalized);
  const path = url.pathname && url.pathname !== '/' ? url.pathname : '/share/index.html';
  const query = url.search || '';

  const pages = new Set<string>([normalized]);
  for (const origin of getBodbodyAlternateOrigins(normalized)) {
    if (origin !== url.origin) {
      pages.add(`${origin}${path}${query}`);
    }
  }

  return [...pages].slice(0, 5);
}

/** Candidatos de imagem específicos do QR Bodbody (/share/index.html?id=&time=&sn=). */
export function buildBodbodyShareImageCandidates(pageUrl: string): string[] {
  if (!isBodbodyShareUrl(pageUrl)) return [];

  const ctx = parseReportPageUrl(pageUrl);
  const origins = getBodbodyAlternateOrigins(pageUrl);
  const queries = buildBodbodyQueryVariants(ctx.params);
  const candidates = new Set<string>();
  const id = ctx.params.id || ctx.params.reportId;

  for (const origin of origins) {
    for (const query of queries) {
      for (const path of BODBODY_IMAGE_PATHS) {
        candidates.add(`${origin}${path}${query}`);
      }
      candidates.add(`${origin}/share/index.html${query}`);
    }
    if (id) {
      candidates.add(`${origin}/share/${id}.jpg`);
      candidates.add(`${origin}/share/${id}.png`);
      candidates.add(`${origin}/share/report/${id}.jpg`);
      candidates.add(`${origin}/share/report/${id}.png`);
    }
  }

  return [...candidates].sort((a, b) => scoreImageCandidate(b) - scoreImageCandidate(a));
}

export function findApiEndpointsInHtml(html: string, pageUrl: string): string[] {
  const endpoints: string[] = [];
  const push = (value: string | undefined) => {
    if (!value) return;
    const cleaned = value.trim().replace(/^['"]|['"]$/g, '');
    if (!cleaned || cleaned.startsWith('data:')) return;
    if (!/(?:share|report|image|img|download|print|body|measure)/i.test(cleaned)) return;
    endpoints.push(cleaned.startsWith('http') ? cleaned : resolveRelativeUrl(pageUrl, cleaned));
  };

  for (const match of html.matchAll(/["'](\/(?:share|api|body|h5|web|prod-api)[^"'\\]{3,120})["']/gi)) {
    push(match[1]);
  }
  for (const match of html.matchAll(
    /(?:fetch|axios\.(?:get|post)|\.get|\.post)\s*\(\s*["']([^"']+)["']/gi
  )) {
    push(match[1]);
  }
  for (const match of html.matchAll(/url\s*:\s*["']([^"']+)["']/gi)) {
    push(match[1]);
  }

  return [...new Set(endpoints)].sort((a, b) => scoreImageCandidate(b) - scoreImageCandidate(a));
}

/** Gera URLs candidatas de imagem a partir do link do QR (SPA Bodbody/BodyAnalyse). */
export function buildImageCandidateUrls(pageUrl: string): string[] {
  const ctx = parseReportPageUrl(pageUrl);
  const ids = collectParamValues(ctx.params, ctx.pathname, ctx.hashPath);
  const origins = [ctx.origin, ...ctx.alternateOrigins];
  const candidates = new Set<string>();

  candidates.add(pageUrl);

  const pathMutations = new Set<string>();
  if (ctx.pathname && ctx.pathname !== '/') pathMutations.add(ctx.pathname);
  if (ctx.hashPath) pathMutations.add(ctx.hashPath.startsWith('/') ? ctx.hashPath : `/${ctx.hashPath}`);

  const initialPaths = [...pathMutations];
  for (const path of initialPaths) {
    pathMutations.add(`${path}.jpg`);
    pathMutations.add(`${path}.png`);
    pathMutations.add(`${path}/image`);
    pathMutations.add(`${path}/img`);
    pathMutations.add(`${path}/download`);
    pathMutations.add(`${path}/print`);
    pathMutations.add(path.replace(/\/show$/i, '/image'));
    pathMutations.add(path.replace(/\/view$/i, '/image'));
    pathMutations.add(path.replace(/\/detail$/i, '/image'));
    pathMutations.add(path.replace(/showReport/i, 'reportImage'));
    pathMutations.add(path.replace(/getReport/i, 'getReportImage'));
  }

  const apiTemplates = (id: string) => [
    `/report/image/${id}`,
    `/report/img/${id}`,
    `/report/image?id=${id}`,
    `/report/image?reportId=${id}`,
    `/report/getImage?id=${id}`,
    `/report/getImage?reportId=${id}`,
    `/report/getReportImage?id=${id}`,
    `/report/getReportImg?id=${id}`,
    `/report/getImg?id=${id}`,
    `/report/download/${id}`,
    `/report/download?id=${id}`,
    `/report/print/${id}`,
    `/report/showImage?id=${id}`,
    `/report/${id}/image`,
    `/report/${id}.jpg`,
    `/report/${id}.png`,
    `/api/report/image?id=${id}`,
    `/api/report/getImage?id=${id}`,
    `/api/report/img?id=${id}`,
    `/api/report/download?id=${id}`,
    `/api/body/report/image?id=${id}`,
    `/api/measure/report/image?id=${id}`,
    `/body/report/image?id=${id}`,
    `/body/report/getReportImg?id=${id}`,
    `/bodyComposition/report/image?id=${id}`,
    `/measure/report/image?id=${id}`,
    `/open/report/image?id=${id}`,
    `/public/report/image?id=${id}`,
    `/h5/report/image?id=${id}`,
    `/file/report/${id}`,
    `/file/download?id=${id}`,
    `/common/download?id=${id}`,
    `/common/file/download?id=${id}`,
    `/prod-api/report/image?id=${id}`,
    `/img/report/${id}`,
    `/image/report/${id}`,
    `/download/report/${id}`,
    `/r?id=${id}`,
    `/q?id=${id}`,
    `/s?id=${id}`,
    `/p?id=${id}`,
    `/d?id=${id}`,
    `/i?id=${id}`,
  ];

  for (const origin of origins) {
    for (const path of pathMutations) {
      candidates.add(`${origin}${path}`);
    }
    for (const id of ids) {
      for (const tpl of apiTemplates(id)) {
        candidates.add(`${origin}${tpl}`);
      }
    }
    const query = new URL(pageUrl).search;
    if (query) {
      candidates.add(`${origin}/report/image${query}`);
      candidates.add(`${origin}/api/report/image${query}`);
      candidates.add(`${origin}/report/getImage${query}`);
      candidates.add(`${origin}/body/report/image${query}`);
    }
  }

  const bodbody = buildBodbodyShareImageCandidates(pageUrl);
  return [...new Set([...bodbody, ...candidates])]
    .sort((a, b) => scoreImageCandidate(b) - scoreImageCandidate(a))
    .slice(0, 120);
}

export function findBase64ImageInHtml(html: string): string | null {
  const match = html.match(/data:image\/(?:jpe?g|png|webp|bmp);base64,[A-Za-z0-9+/=\s]{200,}/i);
  if (!match) return null;
  return match[0].replace(/\s+/g, '');
}

/** Extrai URL da imagem do relatório a partir do HTML/JS da página do QR Code. */
export function findImageUrlInHtml(html: string, pageUrl: string): string | null {
  const base64 = findBase64ImageInHtml(html);
  if (base64) return base64;

  const candidates: string[] = [];
  const push = (value: string | undefined) => {
    if (!value) return;
    const cleaned = value.trim().replace(/^['"]|['"]$/g, '');
    if (!cleaned || cleaned.startsWith('data:image/svg')) return;
    candidates.push(cleaned);
  };

  for (const match of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) push(match[1]);
  for (const match of html.matchAll(/<img[^>]+(?:data-src|data-original|data-lazy-src)=["']([^"']+)["']/gi)) {
    push(match[1]);
  }
  for (const match of html.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)) push(match[1]);
  for (const match of html.matchAll(/<embed[^>]+src=["']([^"']+)["']/gi)) push(match[1]);
  for (const match of html.matchAll(/<object[^>]+data=["']([^"']+)["']/gi)) push(match[1]);
  for (const match of html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi)) {
    push(match[1]);
  }
  for (const match of html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi)) {
    push(match[1]);
  }
  for (const match of html.matchAll(/background(?:-image)?:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) {
    push(match[1]);
  }
  for (const match of html.matchAll(
    /(?:imgUrl|imageUrl|reportUrl|picUrl|fileUrl|reportImg|reportImage|imagePath|srcUrl)\s*[:=]\s*["']([^"']+)["']/gi
  )) {
    push(match[1]);
  }
  for (const match of html.matchAll(/https?:\/\/[^\s"'<>]+\.(?:jpe?g|png|webp|bmp)(?:\?[^\s"'<>]*)?/gi)) {
    push(match[0]);
  }
  for (const match of html.matchAll(/["'](\/[^"']*(?:report|image|img|file|download|print|body|measure)[^"']*)["']/gi)) {
    push(match[1]);
  }

  const refresh = html.match(/http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"';]+)/i);
  if (refresh?.[1]) {
    const redirectUrl = resolveRelativeUrl(pageUrl, refresh[1].trim());
    if (/\.(jpe?g|png|webp|bmp)(\?|$)|(?:report|image|img)/i.test(redirectUrl)) {
      return redirectUrl;
    }
  }

  for (const endpoint of findApiEndpointsInHtml(html, pageUrl)) {
    push(endpoint);
  }

  if (!candidates.length) return null;

  const ranked = [...new Set(candidates)].sort(
    (a, b) => scoreImageCandidate(b) - scoreImageCandidate(a)
  );
  const best = ranked[0];
  return best.startsWith('data:') ? best : resolveRelativeUrl(pageUrl, best);
}

export function extractImageReferenceFromJson(text: string, pageUrl: string): string | null {
  try {
    const json = JSON.parse(text) as Record<string, unknown>;
    const queue: unknown[] = [json];
    const keys = [
      'imgUrl',
      'imageUrl',
      'reportUrl',
      'picUrl',
      'fileUrl',
      'url',
      'path',
      'src',
      'image',
      'img',
      'reportImage',
      'reportImg',
      'data',
      'base64',
      'content',
    ];

    while (queue.length) {
      const current = queue.shift();
      if (!current || typeof current !== 'object') continue;
      if (Array.isArray(current)) {
        queue.push(...current);
        continue;
      }
      for (const [key, value] of Object.entries(current as Record<string, unknown>)) {
        if (typeof value === 'string') {
          const lowerKey = key.toLowerCase();
          if (
            keys.some((k) => lowerKey.includes(k.toLowerCase())) ||
            /^data:image\//i.test(value) ||
            /\.(jpe?g|png|webp|bmp)(\?|$)/i.test(value) ||
            /(?:report|image|img|file|download)/i.test(value)
          ) {
            if (/^data:image\//i.test(value)) return value;
            if (/^[A-Za-z0-9+/=]{200,}$/.test(value)) {
              return `data:image/jpeg;base64,${value}`;
            }
            if (value.startsWith('http') || value.startsWith('/')) {
              return value.startsWith('http') ? value : resolveRelativeUrl(pageUrl, value);
            }
          }
        } else if (value && typeof value === 'object') {
          queue.push(value);
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

export interface BodbodyMetrics {
  weight?: number;
  skeletalMuscle?: number;
  bodyFat?: number;
  examDate?: Date;
}

function parseMetricNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string') {
    const n = parseFloat(value.replace(',', '.').trim());
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

function keyMatchesField(key: string, aliases: string[]): boolean {
  const normalized = key.toLowerCase().replace(/[_\s-]/g, '');
  return aliases.some((alias) => normalized === alias || normalized.includes(alias));
}

/** Extrai peso / músculo esquelético / gordura de respostas JSON da API Bodbody. */
export function extractMuscleFatFromJson(text: string): BodbodyMetrics | null {
  try {
    const json = JSON.parse(text) as unknown;
    const metrics: BodbodyMetrics = {};
    const queue: unknown[] = [json];

    const weightAliases = ['weight', 'wt', 'weightkg', 'bodyweight', 'peso', '体重', 'weigh'];
    const smmAliases = ['skeletalmuscle', 'smm', '骨骼肌', 'musclemasss', 'musclemass'];
    const fatAliases = ['bodyfat', 'bfm', 'fatmass', '体脂肪', 'fatweight', 'fatkg'];

    while (queue.length) {
      const current = queue.shift();
      if (!current || typeof current !== 'object') continue;
      if (Array.isArray(current)) {
        queue.push(...current);
        continue;
      }

      for (const [key, value] of Object.entries(current as Record<string, unknown>)) {
        const num = parseMetricNumber(value);
        if (num != null) {
          if (!metrics.weight && keyMatchesField(key, weightAliases) && num >= 30 && num <= 200) {
            metrics.weight = num;
          } else if (
            !metrics.skeletalMuscle &&
            keyMatchesField(key, smmAliases) &&
            num >= 15 &&
            num <= 80
          ) {
            metrics.skeletalMuscle = num;
          } else if (!metrics.bodyFat && keyMatchesField(key, fatAliases) && num >= 5 && num <= 80) {
            metrics.bodyFat = num;
          }
        } else if (value && typeof value === 'object') {
          queue.push(value);
        }
      }
    }

    if (metrics.weight != null && metrics.skeletalMuscle != null && metrics.bodyFat != null) {
      return metrics;
    }
    return null;
  } catch {
    return null;
  }
}
