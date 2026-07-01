/**
 * Extrai `key` de URLs TCY.
 * Modelo: https://119.23.70.228/tcy/index.html?lang=en&key=d067848a...
 */
export function extractReportKey(qrUrl: string): string | null {
  try {
    const trimmed = qrUrl.trim();
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(normalized);
    if (!url.pathname.includes('/tcy/')) return null;
    return url.searchParams.get('key');
  } catch {
    return null;
  }
}

export function isTcyReportUrl(qrUrl: string): boolean {
  return extractReportKey(qrUrl) != null;
}
