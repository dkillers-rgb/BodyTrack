import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { parseOcrText, OcrResult } from './ocrParser';

declare global {
  // eslint-disable-next-line no-var
  var DOMMatrix: any;
}

let pdfParseModule: any = null;

async function loadPdfParse() {
  if (!pdfParseModule) {
    if (typeof global.DOMMatrix === 'undefined') {
      global.DOMMatrix = class DOMMatrix {
        constructor(..._args: any[]) {}
        multiply() {
          return this;
        }
        translateSelf() {
          return this;
        }
        scaleSelf() {
          return this;
        }
        rotateSelf() {
          return this;
        }
        invertSelf() {
          return this;
        }
        toString() {
          return 'matrix(1 0 0 1 0 0)';
        }
      };
    }

    const tryRequire = (modulePath: string) => {
      try {
        return require(modulePath);
      } catch {
        return null;
      }
    };

    const candidates = [
      'pdf-parse/dist/node/cjs/index.cjs',
      'pdf-parse/dist/pdf-parse/cjs/index.cjs',
      'pdf-parse',
    ];

    for (const candidate of candidates) {
      const mod = tryRequire(candidate);
      if (mod) {
        pdfParseModule = mod;
        break;
      }
    }

    if (!pdfParseModule) {
      const err = new Error('Unable to load pdf-parse module from any known entry point');
      console.warn('Failed to require pdf-parse:', err);
      throw err;
    }

    if (pdfParseModule && typeof pdfParseModule === 'object' && typeof pdfParseModule.default === 'function') {
      pdfParseModule = pdfParseModule.default;
    }
  }

  return pdfParseModule;
}

export function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString() === '%PDF-';
}

function hasPartialMuscleFatData(result: OcrResult): boolean {
  return !!(result.muscleFat.weight || result.muscleFat.skeletalMuscle || result.muscleFat.bodyFat);
}

export async function processReportOcr(buffer: Buffer, mimeType?: string): Promise<OcrResult> {
  if (mimeType === 'application/pdf' || isPdfBuffer(buffer)) {
    return processPdfOcr(buffer);
  }
  return processImageOcr(buffer);
}

async function processPdfOcr(pdfBuffer: Buffer): Promise<OcrResult> {
  // Try to use pdfParse for text extraction first
  try {
    const pdfParse = await loadPdfParse();
    let text = '';

    if (typeof pdfParse === 'function') {
      const data = await (pdfParse as any)(pdfBuffer);
      text = data?.text || '';
    } else if (pdfParse && pdfParse.PDFParse) {
      const Parser = pdfParse.PDFParse as any;
      const parser = new Parser({ data: pdfBuffer });
      const result = await parser.getText();
      text = result?.text || '';
      if (parser.destroy) await parser.destroy();
    } else {
      // fallback: try calling as function
      try {
        const data = await (pdfParse as any)(pdfBuffer);
        text = data?.text || '';
      } catch {
        // ignore
      }
    }

    if (text.trim()) {
      const parsed = parseOcrText(text);
      if (hasPartialMuscleFatData(parsed)) {
        return parsed;
      }
    }
  } catch (pdfError) {
    const errMsg = (pdfError as any)?.stack || String(pdfError);
    console.warn('PDF text parsing failed, will try image extraction:', errMsg);
  }

  // Convert PDF pages to images and run image OCR on each page
  const pages = await convertPdfToImages(pdfBuffer);
  for (const pageBuffer of pages) {
    const result = await processWithTesseract(pageBuffer);
    if (hasPartialMuscleFatData(result)) {
      return result;
    }
  }

  throw new Error('Não foi possível extrair dados do PDF');
}

async function convertPdfToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
  try {
    const importModule = new Function('modulePath', 'return import(modulePath)');
    const { pdf } = await importModule('pdf-to-img') as { pdf: (input: Buffer, options?: any) => any };
    const doc = await pdf(pdfBuffer, { scale: 2 });
    const pages: Buffer[] = [];
    for await (const page of doc) {
      pages.push(page as Buffer);
    }
    if (!pages.length) {
      throw new Error('Nenhuma página de PDF foi convertida para imagem');
    }
    return pages;
  } catch (error) {
    console.error('PDF to image conversion failed:', error);
    throw error;
  }
}

export async function processImageOcr(imageBuffer: Buffer): Promise<OcrResult> {
  const provider = process.env.OCR_PROVIDER || 'tesseract';

  switch (provider) {
    case 'google-vision':
      return processWithGoogleVision(imageBuffer);
    case 'aws-textract':
      throw new Error('AWS Textract ainda não implementado. Use tesseract ou google-vision.');
    case 'tesseract':
    default:
      return processWithTesseract(imageBuffer);
  }
}

async function preprocessReportImage(imageBuffer: Buffer): Promise<Buffer> {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 1;
  const height = metadata.height || 1;

  return sharp(imageBuffer)
    .extract({
      left: 0,
      top: Math.floor(height * 0.1),
      width,
      height: Math.floor(height * 0.9),
    })
    .resize({ width: 1600, withoutEnlargement: false })
    .sharpen()
    .png()
    .toBuffer();
}

async function ocrMuscleFatSection(imageBuffer: Buffer): Promise<string | null> {
  const metadata = await sharp(imageBuffer).metadata();
  const imageWidth = metadata.width || 0;
  const imageHeight = metadata.height || 0;
  if (!imageWidth || !imageHeight) return null;

  const top = Math.floor(imageHeight * 0.18);
  const height = Math.floor(imageHeight * 0.16);
  const left = Math.floor(imageWidth * 0.02);
  const width = Math.floor(imageWidth * 0.96);

  try {
    const cropRegion = {
      left,
      top: Math.min(top, imageHeight - 1),
      width: Math.min(width, imageWidth - left),
      height: Math.min(height, imageHeight - top),
    };

    const cropped = await sharp(imageBuffer)
      .extract(cropRegion)
      .resize({ width: 1600, withoutEnlargement: false })
      .sharpen()
      .png()
      .toBuffer();

    const inverted = await sharp(cropped).negate().linear(1.3, -30).sharpen().png().toBuffer();

    const [normalOcr, invertedOcr] = await Promise.all([
      Tesseract.recognize(cropped, 'eng', { logger: () => {} }),
      Tesseract.recognize(inverted, 'eng', { logger: () => {} }),
    ]);

    const parts = [normalOcr.data.text, invertedOcr.data.text]
      .map((text) => text?.trim())
      .filter(Boolean);

    return parts.length ? parts.join('\n') : null;
  } catch {
    return null;
  }
}

async function processWithTesseract(imageBuffer: Buffer): Promise<OcrResult> {
  const processed = await preprocessReportImage(imageBuffer);

  const { data: fullData } = await Tesseract.recognize(processed, 'eng', {
    logger: () => {},
  });

  let combinedText = fullData.text;
  const sectionText = await ocrMuscleFatSection(processed);
  if (sectionText) {
    combinedText += `\n\n--- MFA SECTION OCR ---\n${sectionText}`;
  }

  return parseOcrText(combinedText);
}

async function processWithGoogleVision(imageBuffer: Buffer): Promise<OcrResult> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_VISION_API_KEY não configurada');

  const base64 = imageBuffer.toString('base64');
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64 },
            features: [{ type: 'TEXT_DETECTION' }],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Google Vision API error: ${response.statusText}`);
  }

  const result = (await response.json()) as {
    responses?: { fullTextAnnotation?: { text?: string } }[];
  };
  const text = result.responses?.[0]?.fullTextAnnotation?.text || '';
  return parseOcrText(text);
}

export async function downloadImageFromUrl(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao baixar arquivo: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
