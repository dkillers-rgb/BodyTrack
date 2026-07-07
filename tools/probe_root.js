fetch('http://119.23.70.228/')
  .then((r) => r.text())
  .then((t) => {
    console.log('len', t.length);
    const scripts = [...t.matchAll(/src=["']([^"']+)["']/g)].map((m) => m[1]);
    console.log('scripts', scripts);
  })
  .catch(console.error);
