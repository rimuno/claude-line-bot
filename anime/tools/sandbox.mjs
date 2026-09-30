// ライブラリ単体テスト用: node tools/sandbox.mjs test.js out.png [t=0]
// test.js には window.SANDBOX = (ctx, t) => { ... } を書く（index.html の全ライブラリがロード済みの状態で呼ばれる）
import { chromium } from 'playwright-core'; import fs from 'node:fs'; import path from 'node:path'; import { serve, CHROME } from './server.mjs';
const [testFile, out, tt = '0'] = process.argv.slice(2);
const { srv, url } = await serve(); const br = await chromium.launch({ executablePath: CHROME });
const page = await br.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = [];
page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text()); });
await page.goto(url); await page.evaluate(() => window.READY);
await page.addScriptTag({ content: fs.readFileSync(testFile, 'utf8') });
const d = await page.evaluate((t) => { const c = document.getElementById('c'); const ctx = c.getContext('2d'); ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle = '#101743'; ctx.fillRect(0, 0, 1920, 1080); window.SANDBOX(ctx, t); return c.toDataURL('image/png'); }, Number(tt));
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64')); console.log(out);
if (errs.length) console.log('PAGE ERRORS:\n' + errs.join('\n'));
await br.close(); srv.close();
