// 使い方:
//   node tools/preview.mjs 12.5 14 20            → out/preview/t_12.50.png など（1920x1080, 字幕付き）
//   node tools/preview.mjs --sheet s2_meet [n]    → out/preview/sheet_s2_meet.png（そのシーンを n 枚(既定12)均等サンプル）
//   node tools/preview.mjs --sheet 30:45 [n]      → 時間範囲指定
//   --nosubs で字幕なし
import { chromium } from 'playwright-core'; import fs from 'node:fs'; import { serve, CHROME, ROOT } from './server.mjs';
const args = process.argv.slice(2); const noSubs = args.includes('--nosubs'); const a = args.filter((x) => x !== '--nosubs');
const outDir = `${ROOT}/out/preview`; fs.mkdirSync(outDir, { recursive: true });
const { srv, url } = await serve(); const br = await chromium.launch({ executablePath: CHROME, args: ['--disable-gpu-vsync'] });
const page = await br.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(url); await page.evaluate(() => window.READY);
const save = (name, d) => { const f = `${outDir}/${name}.png`; fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64')); console.log(f); };
if (a[0] === '--sheet') {
  const tl = JSON.parse(fs.readFileSync(`${ROOT}/timeline.json`)); let s0, s1;
  if (a[1].includes(':')) [s0, s1] = a[1].split(':').map(Number); else { const s = tl.scenes.find((x) => x.id === a[1]); s0 = s.start; s1 = s.end; }
  const n = Number(a[2] || 12); const times = Array.from({ length: n }, (_, k) => +(s0 + ((s1 - s0) * (k + 0.5)) / n).toFixed(2));
  save(`sheet_${a[1].replace(':', '-')}`, await page.evaluate(([ts]) => window.contactSheet(ts), [times]));
} else {
  for (const t of a.map(Number)) save(`t_${t.toFixed(2)}`, await page.evaluate(([t, ns]) => { window.renderFrame(t, { noSubs: ns }); return document.getElementById('c').toDataURL('image/png'); }, [t, noSubs]));
}
if (errs.length) console.log('PAGE ERRORS:\n' + [...new Set(errs)].join('\n'));
await br.close(); srv.close();
