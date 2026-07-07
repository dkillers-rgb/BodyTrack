/**
 * Gera um único relatório a partir dos dados visíveis na foto do equipamento Bodbody
 * (QR: api.bodbody.com/report/detail?id=171&code=180&date=2026-07-06).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function main() {
  const { mapCodeValueToBodbodyReport } = await import('../mobile/services/bodbodyReportMapper.ts');
  const { buildBodbodyReportHtml } = await import('../mobile/utils/bodbodyReportHtml.ts');

  // Dados lidos na tela do aparelho (foto 2026-07-06 11:32, Clínica Levèz)
  const heightCm = 160;
  const bodyFatKg = 32.4;
  const bmi = 37.1;
  const bodyFatPct = 42.5;
  const weight = Math.round((bodyFatKg / (bodyFatPct / 100)) * 10) / 10; // 76.2 kg (PBF 42,5%)
  const skeletalMuscle = 37.1; // soma segmentar visível
  const visceralFatIndex = 15; // visível na seção Weight Control da tela do aparelho

  const codeValue = JSON.stringify([
    '171', '180', 'F', '0', String(heightCm),
    '11:32 2026.07.06',
    '32.0', '27.4', '36.6',
    '8.7', '7.4', '9.8',
    '3.0', '2.5', '3.5',
    String(bodyFatKg), '10.8', '17.2',
    String(weight), '45.7', String(Math.round(weight * 1.15 * 10) / 10),
    String(skeletalMuscle), '20.2', '24.7',
    '38.4',
    String(bmi), String(bodyFatPct), '23.0', '37.3', '18.0', '28.0',
    '1.0', '0.8', '0.9',
    '32.6', '18.5', '26.7',
    String(visceralFatIndex),
    '2.1', '1.3', '2.3', '1.3', '6.5', '3.2', '6.5', '3.2',
    '19.7', '11.7',
    '53.8', '-19.3', '-19.3', '0.0',
    '1314', '63',
  ]);

  const bodbodyReport = mapCodeValueToBodbodyReport(codeValue);

  const examDate = bodbodyReport.examDate;
  const dashboard = {
    client: { id: 171, name: 'Paciente 180', gender: 'FEMALE' as const, age: 0, height: heightCm },
    evaluations: [
      {
        id: '1',
        clientId: 171,
        examDate: `${examDate}T11:32:00.000Z`,
        weight,
        skeletalMuscle,
        bodyFat: bodyFatKg,
        visceralFat: visceralFatIndex,
      },
    ],
    chartData: [{ date: examDate, weight, skeletalMuscle, bodyFat: bodyFatKg }],
    analysis: '',
    summary: {
      totalEvaluations: 1,
      latestWeight: weight,
      latestMuscle: skeletalMuscle,
      latestFat: bodyFatKg,
    },
    bodbodyReport,
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
  const baseName = 'relatorio-teste-visceral';
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

  const r = bodbodyReport;
  console.log('Relatório gerado:');
  console.log('  HTML:', htmlPath);
  if (fs.existsSync(pdfPath)) console.log('  PDF:', pdfPath);
  console.log('  Peso:', r.section2.weight.value, 'kg');
  console.log('  Músculo esquelético:', r.section2.skeletalMuscle.value, 'kg');
  console.log('  Gordura corporal:', r.section2.bodyFat.value, 'kg');
  console.log('  Gordura visceral (índice):', r.section2.visceralFat.value);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
