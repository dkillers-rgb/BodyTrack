const jsUrl = process.argv[2] || 'http://119.23.70.228/assets/index-ZM73Dhzh.js';

async function main() {
  const text = await (await fetch(jsUrl)).text();
  const routes = [...text.matchAll(/path:\s*["']([^"']+)["']/g)].map((m) => m[1]);
  console.log('vue routes:', [...new Set(routes)].join('\n'));

  const urls = [...text.matchAll(/https?:\/\/[a-zA-Z0-9._:/\-?&=%]+/g)].map((m) => m[0]);
  console.log('\nhardcoded urls:', [...new Set(urls)].slice(0, 30).join('\n'));

  for (const term of ['getReport', 'reportImage', 'reportImg', 'showReport', 'reportDetail', 'measure', 'bodyData', 'printReport', 'downloadReport', 'qrcode', 'QRCode']) {
    let idx = 0;
    let count = 0;
    while (count < 3) {
      idx = text.indexOf(term, idx);
      if (idx < 0) break;
      console.log('\n' + term + ':', text.slice(Math.max(0, idx - 60), idx + term.length + 80).replace(/\s+/g, ' '));
      idx += term.length;
      count++;
    }
  }
}

main().catch(console.error);
