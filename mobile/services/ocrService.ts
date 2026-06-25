import TextRecognition from '@react-native-ml-kit/text-recognition';
import { parseOcrText, OcrResult } from './ocrParser';
import { downloadToCache, removeFile, resolveLocalUri } from './fileStorage';
import type { OcrPreview } from './types';

function isPdfPath(path: string): boolean {
  return path.toLowerCase().endsWith('.pdf');
}

export async function recognizeImageText(relativePath: string): Promise<string> {
  const uri = resolveLocalUri(relativePath);
  const result = await TextRecognition.recognize(uri);
  return result.text || '';
}

async function recognizeFromUri(uri: string): Promise<string> {
  const result = await TextRecognition.recognize(uri);
  return result.text || '';
}

export async function processReportFile(
  relativePath: string,
  mimeType?: string
): Promise<OcrResult> {
  const isPdf = mimeType === 'application/pdf' || isPdfPath(relativePath);

  if (isPdf) {
    return {
      rawText: '',
      patient: {},
      muscleFat: {},
    };
  }

  const rawText = await recognizeImageText(relativePath);
  return parseOcrText(rawText);
}

/** Baixa imagem da URL do QR, extrai dados e descarta o arquivo temporário. */
export async function processQrUrl(url: string): Promise<OcrPreview> {
  const tempUri = await downloadToCache(url.trim());

  try {
    if (isPdfPath(tempUri)) {
      return toOcrPreview(undefined, {
        rawText: '',
        patient: {},
        muscleFat: {},
      });
    }

    const rawText = await recognizeFromUri(tempUri);
    const ocr = parseOcrText(rawText);
    return toOcrPreview(undefined, ocr);
  } finally {
    await removeFile(tempUri);
  }
}

export function toOcrPreview(relativePath: string | undefined, ocr: OcrResult): OcrPreview {
  return {
    ...(relativePath ? { imagePath: relativePath } : {}),
    preview: {
      patient: {
        examDate: ocr.patient.examDate?.toISOString(),
      },
      muscleFat: ocr.muscleFat,
    },
    ocr: { rawText: ocr.rawText },
  };
}
