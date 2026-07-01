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
  if (/(report|result|body|analyse|analyze|print|image|img|data|composition)/i.test(lower)) score += 3;
  if (/(logo|icon|qr|avatar|thumb|banner|button)/i.test(lower)) score -= 5;
  if (lower.startsWith('data:image/')) score += 2;
  return score;
}

/** Extrai URL da imagem do relatório a partir do HTML da página do QR Code. */
export function findImageUrlInHtml(html: string, pageUrl: string): string | null {
  const candidates: string[] = [];

  const push = (value: string | undefined) => {
    if (!value) return;
    const cleaned = value.trim().replace(/^['"]|['"]$/g, '');
    if (!cleaned || cleaned.startsWith('data:image/svg')) return;
    candidates.push(cleaned);
  };

  for (const match of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    push(match[1]);
  }
  for (const match of html.matchAll(/<img[^>]+src=([^\s>]+)/gi)) {
    push(match[1]);
  }
  for (const match of html.matchAll(/background(?:-image)?:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) {
    push(match[1]);
  }
  for (const match of html.matchAll(/(?:imgUrl|imageUrl|reportUrl|picUrl)\s*[:=]\s*["']([^"']+)["']/gi)) {
    push(match[1]);
  }
  for (const match of html.matchAll(/https?:\/\/[^\s"'<>]+\.(?:jpe?g|png|webp|bmp)(?:\?[^\s"'<>]*)?/gi)) {
    push(match[0]);
  }

  const refresh = html.match(/http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"';]+)/i);
  if (refresh?.[1]) {
    const redirectUrl = resolveRelativeUrl(pageUrl, refresh[1].trim());
    if (/\.(jpe?g|png|webp|bmp)(\?|$)/i.test(redirectUrl)) {
      return redirectUrl;
    }
  }

  if (!candidates.length) return null;

  const ranked = [...new Set(candidates)].sort(
    (a, b) => scoreImageCandidate(b) - scoreImageCandidate(a)
  );
  const best = ranked[0];
  return best.startsWith('data:') ? best : resolveRelativeUrl(pageUrl, best);
}
