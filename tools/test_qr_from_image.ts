/**
 * Decodifica QR da imagem do usuário e testa o fluxo completo.
 * Uso: npx tsx tools/decode_qr_image.ts <caminho-imagem>
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

async function decodeQr(imagePath: string): Promise<string | null> {
  try {
    const Jimp = require('jimp');
    const QrCode = require('qrcode-reader');
    const image = await Jimp.read(imagePath);
    const qr = new QrCode();
    return new Promise((resolve) => {
      qr.callback = (_err: Error | null, value: { result?: string }) => {
        resolve(value?.result ?? null);
      };
      qr.decode(image.bitmap);
    });
  } catch {
    return null;
  }
}

async function fetchTcy(key: string) {
  const res = await fetch(`http://119.23.70.228:8080/tcy/qrcode?key=${encodeURIComponent(key)}`, {
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json();
  const arr = JSON.parse(json.data.codeValue) as string[];
  return {
    peso: parseFloat(arr[18]),
    massaMuscularEsqueletica: parseFloat(arr[15]),
    gorduraCorporal: parseFloat(arr[17]),
  };
}

async function fetchBodytrackApi(key: string) {
  const res = await fetch(`https://api.bodytrack.com/report?key=${encodeURIComponent(key)}`, {
    signal: AbortSignal.timeout(10000),
  });
  return { status: res.status, body: await res.text() };
}

async function main() {
  const imagePath =
    process.argv[2] ||
    path.resolve(
      'assets/c__Users_Uiry_Monteiro_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_WhatsApp_Image_2026-07-01_at_14.15.54-be864a99-4cd1-43f3-b79d-e89da2d3bc7e.png'
    );

  if (!fs.existsSync(imagePath)) {
    console.error('Imagem não encontrada:', imagePath);
    process.exit(1);
  }

  console.log('Decodificando QR de:', imagePath);
  let qrText = await decodeQr(imagePath);

  const fallbackKey = '73062322306346338573981881773030';
  const fallbackUrl = `http://119.23.70.228/tcy/index.html?lang=en&key=${fallbackKey}`;

  if (!qrText) {
    console.log('Decoder local indisponível — usando key conhecida da foto:', fallbackKey);
    qrText = fallbackUrl;
  } else {
    console.log('QR lido:', qrText);
  }

  const key = new URL(qrText.startsWith('http') ? qrText : `http://${qrText}`).searchParams.get('key');
  if (!key) {
    console.error('Sem key na URL');
    process.exit(1);
  }

  console.log('\n--- Teste api.bodytrack.com ---');
  try {
    const api = await fetchBodytrackApi(key);
    console.log('Status:', api.status);
    console.log('Resposta:', api.body.slice(0, 300));
  } catch (e) {
    console.log('FALHOU:', e instanceof Error ? e.message : e);
  }

  console.log('\n--- Teste TCY direto (8080) ---');
  try {
    const data = await fetchTcy(key);
    console.log('OK:', data);
  } catch (e) {
    console.log('FALHOU:', e instanceof Error ? e.message : e);
    process.exit(1);
  }
}

main();
