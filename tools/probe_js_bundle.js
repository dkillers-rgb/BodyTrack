const jsUrl = process.argv[2] || 'http://119.23.70.228/assets/index-ZM73Dhzh.js';

async function main() {
  const text = await (await fetch(jsUrl)).text();
  console.log('js length', text.length);

  const patterns = [
    /\/api\/[a-zA-Z0-9_\-/]+/g,
    /\/report[a-zA-Z0-9_\-/]*/g,
    /reportId[a-zA-Z0-9_\-]*/g,
    /getReport[a-zA-Z0-9_]*/g,
    /imgUrl|imageUrl|reportUrl|fileUrl|picUrl/g,
    /data:image\/[a-z]+;base64/g,
  ];

  for (const re of patterns) {
    const hits = [...new Set([...text.matchAll(re)].map((m) => m[0]))].slice(0, 40);
    if (hits.length) {
      console.log('\n==', re, '==');
      console.log(hits.join('\n'));
    }
  }

  // literal path strings containing report/image
  const paths = [...text.matchAll(/["'](\/[^"']{4,80})["']/g)]
    .map((m) => m[1])
    .filter((p) => /report|image|img|file|download|print|body|result|show|detail/i.test(p));
  console.log('\n== path literals ==');
  console.log([...new Set(paths)].slice(0, 50).join('\n'));

  const segments = [...text.matchAll(/["']([a-zA-Z][a-zA-Z0-9_]{1,30}\/[a-zA-Z0-9_]{1,30}(?:\/[a-zA-Z0-9_]{1,30})?)["']/g)]
    .map((m) => m[1])
    .filter((p) => /report|body|test|result|print|image|file|data|user|measure|analyse|analyze|detail|show|report/i.test(p));
  console.log('\n== segment paths ==');
  console.log([...new Set(segments)].slice(0, 80).join('\n'));
}

main().catch(console.error);
