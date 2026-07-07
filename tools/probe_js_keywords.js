const jsUrl = process.argv[2] || 'http://119.23.70.228/assets/index-ZM73Dhzh.js';

async function main() {
  const text = await (await fetch(jsUrl)).text();
  for (const term of [
    'baseURL',
    'baseUrl',
    'VITE_',
    'axios',
    'fetch(',
    'report',
    'Report',
    'qrcode',
    'QR',
    'image',
    'print',
    'download',
    'measure',
    'bodyFat',
    'skeletal',
    '119.23',
    'bodbody',
    '波的',
  ]) {
    let idx = 0;
    let n = 0;
    while (n < 2) {
      idx = text.indexOf(term, idx);
      if (idx < 0) break;
      console.log('\n[' + term + ']', text.slice(Math.max(0, idx - 50), idx + 120).replace(/\s+/g, ' '));
      idx += term.length;
      n++;
    }
  }
}

main().catch(console.error);
