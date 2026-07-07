import fs from 'fs';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { parseOcrText } from '../backend/src/services/ocrParser';

const imagePath =
  'C:/Users/Uiry Monteiro/.cursor/projects/c-Users-Uiry-Monteiro-Music-body-BodyTrack-mobile/assets/c__Users_Uiry_Monteiro_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_WhatsApp_Image_2026-06-23_at_13.51.54__1_-b991b4aa-814a-4172-8ae4-fe7b1220510d.png';

async function tryCrop(name: string, region: { left: number; top: number; width: number; height: number }) {
  const buf = fs.readFileSync(imagePath);
  const meta = await sharp(buf).metadata();
  const w = meta.width || 1;
  const h = meta.height || 1;
  const cropped = await sharp(buf)
    .extract({
      left: Math.floor(w * region.left),
      top: Math.floor(h * region.top),
      width: Math.floor(w * region.width),
      height: Math.floor(h * region.height),
    })
    .resize(1800)
    .sharpen()
    .png()
    .toBuffer();
  const { data } = await Tesseract.recognize(cropped, 'eng', { logger: () => {} });
  const parsed = parseOcrText(data.text || '');
  console.log(`\n=== ${name} ===`);
  console.log('muscleFat:', parsed.muscleFat);
  console.log('text:', (data.text || '').slice(0, 350).replace(/\n/g, ' '));
}

async function main() {
  await tryCrop('left-mfa', { left: 0, top: 0.28, width: 0.35, height: 0.25 });
  await tryCrop('right-mfa', { left: 0.55, top: 0.28, width: 0.45, height: 0.25 });
  await tryCrop('full-no-center', { left: 0, top: 0.2, width: 1, height: 0.35 });
  await tryCrop('section7-weight', { left: 0.5, top: 0.55, width: 0.48, height: 0.35 });
}

main();
