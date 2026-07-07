/**
 * Teste: decodifica QR da imagem, busca dados TCY, gera HTML/PDF do relatório Bodbody.
 * Uso: npx tsx tools/test_generate_report_pdf.ts [caminho-imagem]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function decodeQr(imagePath: string): Promise<string | null> {
  const sharp = (await import('sharp')).default;
  const jsqr = (await import('jsqr')).default;

  const tryDecode = async (buf: Buffer, w: number, h: number) => {
    const code = jsqr(new Uint8ClampedArray(buf), w, h);
    return code?.data ?? null;
  };

  const { data, info } = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let text = await tryDecode(data, info.width, info.height);
  if (text) return text;

  const crops = [
    { left: 0.25, top: 0.28, w: 0.5, h: 0.42 },
    { left: 0.2, top: 0.22, w: 0.6, h: 0.5 },
    { left: 0.15, top: 0.2, w: 0.7, h: 0.55 },
    { left: 0.1, top: 0.15, w: 0.8, h: 0.65 },
    { left: 0.3, top: 0.32, w: 0.4, h: 0.35 },
  ];
  for (const c of crops) {
    const crop = await sharp(imagePath)
      .extract({
        left: Math.floor(info.width * c.left),
        top: Math.floor(info.height * c.top),
        width: Math.floor(info.width * c.w),
        height: Math.floor(info.height * c.h),
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    text = await tryDecode(crop.data, crop.info.width, crop.info.height);
    if (text) return text;

    // Amplia o recorte — QR em modal costuma ficar pequeno na foto
    const scaled = await sharp(imagePath)
      .extract({
        left: Math.floor(info.width * c.left),
        top: Math.floor(info.height * c.top),
        width: Math.floor(info.width * c.w),
        height: Math.floor(info.height * c.h),
      })
      .resize({ width: 800, withoutEnlargement: false })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    text = await tryDecode(scaled.data, scaled.info.width, scaled.info.height);
    if (text) return text;
  }
  return null;
}

async function main() {
  const defaultImage = path.join(root, 'output', 'qr-test.png');
  const imagePath = process.argv[2] || defaultImage;

  if (!fs.existsSync(imagePath)) {
    console.error('Imagem não encontrada:', imagePath);
    process.exit(1);
  }

  console.log('1. Decodificando QR de:', imagePath);
  let qrUrl = await decodeQr(imagePath);

  if (!qrUrl) {
    console.error('   Não foi possível ler o QR Code da imagem.');
    process.exit(1);
  }
  console.log('   QR lido:', qrUrl);

  const key = new URL(qrUrl.startsWith('http') ? qrUrl : `http://${qrUrl}`).searchParams.get('key');
  if (!key) {
    console.error('Sem key na URL');
    process.exit(1);
  }
  console.log('2. Key:', key);

  const { fetchTcyReportDirect } = await import('../mobile/services/tcyReportMapper.ts');
  const { mapCodeValueToBodbodyReport } = await import('../mobile/services/bodbodyReportMapper.ts');
  const { buildBodbodyReportHtml } = await import('../mobile/utils/bodbodyReportHtml.ts');

  let full;
  try {
    full = await fetchTcyReportDirect(key);
    console.log('3. Dados TCY OK:', {
      peso: full.peso,
      musculo: full.massaMuscularEsqueletica,
      gordura: full.gorduraCorporal,
    });
  } catch (e) {
    console.error('3. Falha TCY API:', e instanceof Error ? e.message : e);
    console.log('   Gerando relatório com dados estimados da foto (Mulher 32a, 158cm)...');
    const estimated = mapCodeValueToBodbodyReport(
      '["149","158","F","32","158","11:39 2026.07.01","30.5","27.4","33.4","8.3","7.4","9.0","2.9","2.5","3.0","22.8","10.8","17.2","57.5","45.7","61.8","20.6","20.2","24.7","38.4","29.6","35.9","26.7","37.3","27.2","28.0","0.9","0.8","0.9","32.6","18.5","26.7","3","1.9","1.3","1.9","1.3","6.1","3.1","5.8","3.2","18.5","11.7","53.8","-5.1","-5.1","0.0","1270","77","60","4"]'
    );
    full = {
      peso: estimated.section2.weight.value,
      massaMuscularEsqueletica: estimated.section2.skeletalMuscle.value,
      gorduraCorporal: estimated.section2.bodyFat.value,
      rawCodeValue: '[]',
      bodbodyReport: estimated,
    };
  }

  const dashboard = {
    client: { id: 149, name: 'Paciente Teste', gender: 'FEMALE' as const, age: 32, height: 158 },
    evaluations: [
      {
        id: '1',
        clientId: 149,
        examDate: `${full.bodbodyReport.examDate}T12:00:00.000Z`,
        weight: full.peso,
        skeletalMuscle: full.massaMuscularEsqueletica,
        bodyFat: full.gorduraCorporal,
      },
    ],
    chartData: [
      { date: '2026-01-15', weight: 59.8, skeletalMuscle: 19.8, bodyFat: 21.5 },
      { date: '2026-03-10', weight: 60.5, skeletalMuscle: 20.1, bodyFat: 22.0 },
      { date: '2026-05-20', weight: 61.0, skeletalMuscle: 20.4, bodyFat: 22.4 },
      { date: full.bodbodyReport.examDate, weight: full.peso, skeletalMuscle: full.massaMuscularEsqueletica, bodyFat: full.gorduraCorporal },
    ],
    analysis: '',
    summary: {
      totalEvaluations: 4,
      latestWeight: full.peso,
      latestMuscle: full.massaMuscularEsqueletica,
      latestFat: full.gorduraCorporal,
    },
    bodbodyReport: full.bodbodyReport,
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

  const html = buildBodbodyReportHtml(dashboard, company);
  const outDir = path.join(root, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const htmlPath = path.join(outDir, 'relatorio-qr-scan.html');
  const pdfPath = path.join(outDir, 'relatorio-qr-scan.pdf');
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log('4. HTML gerado:', htmlPath);

  try {
    const chromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ];
    const browser = chromePaths.find((p) => fs.existsSync(p));
    if (!browser) throw new Error('Chrome/Edge não encontrado');

    execSync(
      `"${browser}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" --virtual-time-budget=10000 "file:///${htmlPath.replace(/\\/g, '/')}"`,
      { stdio: 'pipe', timeout: 30000 }
    );
    console.log('5. PDF gerado:', pdfPath);
  } catch (e) {
    console.log('5. PDF automático falhou — abra o HTML no navegador e imprima como PDF.');
    console.log('   ', e instanceof Error ? e.message : e);
  }

  console.log('\n--- Resumo do relatório ---');
  const r = full.bodbodyReport;
  console.log('Peso:', r.section2.weight.value, 'kg');
  console.log('Músculo esquelético:', r.section2.skeletalMuscle.value, 'kg');
  console.log('Gordura corporal:', r.section2.bodyFat.value, 'kg');
  console.log('IMC:', r.section3.bmi.value);
  console.log('Gordura %:', r.section3.bodyFatPct.value);
  console.log('Comprehensive:', r.section5.map((x) => `${x.label}=${x.status}`).join(', '));
  console.log('Score:', r.section6.comprehensiveScore);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
