// screenshot the loading screen (and optionally the menu): node lsshot.mjs out.png [quality] [menu]
import { chromium } from 'playwright';
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { join, extname } from 'node:path';
const ROOT = '/home/user/granny-x-dbd';
const [out = 'ls.png', Q = 'medium', MENU] = process.argv.slice(2);
const srv = http.createServer(async (q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; try { const b = await readFile(join(ROOT, u)); r.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css' }[extname(u)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript(q => { localStorage.setItem('gdbd_profile', JSON.stringify({ seen: { intro: true, help: true, tut: true }, killer: { char: 'granny', perks: [] }, survivor: { char: 'mara', perks: [] } })); localStorage.setItem('gdbd_settings', JSON.stringify({ quality: q, name: 'Tester' })); window.__nbNoRTC = true; window.__nbMqtt = ['ws://127.0.0.1:1']; }, Q);
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(`http://localhost:${srv.address().port}/index.html`);
await pg.waitForFunction(() => window.__nb && document.querySelector('#mainnav button'), null, { timeout: 120000 });
await pg.waitForTimeout(14000);
if (MENU) { await pg.screenshot({ path: MENU, timeout: 120000 }); }
// show the loading screen on its own, for a few seconds
await pg.evaluate(() => { document.getElementById('menu').classList.add('hidden'); window.__showLoading && window.__showLoading(true, 'Entering the fog…'); });
await pg.waitForTimeout(8000); for (let i = 0; i < 4; i++) { await pg.evaluate(i => window.__lsSeek(i * 5.6 + 2.6), i); await pg.waitForTimeout(400); await pg.screenshot({ path: out.replace('.png', '_' + i + '.png'), timeout: 120000 }); }
console.log('errors', errs);
await br.close(); srv.close();
