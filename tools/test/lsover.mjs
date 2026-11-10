// screenshot the loading screen while a match loads: the menu must not show through
import { chromium } from 'playwright';
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { join, extname } from 'node:path';
const ROOT = '/home/user/granny-x-dbd';
const srv = http.createServer(async (q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; try { const b = await readFile(join(ROOT, u)); r.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css' }[extname(u)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript(() => { localStorage.setItem('gdbd_profile', JSON.stringify({ seen: { intro: true, help: true, tut: true, granny: true }, killer: { char: 'granny', perks: [] }, survivor: { char: 'mara', perks: [] } })); localStorage.setItem('gdbd_settings', JSON.stringify({ quality: 'low', name: 'Tester' })); window.__nbNoRTC = true; window.__nbMqtt = ['ws://127.0.0.1:1']; });
const pg = await ctx.newPage();
await pg.goto(`http://localhost:${srv.address().port}/index.html`);
await pg.waitForTimeout(6000); await pg.screenshot({ path: '/tmp/claude-0/shots/ov-boot.png' });
await pg.waitForFunction(() => document.getElementById('loading').classList.contains('hidden'), null, { timeout: 300000 });
await pg.waitForTimeout(1000); await pg.screenshot({ path: '/tmp/claude-0/shots/ov-menu.png' });
await pg.click('#mainnav button[data-act="play-survivor"]'); await pg.waitForTimeout(500);
await pg.click('#btn-bots-start');
await pg.waitForTimeout(2500); await pg.screenshot({ path: '/tmp/claude-0/shots/ov-load.png' });
await pg.waitForFunction(() => window.__nb.session && window.__nb.session.game && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 400000 });
await pg.waitForTimeout(1500); await pg.screenshot({ path: '/tmp/claude-0/shots/ov-game.png' });
console.log('ok'); await br.close(); srv.close();
