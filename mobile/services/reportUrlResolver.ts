import * as FileSystem from 'expo-file-system';
import {
  findImageUrlInHtml,
  isJpeg,
  isPdf,
  isPng,
  looksLikeHtml,
  normalizeReportUrl,
} from './reportUrlUtils';

export { normalizeReportUrl, findImageUrlInHtml } from './reportUrlUtils';

function extensionFromBytes(bytes: Uint8Array): string {
  if (isPdf(bytes)) return '.pdf';
  if (isPng(bytes)) return '.png';
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
  const base64 = bytesToBase64(bytes);
  await FileSystem.writeAsStringAsync(destUri, base64, {
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

async function fetchPage(url: string): Promise<{ finalUrl: string; bytes: Uint8Array; contentType: string }> {
  const response = await fetch(url, {
    headers: { Accept: 'image/*,application/pdf,text/html,*/*' },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Falha ao acessar o link do QR Code: HTTP ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  return {
    finalUrl: response.url || url,
    bytes: new Uint8Array(buffer),
    contentType: (response.headers.get('content-type') || '').toLowerCase(),
  };
}

/**
 * Acessa o link do QR Code e resolve a URL (ou arquivo local) da imagem do relatório.
 * Equipamentos BodyAnalyse/Bodbody costumam abrir uma página HTML com a imagem embutida.
 */
export async function resolveReportImageSource(rawUrl: string): Promise<string> {
  const pageUrl = normalizeReportUrl(rawUrl);
  const { finalUrl, bytes, contentType } = await fetchPage(pageUrl);

  if (isJpeg(bytes) || isPng(bytes) || isPdf(bytes)) {
    return saveBytesToCache(bytes);
  }

  if (contentType.startsWith('image/') || contentType.includes('pdf')) {
    return finalUrl;
  }

  const html = new TextDecoder('utf-8').decode(bytes);
  if (!looksLikeHtml(html)) {
    throw new Error('O link do QR Code não retornou uma imagem válida do relatório.');
  }

  const imageRef = findImageUrlInHtml(html, finalUrl);
  if (!imageRef) {
    throw new Error(
      'Não foi possível encontrar a imagem do relatório na página. Verifique se o link do QR Code está acessível.'
    );
  }

  if (imageRef.startsWith('data:')) {
    return saveDataUriToCache(imageRef);
  }

  return imageRef;
}
