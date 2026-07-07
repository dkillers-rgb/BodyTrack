import fs from 'fs';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { parseOcrText } from '../backend/src/services/ocrParser';

const imagePath =
  process.argv[2] ||
  'C:/Users/Uiry Monteiro/.cursor/projects/c-Users-Uiry-Monteiro-Music-body-BodyTrack-mobile/assets/c__Users_Uiry_Monteiro_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_WhatsApp_Image_2026-06-23_at_13.51.54__1_-b991b4aa-814a-4172-8ae4-fe7b1220510d.png';

async function ocrMfaCrop(buf: Buffer): Promise<string> {
  const meta = await sharp(buf).metadata();
  const w = meta.width || 1;
  const h = meta.height || 1;
  const regions = [
    { left: 0.02, top: 0.33, width: 0.96, height: 0.18 },
    { left: 0.25, top: 0.33, width: 0.55, height: 0.2 },
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
    const r = await Tesseract.recognize(cropped, 'eng', { logger: () => {} });
    if (r.data.text?.trim()) parts.push(r.data.text.trim());
  }
  return parts.join('\n');
}

async function main() {
  if (!fs.existsSync(imagePath)) {
    console.error('Image not found:', imagePath);
    process.exit(1);
  }
  const buf = fs.readFileSync(imagePath);
  const meta = await sharp(buf).metadata();
  const w = meta.width || 1;
  const h = meta.height || 1;

  const processed = await sharp(buf)
    .extract({ left: 0, top: Math.floor(h * 0.1), width: w, height: Math.floor(h * 0.9) })
    .resize({ width: 1600, withoutEnlargement: false })
    .sharpen()
    .png()
    .toBuffer();

  const { data } = await Tesseract.recognize(processed, 'eng', { logger: () => {} });
  const mfaCrop = await ocrMfaCrop(processed);
  const result = parseOcrText(`${data.text}\n${mfaCrop}`);

  console.log('Image:', imagePath);
  console.log('muscleFat:', result.muscleFat);
  console.log('\nMFA OCR:\n', mfaCrop.slice(0, 600));
}

main().catch(console.error);
