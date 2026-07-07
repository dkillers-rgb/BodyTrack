const host = '119.23.70.228';
const ports = [80, 8080, 8081, 8888, 9000, 3000, 81, 82, 443, 8000, 8880, 9090];

async function probe(port) {
  const url = `http://${host}:${port}/`;
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(4000) });
    const text = await r.text();
    const title = (text.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
    console.log(port, r.status, title.slice(0, 50), 'len', text.length);
    if (/report|bodbody|report|analyse|体脂|报告/i.test(text)) console.log('  REPORT KEYWORDS FOUND');
  } catch (e) {
    console.log(port, 'FAIL', e.cause?.code || e.message);
  }
}

async function main() {
  for (const port of ports) await probe(port);
}

main();
