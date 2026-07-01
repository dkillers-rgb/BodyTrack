import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import fs from 'fs';

const imagePath =
  'C:/Users/Uiry Monteiro/.cursor/projects/c-Users-Uiry-Monteiro-Music-body-BodyTrack-mobile/assets/c__Users_Uiry_Monteiro_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-37f1563e-ca7c-4a39-a48c-4006b95ed6d4.png';

async function ocrCrop(buf: Buffer, topPct: number, heightPct: number, label: string) {
  const meta = await sharp(buf).metadata();
  const w = meta.width || 1;
  const h = meta.height || 1;
  const top = Math.floor(h * topPct);
  const height = Math.floor(h * heightPct);

  const cropped = await sharp(buf)
    .extract({ left: Math.floor(w * 0.02), top, width: Math.floor(w * 0.96), height })
    .resize({ width: 1600, withoutEnlargement: false })
    .sharpen()
    .png()
    .toBuffer();

  const inverted = await sharp(cropped).negate().linear(1.3, -30).sharpen().png().toBuffer();

  const [normal, inv] = await Promise.all([
    Tesseract.recognize(cropped, 'eng', { logger: () => {} }),
    Tesseract.recognize(inverted, 'eng', { logger: () => {} }),
  ]);

  console.log(`\n=== ${label} (top ${topPct}, h ${heightPct}) ===`);
  console.log('NORMAL:', normal.data.text);
  console.log('INVERTED:', inv.data.text);
}

async function main() {
  const buf = fs.readFileSync(imagePath);
  await ocrCrop(buf, 0.2, 0.22, 'MFA section (backend crop)');
  await ocrCrop(buf, 0.35, 0.15, 'MFA alt crop');
  await ocrCrop(buf, 0.45, 0.12, 'MFA row area');
}

main().catch(console.error);
