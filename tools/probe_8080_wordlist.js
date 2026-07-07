const base = 'http://119.23.70.228:8080';
const words = [
  'report', 'reports', 'reportImage', 'reportImg', 'getReport', 'showReport', 'printReport',
  'body', 'bodyData', 'bodyReport', 'measure', 'measureData', 'test', 'testData', 'result',
  'image', 'img', 'file', 'download', 'print', 'share', 'view', 'open', 'public', 'common',
  'h5', 'wx', 'wechat', 'app', 'api', 'data', 'cloud', 'bodbody', 'bodyanalyse', 'analyse',
  'composition', 'inbody', 'user', 'member', 'customer', 'client', 'record', 'history',
];

async function tryPath(path) {
  try {
    const r = await fetch(base + path, { signal: AbortSignal.timeout(4000) });
    if (r.status === 404) return null;
    const ct = r.headers.get('content-type') || '';
    const buf = new Uint8Array(await r.arrayBuffer());
    return { path, status: r.status, ct, len: buf.length, head: new TextDecoder().decode(buf).slice(0, 120) };
  } catch {
    return null;
  }
}

async function main() {
  for (const w of words) {
    for (const p of [`/${w}`, `/api/${w}`, `/open/${w}`, `/public/${w}`, `/app/${w}`, `/h5/${w}`, `/common/${w}`]) {
      const hit = await tryPath(p);
      if (hit) console.log(JSON.stringify(hit));
    }
  }
}

main();
