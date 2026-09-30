// 全フレームを並列レンダリングして out/frames/%05d.jpg に書き出す。 node tools/render.mjs [workers] [from] [to]
import { chromium } from 'playwright-core'; import fs from 'node:fs'; import { serve, CHROME, ROOT } from './server.mjs';
const tl = JSON.parse(fs.readFileSync(`${ROOT}/timeline.json`)); const fps = tl.fps, N = Math.round(tl.duration * fps);
const W = Number(process.argv[2] || 4), from = Number(process.argv[3] || 0), to = Number(process.argv[4] || N);
const dir = `${ROOT}/out/frames`; fs.mkdirSync(dir, { recursive: true });
const { srv, url } = await serve(); const br = await chromium.launch({ executablePath: CHROME });
let next = from, done = 0; const t0 = Date.now(); const errs = new Set();
await Promise.all(Array.from({ length: W }, async () => {
  const page = await br.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => errs.add(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.add(m.text()); });
  await page.goto(url); await page.evaluate(() => window.READY);
  while (next < to) { const f = next++; const d = await page.evaluate((t) => window.frameJPEG(t), f / fps);
    fs.writeFileSync(`${dir}/${String(f).padStart(5, '0')}.jpg`, Buffer.from(d.split(',')[1], 'base64'));
    if (++done % 100 === 0) console.log(`${done}/${to - from} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
}));
if (errs.size) console.log('PAGE ERRORS:\n' + [...errs].join('\n'));
await br.close(); srv.close(); console.log('done', ((Date.now() - t0) / 1000).toFixed(1) + 's');
