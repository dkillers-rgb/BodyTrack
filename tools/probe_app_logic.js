fetch('http://119.23.70.228/assets/index-ZM73Dhzh.js')
  .then((r) => r.text())
  .then((t) => {
    for (const k of [
      'window.location',
      'location.href',
      'location.hash',
      'searchParams',
      'query',
      'token',
      'report',
      'base64',
      'atob',
      'decode',
      'msg:',
      'gX',
      'bX',
      'yX',
    ]) {
      let idx = 0;
      let n = 0;
      while (n < 3) {
        idx = t.indexOf(k, idx);
        if (idx < 0) break;
        console.log('\n[' + k + ']', t.slice(Math.max(0, idx - 80), idx + 150).replace(/\s+/g, ' '));
        idx += k.length;
        n++;
      }
    }
  })
  .catch(console.error);
