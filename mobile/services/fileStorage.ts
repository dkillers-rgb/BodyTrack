import * as FileSystem from 'expo-file-system';
import { resolveReportImageSource, normalizeReportUrl } from './reportUrlResolver';

export { normalizeReportUrl };

const REPORTS_DIR = `${FileSystem.documentDirectory}reports/`;

export async function ensureReportsDir(): Promise<string> {
  const info = await FileSystem.getInfoAsync(REPORTS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(REPORTS_DIR, { intermediates: true });
  }
  return REPORTS_DIR;
}

function extensionFromMime(mimeType?: string, fileName?: string): string {
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext && ext.length <= 5) return `.${ext}`;
  }
  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType === 'image/png') return '.png';
  return '.jpg';
}

export async function saveFromUri(
  sourceUri: string,
  mimeType?: string,
  fileName?: string
): Promise<string> {
  await ensureReportsDir();
  const ext = extensionFromMime(mimeType, fileName);
  const relativePath = `reports/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const destUri = `${FileSystem.documentDirectory}${relativePath}`;

  await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  return relativePath;
}

export async function saveFromUrl(url: string): Promise<string> {
  await ensureReportsDir();
  const normalizedUrl = normalizeReportUrl(url);
  const ext = normalizedUrl.toLowerCase().includes('.pdf') ? '.pdf' : '.jpg';
  const relativePath = `reports/${Date.now()}-qr${ext}`;
  const destUri = `${FileSystem.documentDirectory}${relativePath}`;

  const download = await FileSystem.downloadAsync(normalizedUrl, destUri);
  if (download.status !== 200) {
    throw new Error(`Falha ao baixar arquivo: HTTP ${download.status}`);
  }

  return relativePath;
}

export function resolveLocalUri(relativePath: string): string {
  if (relativePath.startsWith('file://') || relativePath.startsWith('content://')) {
    return relativePath;
  }
  return `${FileSystem.documentDirectory}${relativePath}`;
}

/** Baixa para cache temporário (OCR). Deve ser removido após o uso. */
export async function downloadToCache(url: string): Promise<string> {
  try {
    const imageSource = await resolveReportImageSource(url);

    if (imageSource.startsWith('file://') || imageSource.startsWith('content://')) {
      return imageSource;
    }

    const ext = imageSource.toLowerCase().includes('.pdf') ? '.pdf' : '.jpg';
    const destUri = `${FileSystem.cacheDirectory}qr-temp-${Date.now()}${ext}`;
    const download = await FileSystem.downloadAsync(imageSource, destUri);
    if (download.status !== 200) {
      throw new Error(`Falha ao baixar imagem do relatório: HTTP ${download.status}`);
    }
    return download.uri || destUri;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/cleartext/i.test(message)) {
      throw new Error(
        'O Android bloqueou o download HTTP do relatório. Reinstale o app com a versão mais recente (permite HTTP dos equipamentos BodyAnalyse).'
      );
    }
    if (/Uri could not be resolved|could not be resolved/i.test(message)) {
      throw new Error(
        'Não foi possível abrir a imagem do relatório no link do QR Code. Verifique sua conexão e tente novamente.'
      );
    }
    throw error;
  }
}

export async function removeFile(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    /* arquivo temporário pode já ter sido removido */
  }
}
