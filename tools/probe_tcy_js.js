async function main() {
  const html = await (await fetch('http://119.23.70.228/tcy/index.html')).text();
  const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
  console.log('scripts:', scripts);

  for (const src of scripts.slice(0, 3)) {
    const url = src.startsWith('http') ? src : `http://119.23.70.228/tcy/${src.replace(/^\//, '')}`;
    const js = await (await fetch(url)).text();
    for (const term of ['codeValue', 'skeletal', 'bodyFat', 'weight', 'BMI', 'water', 'agua', 'gordura', 'muscle']) {
      let idx = 0;
      let n = 0;
      while (n < 3) {
        idx = js.indexOf(term, idx);
        if (idx < 0) break;
        console.log(`\n[${term}]`, js.slice(Math.max(0, idx - 60), idx + 100).replace(/\s+/g, ' '));
        idx += term.length;
        n++;
      }
    }
  }
}

main().catch(console.error);
