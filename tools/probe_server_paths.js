const base = 'http://119.23.70.228';
const paths = [
  '/h5',
  '/h5/',
  '/report',
  '/reports',
  '/share',
  '/view',
  '/show',
  '/print',
  '/download',
  '/app',
  '/mobile',
  '/web',
  '/index.html',
  '/bodbody',
  '/body',
  '/analyse',
  '/analysis',
  '/result',
  '/data',
  '/cloud',
  '/api',
  '/swagger',
  '/doc.html',
];

async function main() {
  for (const p of paths) {
    try {
      const r = await fetch(base + p, { redirect: 'follow' });
      const text = await r.text();
      const title = (text.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
      const hasImg = /<img/i.test(text);
      const isSpa = text.includes('id="app"');
      console.log(p, r.status, 'len', text.length, 'title', title.slice(0, 40), 'img', hasImg, 'spa', isSpa);
      if (hasImg) {
        for (const m of text.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) console.log('  img', m[1].slice(0, 120));
      }
    } catch (e) {
      console.log(p, 'ERR', e.message);
    }
  }
}

main();
