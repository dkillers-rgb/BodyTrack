import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import fs from 'fs';
import { parseOcrText } from '../backend/src/services/ocrParser';

const p =
  'C:/Users/Uiry Monteiro/.cursor/projects/c-Users-Uiry-Monteiro-Music-body-BodyTrack-mobile/assets/c__Users_Uiry_Monteiro_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-37f1563e-ca7c-4a39-a48c-4006b95ed6d4.png';

async function run() {
  const buf = fs.readFileSync(p);
  const meta = await sharp(buf).metadata();
  const W = meta.width || 1;
  const H = meta.height || 1;

  const crops: Array<[number, number, number, number, string]> = [
    [0.3, 0.33, 0.5, 0.2, 'orig wide'],
    [0.25, 0.38, 0.5, 0.06, 'skeletal row'],
    [0.35, 0.38, 0.4, 0.05, 'skeletal values'],
    [0.15, 0.36, 0.7, 0.1, 'mfa mid'],
  ];

  for (const [l, t, w, h, name] of crops) {
    const c = await sharp(buf)
      .extract({
        left: Math.floor(W * l),
        top: Math.floor(H * t),
        width: Math.floor(W * w),
        height: Math.floor(H * h),
      })
      .resize({ width: 1200 })
      .sharpen()
      .png()
      .toBuffer();
    const { data } = await Tesseract.recognize(c, 'eng', { logger: () => {} });
    const m = parseOcrText(`--- MFA SECTION OCR ---\n${data.text}`).muscleFat;
    console.log(`\n${name}:`);
    console.log(data.text.trim());
    console.log('parsed:', m);
  }
}

run().catch(console.error);
