const base = 'http://119.23.70.228:8080';
const paths = [
  '/',
  '/api',
  '/report',
  '/report/image',
  '/report/show',
  '/health',
  '/swagger-ui.html',
  '/doc.html',
  '/actuator',
  '/file',
  '/download',
  '/common',
  '/prod-api',
  '/h5',
];

async function main() {
  for (const p of paths) {
    try {
      const r = await fetch(base + p, { redirect: 'follow', signal: AbortSignal.timeout(5000) });
      const buf = new Uint8Array(await r.arrayBuffer());
      const ct = r.headers.get('content-type') || '';
      const text = new TextDecoder().decode(buf).slice(0, 300);
      console.log(p, r.status, ct, text.replace(/\s+/g, ' ').slice(0, 200));
    } catch (e) {
      console.log(p, 'ERR', e.message);
    }
  }
}

main();
