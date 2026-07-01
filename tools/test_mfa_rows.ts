import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import fs from 'fs';

const imagePath =
  'C:/Users/Uiry Monteiro/.cursor/projects/c-Users-Uiry-Monteiro-Music-body-BodyTrack-mobile/assets/c__Users_Uiry_Monteiro_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-37f1563e-ca7c-4a39-a48c-4006b95ed6d4.png';

async function ocrRegion(buf: Buffer, leftPct: number, topPct: number, widthPct: number, heightPct: number, label: string) {
  const meta = await sharp(buf).metadata();
  const w = meta.width || 1;
  const h = meta.height || 1;

  const cropped = await sharp(buf)
    .extract({
      left: Math.floor(w * leftPct),
      top: Math.floor(h * topPct),
      width: Math.floor(w * widthPct),
      height: Math.floor(h * heightPct),
    })
    .resize({ width: 800, withoutEnlargement: false })
    .sharpen()
    .png()
    .toBuffer();

  const { data } = await Tesseract.recognize(cropped, 'eng', { logger: () => {} });
  console.log(`\n=== ${label} ===`);
  console.log(data.text.trim() || '(empty)');
}

async function main() {
  const buf = fs.readFileSync(imagePath);
  const meta = await sharp(buf).metadata();
  console.log('Image size:', meta.width, 'x', meta.height);

  // Right side of MFA section (bar end values)
  await ocrRegion(buf, 0.35, 0.32, 0.45, 0.18, 'MFA right (values column)');
  await ocrRegion(buf, 0.40, 0.34, 0.35, 0.16, 'MFA values narrow');
  await ocrRegion(buf, 0.30, 0.33, 0.50, 0.20, 'MFA wide');
  // Each row individually
  await ocrRegion(buf, 0.25, 0.34, 0.55, 0.04, 'Weight row');
  await ocrRegion(buf, 0.25, 0.39, 0.55, 0.04, 'Skeletal row');
  await ocrRegion(buf, 0.25, 0.44, 0.55, 0.04, 'Body fat row');
}

main().catch(console.error);
