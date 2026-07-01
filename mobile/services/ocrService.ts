import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'react-native';
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

function ensureReadableImageUri(uri: string): string {
  if (uri.startsWith('file://') || uri.startsWith('content://') || /^https?:\/\//i.test(uri)) {
    return uri;
  }
  if (uri.startsWith('/')) {
    return `file://${uri}`;
  }
  return uri;
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  const readableUri = ensureReadableImageUri(uri);
  return new Promise((resolve, reject) => {
    Image.getSize(readableUri, (width, height) => resolve({ width, height }), reject);
  });
}

/** Recorte da seção 2 (Muscle Fat Analysis) para melhorar leitura dos valores no fim das barras. */
async function ocrMuscleFatSection(uri: string): Promise<string | null> {
  try {
    const readableUri = ensureReadableImageUri(uri);
    const { width, height } = await getImageSize(readableUri);
    if (!width || !height) return null;

    const cropRegions = [
      { originX: Math.floor(width * 0.02), originY: Math.floor(height * 0.33), width: Math.floor(width * 0.96), height: Math.floor(height * 0.18) },
      { originX: Math.floor(width * 0.25), originY: Math.floor(height * 0.33), width: Math.floor(width * 0.55), height: Math.floor(height * 0.20) },
      { originX: Math.floor(width * 0.28), originY: Math.floor(height * 0.33), width: Math.floor(width * 0.52), height: Math.floor(height * 0.20) },
    ];

    const parts: string[] = [];
    for (const crop of cropRegions) {
      const cropped = await ImageManipulator.manipulateAsync(
        readableUri,
        [{ crop }],
        { compress: 1, format: ImageManipulator.SaveFormat.PNG }
      );
      const result = await TextRecognition.recognize(cropped.uri);
      if (result.text?.trim()) parts.push(result.text.trim());
    }

    return parts.length ? parts.join('\n') : null;
  } catch {
    return null;
  }
}

async function recognizeWithSpatial(uri: string): Promise<OcrResult> {
  const readableUri = ensureReadableImageUri(uri);
  const result = await TextRecognition.recognize(readableUri);
  const rawText = result.text || '';
  const lines = flattenMlKitLines(result as Parameters<typeof flattenMlKitLines>[0]);

  let combinedText = rawText;
  const sectionText = await ocrMuscleFatSection(readableUri);
  if (sectionText) {
    combinedText += `\n\n--- MFA SECTION OCR ---\n${sectionText}`;
  }

  return parseOcrText(combinedText, { lines });
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
