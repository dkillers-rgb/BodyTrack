/**
 * Simula o fluxo scanQr: URL do QR → baixar imagem → OCR → extrair dados.
 * Uso: npx tsx tools/test_bodbody_qr_scan.ts [url]
 */
import fs from 'fs';
import path from 'path';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import {
  buildBodbodyShareImageCandidates,
  expandBodbodyPageUrls,
  extractImageReferenceFromJson,
  findApiEndpointsInHtml,
  findImageUrlInHtml,
  isBodbodyShareUrl,
  isImageBytes,
  looksLikeHtml,
  normalizeReportUrl,
} from '../mobile/services/reportUrlUtils';
import { parseOcrText } from '../backend/src/services/ocrParser';

const DEFAULT_QR_URL =
  'http://bodbody.com.cn/share/index.html?id=164&time=1719143163&sn=88888888';

const FALLBACK_IMAGE =
  'C:/Users/Uiry Monteiro/.cursor/projects/c-Users-Uiry-Monteiro-Music-body-BodyTrack-mobile/assets/c__Users_Uiry_Monteiro_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_WhatsApp_Image_2026-06-23_at_13.51.54__1_-b991b4aa-814a-4172-8ae4-fe7b1220510d.png';

async function fetchResource(url: string, referer?: string) {
  const response = await fetch(url, {
    headers: {
      Accept: 'image/avif,image/webp,image/apng,image/*,application/pdf,application/json,text/html,*/*',
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      ...(referer ? { Referer: referer } : {}),
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    finalUrl: response.url || url,
    bytes: buffer,
    contentType: (response.headers.get('content-type') || '').toLowerCase(),
  };
}

async function probeImageUrl(url: string, referer?: string): Promise<Buffer | null> {
  try {
    const { bytes, contentType, finalUrl } = await fetchResource(url, referer);
    const arr = new Uint8Array(bytes);

    if (isImageBytes(arr)) return bytes;

    if (contentType.includes('json') || bytes[0] === 0x7b) {
      const imageRef = extractImageReferenceFromJson(bytes.toString('utf-8'), finalUrl);
      if (!imageRef) return null;
      if (imageRef.startsWith('data:')) {
        const m = imageRef.match(/^data:[^;]+;base64,(.+)$/i);
        return m ? Buffer.from(m[1], 'base64') : null;
      }
      return probeImageUrl(imageRef, referer || finalUrl);
    }

    const text = bytes.toString('utf-8');
    if (looksLikeHtml(text)) {
      const imageRef = findImageUrlInHtml(text, finalUrl);
      if (imageRef?.startsWith('data:')) {
        const m = imageRef.match(/^data:[^;]+;base64,(.+)$/i);
        return m ? Buffer.from(m[1], 'base64') : null;
      }
      if (imageRef) return probeImageUrl(imageRef, referer || finalUrl);

      const endpoints = findApiEndpointsInHtml(text, finalUrl);
      for (const ep of endpoints.slice(0, 10)) {
        const hit = await probeImageUrl(ep, referer || finalUrl);
        if (hit) return hit;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveReportImage(qrUrl: string): Promise<{ source: string; buffer: Buffer } | null> {
  const pageUrl = normalizeReportUrl(qrUrl);
  const pageUrls = isBodbodyShareUrl(pageUrl) ? expandBodbodyPageUrls(pageUrl) : [pageUrl];

  for (const current of pageUrls) {
    try {
      const page = await fetchResource(current, pageUrl);
      const arr = new Uint8Array(page.bytes);
      if (isImageBytes(arr)) return { source: current, buffer: page.bytes };

      const text = page.bytes.toString('utf-8');
      if (looksLikeHtml(text)) {
        const ref = findImageUrlInHtml(text, page.finalUrl);
        if (ref) {
          const buf = ref.startsWith('data:')
            ? Buffer.from(ref.replace(/^data:[^;]+;base64,/, ''), 'base64')
            : await probeImageUrl(ref, pageUrl);
          if (buf) return { source: ref, buffer: buf };
        }
      }
    } catch (e) {
      console.log(`  page fail: ${current} → ${e instanceof Error ? e.message : e}`);
    }
  }

  const candidates = buildBodbodyShareImageCandidates(pageUrl);
  console.log(`  probing ${candidates.length} Bodbody image candidates...`);
  for (let i = 0; i < candidates.length; i += 6) {
    const batch = candidates.slice(i, i + 6);
    const results = await Promise.all(batch.map((u) => probeImageUrl(u, pageUrl)));
    const hit = results.find((b) => b && b.length > 1000);
    if (hit) {
      const idx = results.indexOf(hit);
      return { source: batch[idx], buffer: hit };
    }
  }

  return null;
}

async function ocrMfaCrop(buf: Buffer): Promise<string> {
  const meta = await sharp(buf).metadata();
  const w = meta.width || 1;
  const h = meta.height || 1;

  const regions = [
    { left: 0.02, top: 0.33, width: 0.96, height: 0.18 },
    { left: 0.25, top: 0.33, width: 0.55, height: 0.20 },
    { left: 0.28, top: 0.33, width: 0.52, height: 0.20 },
  ];

  const parts: string[] = [];
  for (const region of regions) {
    const cropped = await sharp(buf)
      .extract({
        left: Math.floor(w * region.left),
        top: Math.floor(h * region.top),
        width: Math.floor(w * region.width),
        height: Math.floor(h * region.height),
      })
      .resize({ width: 1600, withoutEnlargement: false })
      .sharpen()
      .png()
      .toBuffer();

    const inverted = await sharp(cropped).negate().linear(1.3, -30).sharpen().png().toBuffer();
    const [normal, inv] = await Promise.all([
      Tesseract.recognize(cropped, 'eng', { logger: () => {} }),
      Tesseract.recognize(inverted, 'eng', { logger: () => {} }),
    ]);
    if (normal.data.text?.trim()) parts.push(normal.data.text.trim());
    if (inv.data.text?.trim()) parts.push(inv.data.text.trim());
  }
  return parts.join('\n');
}

async function runOcr(buf: Buffer) {
  const mfaText = await ocrMfaCrop(buf);
  const full = await Tesseract.recognize(buf, 'eng', { logger: () => {} });
  const combined = [full.data.text, mfaText].filter(Boolean).join('\n');
  const parsed = parseOcrText(combined);
  return { parsed, mfaText, rawSample: combined.slice(0, 800) };
}

async function main() {
  const qrUrl = process.argv[2] || DEFAULT_QR_URL;
  console.log('=== Simulação scanQr Bodbody ===');
  console.log('QR URL:', qrUrl);
  console.log('isBodbodyShareUrl:', isBodbodyShareUrl(qrUrl));

  let imageBuffer: Buffer | null = null;
  let imageSource = '';

  console.log('\n1) Resolvendo imagem do relatório via URL...');
  const resolved = await resolveReportImage(qrUrl);
  if (resolved) {
    imageSource = resolved.source;
    imageBuffer = resolved.buffer;
    console.log('   OK:', imageSource, `(${imageBuffer.length} bytes)`);
  } else {
    console.log('   URL inacessível daqui — usando screenshot do relatório como fallback OCR.');
    if (fs.existsSync(FALLBACK_IMAGE)) {
      imageBuffer = fs.readFileSync(FALLBACK_IMAGE);
      imageSource = FALLBACK_IMAGE;
    }
  }

  if (!imageBuffer) {
    console.error('FAIL: Nenhuma imagem disponível para OCR.');
    process.exit(1);
  }

  const outDir = path.join(__dirname, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'bodbody-scan-test.jpg');
  fs.writeFileSync(outPath, imageBuffer);
  console.log('\n2) Imagem salva em:', outPath);

  console.log('\n3) Executando OCR...');
  const { parsed, mfaText } = await runOcr(imageBuffer);

  const { weight, skeletalMuscle, bodyFat } = parsed.muscleFat;
  console.log('\n=== Resultado extraído ===');
  console.log('Peso (kg):', weight ?? '(não encontrado)');
  console.log('Músculo esquelético (kg):', skeletalMuscle ?? '(não encontrado)');
  console.log('Gordura corporal (kg):', bodyFat ?? '(não encontrado)');
  console.log('Data exame:', parsed.patient.examDate?.toISOString?.() ?? '(não encontrado)');

  console.log('\n--- MFA OCR snippet ---');
  console.log(mfaText.slice(0, 400));

  const ok = weight != null && skeletalMuscle != null && bodyFat != null;
  if (ok) {
    console.log('\nPASS: Dados da seção Muscle Fat Analysis extraídos com sucesso.');
    process.exit(0);
  }

  console.log('\nFAIL: Nem todos os campos foram extraídos. Verifique o parser OCR.');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
