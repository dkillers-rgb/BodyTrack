import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs';
import { parseOcrText } from '../backend/src/services/ocrParser';

const imagePath =
  'C:/Users/Uiry Monteiro/.cursor/projects/c-Users-Uiry-Monteiro-Music-body-BodyTrack-mobile/assets/c__Users_Uiry_Monteiro_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-37f1563e-ca7c-4a39-a48c-4006b95ed6d4.png';

async function ocrMfaCrop(buf: Buffer): Promise<string> {
  const meta = await sharp(buf).metadata();
  const w = meta.width || 1;
  const h = meta.height || 1;
  const regions = [
    { left: 0.02, top: 0.33, width: 0.96, height: 0.18 },
    { left: 0.25, top: 0.33, width: 0.55, height: 0.20 },
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
    const { data } = await Tesseract.recognize(cropped, 'eng', { logger: () => {} });
    if (data.text?.trim()) parts.push(data.text.trim());
  }
  return parts.join('\n');
}

async function main() {
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
  const combined = `${data.text}\n\n--- MFA SECTION OCR ---\n${mfaCrop}`;

  const spatialLines = (data.lines ?? [])
    .filter((l) => l.text?.trim() && l.bbox)
    .map((l) => ({
      text: l.text!.trim(),
      left: l.bbox!.x0,
      top: l.bbox!.y0,
      right: l.bbox!.x1,
      bottom: l.bbox!.y1,
    }));

  console.log('text only:', parseOcrText(combined).muscleFat);
  console.log('with spatial:', parseOcrText(combined, { lines: spatialLines }).muscleFat);
}

main().catch(console.error);
