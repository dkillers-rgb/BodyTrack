const testUrl = process.argv[2];
if (!testUrl) {
  console.error('Usage: node tools/probe_qr_server.js <qr-url>');
  process.exit(1);
}

async function main() {
  const r = await fetch(testUrl, { redirect: 'follow' });
  const text = await r.text();
  console.log('finalUrl', r.url);
  console.log('status', r.status);
  console.log('content-type', r.headers.get('content-type'));
  console.log('length', text.length);
  console.log('head', text.slice(0, 800));
  console.log('--- imgs ---');
  for (const m of text.matchAll(/<img[^>]+>/gi)) console.log(m[0].slice(0, 200));
  console.log('--- data:image ---');
  const data = text.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]{100,}/i);
  if (data) console.log(data[0].slice(0, 120) + '...');
  console.log('--- quoted paths ---');
  for (const m of text.matchAll(/["'](\/[^"']{3,120})["']/g)) {
    if (/report|image|img|file|download|print|body|analyse|result|show/i.test(m[1])) {
      console.log(m[1]);
    }
  }
  console.log('--- http urls in page ---');
  for (const m of text.matchAll(/https?:\/\/[^\s"'<>]+/g)) {
    console.log(m[0].slice(0, 160));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
