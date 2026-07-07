const base = 'http://119.23.70.228';
const testId = process.argv[2] || '1';

const templates = [
  '/api/report/image?id={id}',
  '/api/report/getImage?id={id}',
  '/api/report/img?id={id}',
  '/api/report/download?id={id}',
  '/api/report/print?id={id}',
  '/api/report/show?id={id}',
  '/api/report/detail?id={id}',
  '/api/report?id={id}',
  '/report/image/{id}',
  '/report/image?id={id}',
  '/report/img/{id}',
  '/report/getImage?id={id}',
  '/report/show/{id}',
  '/report/show?id={id}',
  '/report/download/{id}',
  '/report/{id}.jpg',
  '/report/{id}.png',
  '/report/{id}/image',
  '/report/print/{id}',
  '/file/report/{id}',
  '/common/download/report/{id}',
  '/h5/report/image?id={id}',
  '/prod-api/report/image?id={id}',
  '/bodbody/report/image?id={id}',
];

function isImage(ct, bytes) {
  const type = (ct || '').toLowerCase();
  if (type.startsWith('image/') || type.includes('pdf')) return true;
  return bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

async function main() {
  for (const tpl of templates) {
    const path = tpl.replace(/\{id\}/g, testId);
    const url = base + path;
    try {
      const r = await fetch(url, { redirect: 'follow' });
      const buf = new Uint8Array(await r.arrayBuffer());
      const ct = r.headers.get('content-type') || '';
      if (r.ok && isImage(ct, buf)) {
        console.log('HIT', url, ct, buf.length);
      } else if (r.ok && ct.includes('json')) {
        const text = new TextDecoder().decode(buf).slice(0, 200);
        if (/img|image|base64|report/i.test(text)) console.log('JSON', url, text);
      }
    } catch (e) {
      /* skip */
    }
  }
}

main();
