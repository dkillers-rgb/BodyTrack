/**
 * Teste: QR da foto (paciente 164, 2026-06-23) → API TCY → relatório PDF.
 * Uso: npx tsx tools/gen_relatorio_qr_jun23.ts [caminho-imagem]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const req = createRequire(path.join(root, 'mobile', 'package.json'));

const FALLBACK_KEY = 'd067848a0baba8e41516f9934fd2cec7';
const DEFAULT_IMAGE = path.join(
  root,
  'assets/c__Users_Uiry_Monteiro_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_WhatsApp_Image_2026-06-23_at_13.51.54__1_-6949989d-7fbe-42e5-8288-abd6dbdff51c.png'
);

async function decodeQr(imagePath: string): Promise<string | null> {
  if (!fs.existsSync(imagePath)) return null;
  try {
    const sharp = req('sharp');
    const jsqr = req('jsqr');
    const tryDecode = (buf: Buffer, w: number, h: number) => {
      const code = jsqr(new Uint8ClampedArray(buf), w, h);
      return code?.data ?? null;
    };
    const { data, info } = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let text = tryDecode(data, info.width, info.height);
    if (text) return text;
    for (const c of [
      { l: 0.25, t: 0.28, w: 0.5, h: 0.42 },
      { l: 0.2, t: 0.22, w: 0.6, h: 0.5 },
      { l: 0.15, t: 0.2, w: 0.7, h: 0.55 },
    ]) {
      const crop = await sharp(imagePath)
        .extract({
          left: Math.floor(info.width * c.l),
          top: Math.floor(info.height * c.t),
          width: Math.floor(info.width * c.w),
          height: Math.floor(info.height * c.h),
        })
        .resize({ width: 1000, withoutEnlargement: false })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      text = tryDecode(crop.data, crop.info.width, crop.info.height);
      if (text) return text;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function extractKey(qrUrl: string | null): string {
  if (!qrUrl) return FALLBACK_KEY;
  try {
    const url = new URL(qrUrl.startsWith('http') ? qrUrl : `http://${qrUrl}`);
    return url.searchParams.get('key') || FALLBACK_KEY;
  } catch {
    return FALLBACK_KEY;
  }
}

async function main() {
  const imagePath = process.argv[2] || DEFAULT_IMAGE;
  const qrUrl = await decodeQr(imagePath);
  const key = extractKey(qrUrl);

  console.log('Imagem:', fs.existsSync(imagePath) ? imagePath : '(não encontrada)');
  console.log('QR:', qrUrl || `(fallback key ${FALLBACK_KEY})`);
  console.log('Key TCY:', key);

  const { fetchTcyReportDirect } = await import('../mobile/services/tcyReportMapper.ts');
  const { buildBodbodyReportHtml } = await import('../mobile/utils/bodbodyReportHtml.ts');

  const full = await fetchTcyReportDirect(key);
  const r = full.bodbodyReport;
  const examDate = r.examDate;

  const dashboard = {
    client: { id: 164, name: 'Paciente 164', gender: 'FEMALE' as const, age: 24, height: 160 },
    evaluations: [
      {
        id: '1',
        clientId: 164,
        examDate: `${examDate}T13:46:00.000Z`,
        weight: full.peso,
        skeletalMuscle: full.massaMuscularEsqueletica,
        bodyFat: full.gorduraCorporal,
        visceralFat: full.gorduraVisceral ?? r.section2.visceralFat.value,
      },
    ],
    chartData: [
      {
        date: examDate,
        weight: full.peso,
        skeletalMuscle: full.massaMuscularEsqueletica,
        bodyFat: full.gorduraCorporal,
      },
    ],
    analysis: '',
    summary: {
      totalEvaluations: 1,
      latestWeight: full.peso,
      latestMuscle: full.massaMuscularEsqueletica,
      latestFat: full.gorduraCorporal,
    },
    bodbodyReport: r,
  };

  const logoPath = path.join(root, 'output', 'logo-levez-simulacao.png');
  const company = {
    name: 'Clínica Levèz',
    address: 'Avenida Waldir Felizola de Moraes, Araçatuba - SP',
    phone: '99 999999999',
    logoDataUri: fs.existsSync(logoPath)
      ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
      : undefined,
  };

  const outDir = path.join(root, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const baseName = 'relatorio-qr-jun23';
  const htmlPath = path.join(outDir, `${baseName}.html`);
  const pdfPath = path.join(outDir, `${baseName}.pdf`);

  fs.writeFileSync(htmlPath, buildBodbodyReportHtml(dashboard, company), 'utf-8');

  const browsers = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  const browser = browsers.find((p) => fs.existsSync(p));
  if (browser) {
    execSync(
      `"${browser}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" --virtual-time-budget=10000 "file:///${htmlPath.replace(/\\/g, '/')}"`,
      { stdio: 'pipe', timeout: 30000 }
    );
  }

  console.log('\nRelatório gerado:');
  console.log('  HTML:', htmlPath);
  if (fs.existsSync(pdfPath)) console.log('  PDF:', pdfPath);
  console.log('  Peso:', r.section2.weight.value, 'kg');
  console.log('  Músculo esquelético:', r.section2.skeletalMuscle.value, 'kg');
  console.log('  Gordura corporal:', r.section2.bodyFat.value, 'kg');
  console.log('  Gordura visceral (índice):', r.section2.visceralFat.value);
  console.log('  IMC:', r.section3.bmi.value);
  console.log('  Gordura %:', r.section3.bodyFatPct.value);
  console.log('  Score:', r.section6.comprehensiveScore);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
