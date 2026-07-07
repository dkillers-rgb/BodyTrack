/**
 * Decodifica QR da imagem e tenta obter gordura visceral.
 * Uso: npx tsx tools/test_visceral_qr_once.ts <imagem>
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const mobileRoot = path.join(root, 'mobile');

async function loadModule<T>(name: string): Promise<T> {
  try {
    return (await import(name)) as T;
  } catch {
    const { createRequire } = await import('module');
    const req = createRequire(path.join(mobileRoot, 'package.json'));
    return req(name) as T;
  }
}

async function decodeQr(imagePath: string): Promise<string | null> {
  const sharpMod = await loadModule<{ default: typeof import('sharp') }>('sharp');
  const jsqrMod = await loadModule<{ default: typeof import('jsqr') }>('jsqr');
  const sharp = sharpMod.default;
  const jsqr = jsqrMod.default;

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
    { left: 0.3, top: 0.32, w: 0.4, h: 0.35 },
  ];

  for (const c of crops) {
    const scaled = await sharp(imagePath)
      .extract({
        left: Math.floor(info.width * c.left),
        top: Math.floor(info.height * c.top),
        width: Math.floor(info.width * c.w),
        height: Math.floor(info.height * c.h),
      })
      .resize({ width: 1000, withoutEnlargement: false })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    text = await tryDecode(scaled.data, scaled.info.width, scaled.info.height);
    if (text) return text;
  }
  return null;
}

async function fetchReport(qrUrl: string) {
  const { mapCodeValueToBodbodyReport } = await import('../mobile/services/bodbodyReportMapper.ts');
  const { fetchTcyReportDirect } = await import('../mobile/services/tcyReportMapper.ts');
  const { extractReportKey } = await import('../mobile/services/reportKeyUtils.ts');
  const { resolveQrReport } = await import('../mobile/services/reportUrlResolver.ts');

  const url = new URL(qrUrl.startsWith('http') ? qrUrl : `http://${qrUrl}`);
  const key = extractReportKey(qrUrl);

  if (key) {
    const full = await fetchTcyReportDirect(key);
    const visceral =
      full.bodbodyReport.section2.visceralFat?.value ?? full.gorduraVisceral;
    return { source: 'tcy', visceral, full };
  }

  const id = url.searchParams.get('id');
  const code = url.searchParams.get('code');
  const date = url.searchParams.get('date');

  const candidateUrls = [
    qrUrl,
    `http://bodbody.com.cn/report/detail?id=${id}&code=${code}&date=${date}`,
    `http://bodbody.com.cn/api/report/detail?id=${id}&code=${code}&date=${date}`,
    `http://www.bodbody.com.cn/report/detail?id=${id}&code=${code}&date=${date}`,
  ];

  for (const candidate of candidateUrls) {
    try {
      const response = await fetch(candidate, {
        headers: {
          Accept: 'application/json,text/html,*/*',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(15000),
      });
      const text = await response.text();
      if (!response.ok) continue;

      try {
        const json = JSON.parse(text) as Record<string, unknown>;
        const codeValue =
          (json.data as Record<string, unknown> | undefined)?.codeValue ??
          json.codeValue ??
          json.data;
        if (codeValue) {
          const report = mapCodeValueToBodbodyReport(codeValue);
          return {
            source: candidate,
            visceral: report.section2.visceralFat.value,
            report,
          };
        }
      } catch {
        const codeValueMatch = text.match(/codeValue["'\s:]+(\[[\s\S]*?\])/);
        if (codeValueMatch) {
          const report = mapCodeValueToBodbodyReport(codeValueMatch[1]);
          return {
            source: candidate,
            visceral: report.section2.visceralFat.value,
            report,
          };
        }
      }
    } catch {
      /* try next */
    }
  }

  try {
    const resolved = await resolveQrReport(qrUrl);
    if (resolved.muscleFat?.visceralFat != null) {
      return { source: 'resolveQrReport', visceral: resolved.muscleFat.visceralFat, resolved };
    }
  } catch {
    /* ignore */
  }

  return null;
}

async function main() {
  const defaultImage = path.join(
    root,
    'assets/c__Users_Uiry_Monteiro_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_WhatsApp_Image_2026-07-06_at_11.37.48-9032b876-78b3-48a6-a726-bcd67b4133ee.png'
  );
  const imagePath = process.argv[2] || defaultImage;

  if (!fs.existsSync(imagePath)) {
    console.error('Imagem não encontrada:', imagePath);
    process.exit(1);
  }

  console.log('Decodificando QR...');
  const qrUrl = await decodeQr(imagePath);
  if (!qrUrl) {
    console.error('Não foi possível ler o QR Code da imagem.');
    process.exit(1);
  }
  console.log('QR URL:', qrUrl);

  console.log('Buscando relatório...');
  const result = await fetchReport(qrUrl);
  if (!result) {
    console.error('Não foi possível obter o relatório online a partir do QR.');
    process.exit(2);
  }

  console.log('Fonte:', result.source);
  console.log('Gordura visceral (índice):', result.visceral);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
