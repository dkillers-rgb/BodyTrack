import TextRecognition from '@react-native-ml-kit/text-recognition';
import { parseOcrText, OcrResult, OcrLine } from './ocrParser';
import { downloadToCache, removeFile, resolveLocalUri } from './fileStorage';
import type { OcrPreview } from './types';

function isPdfPath(path: string): boolean {
  return path.toLowerCase().endsWith('.pdf');
}

interface MlKitFrame {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

function normalizeFrame(frame: MlKitFrame | undefined): { left: number; top: number; right: number; bottom: number } {
  if (!frame) return { left: 0, top: 0, right: 0, bottom: 0 };
  if (frame.left !== undefined && frame.top !== undefined) {
    return {
      left: frame.left,
      top: frame.top,
      right: frame.right ?? frame.left,
      bottom: frame.bottom ?? frame.top,
    };
  }
  return {
    left: frame.x ?? 0,
    top: frame.y ?? 0,
    right: (frame.x ?? 0) + (frame.width ?? 0),
    bottom: (frame.y ?? 0) + (frame.height ?? 0),
  };
}

function flattenMlKitLines(result: {
  blocks?: Array<{
    lines?: Array<{ text?: string; frame?: MlKitFrame }>;
    frame?: MlKitFrame;
  }>;
}): OcrLine[] {
  const lines: OcrLine[] = [];
  for (const block of result.blocks ?? []) {
    for (const line of block.lines ?? []) {
      if (!line.text?.trim()) continue;
      lines.push({
        text: line.text.trim(),
        ...normalizeFrame(line.frame ?? block.frame),
      });
    }
  }
  return lines;
}

async function recognizeWithSpatial(uri: string): Promise<OcrResult> {
  const result = await TextRecognition.recognize(uri);
  const rawText = result.text || '';
  const lines = flattenMlKitLines(result as Parameters<typeof flattenMlKitLines>[0]);
  return parseOcrText(rawText, { lines });
}

export async function recognizeImageText(relativePath: string): Promise<string> {
  const uri = resolveLocalUri(relativePath);
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

  const uri = resolveLocalUri(relativePath);
  return recognizeWithSpatial(uri);
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

    const ocr = await recognizeWithSpatial(tempUri);
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
