import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import fs from 'fs';
import { parseOcrText } from '../backend/src/services/ocrParser';

const imagePath =
  'C:/Users/Uiry Monteiro/.cursor/projects/c-Users-Uiry-Monteiro-Music-body-BodyTrack-mobile/assets/c__Users_Uiry_Monteiro_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-37f1563e-ca7c-4a39-a48c-4006b95ed6d4.png';

async function tryCrop(buf: Buffer, l: number, t: number, w: number, h: number, label: string) {
  const meta = await sharp(buf).metadata();
  const W = meta.width || 1;
  const H = meta.height || 1;
  const cropped = await sharp(buf)
    .extract({
      left: Math.floor(W * l),
      top: Math.floor(H * t),
      width: Math.floor(W * w),
      height: Math.floor(H * h),
    })
    .resize({ width: 1200, withoutEnlargement: false })
    .sharpen()
    .png()
    .toBuffer();
  const { data } = await Tesseract.recognize(cropped, 'eng', { logger: () => {} });
  const parsed = parseOcrText(`--- MFA SECTION OCR ---\n${data.text}`).muscleFat;
  console.log(`\n${label}:`, data.text.replace(/\n/g, ' | '));
  console.log('  parsed:', parsed);
}

async function main() {
  const buf = fs.readFileSync(imagePath);
  const meta = await sharp(buf).metadata();
  const processed = await sharp(buf)
    .extract({ left: 0, top: Math.floor((meta.height || 1) * 0.1), width: meta.width || 1, height: Math.floor((meta.height || 1) * 0.9) })
    .resize({ width: 1600, withoutEnlargement: false })
    .sharpen()
    .png()
    .toBuffer();

  await tryCrop(processed, 0.02, 0.33, 0.96, 0.18, 'current');
  await tryCrop(processed, 0.25, 0.33, 0.55, 0.20, 'wide center');
  await tryCrop(processed, 0.20, 0.35, 0.60, 0.16, 'wide alt');
  await tryCrop(processed, 0.02, 0.30, 0.96, 0.22, 'taller');
}

main().catch(console.error);
