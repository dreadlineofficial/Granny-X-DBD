import { chromium } from 'playwright';
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { join, extname } from 'node:path';
const ROOT = '/home/user/granny-x-dbd';
const srv = http.createServer(async (q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; try { const b = await readFile(join(ROOT, u)); r.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css' }[extname(u)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const errs = [];
async function player(name) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(n => { localStorage.setItem('gdbd_profile', JSON.stringify({ seen: { intro: true, help: true, tut: true }, killer: { char: 'granny', perks: [] }, survivor: { char: 'mara', perks: [] } })); localStorage.setItem('gdbd_settings', JSON.stringify({ quality: 'potato', name: n, net: 'p2p' })); window.__nbNoRTC = true; window.__nbMqtt = ['ws://localhost:8883']; }, name);
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(name + ': ' + e.message));
  await pg.goto(`http://localhost:${srv.address().port}/index.html`);
  await pg.waitForFunction(() => window.__nb && document.querySelector('#mainnav button'), null, { timeout: 120000 });
  await pg.addStyleTag({ content: '#announce{display:none!important}' });
  return { ctx, pg };
}
const list = pg => pg.evaluate(() => [document.getElementById('lb-count').textContent, [...document.querySelectorAll('.lb-row')].map(r => r.innerText.replace(/\s+/g, ' '))]);
const A = await player('HostA'), B = await player('JoinB'), C = await player('WatchC');
await A.pg.evaluate(q => document.querySelector(q).click(), '[data-act="online"]'); await A.pg.waitForTimeout(500);
await A.pg.evaluate(q => document.querySelector(q).click(), '#btn-host');
await A.pg.waitForFunction(() => window.__nb.lobby && window.__nb.lobby.code, null, { timeout: 60000 });
console.log('A hosted', await A.pg.evaluate(() => [window.__nb.lobby.code, window.__nb.lobby.vis, document.getElementById('lobby-vis-tag').textContent]));
await B.pg.evaluate(q => document.querySelector(q).click(), '[data-act="online"]'); await C.pg.evaluate(q => document.querySelector(q).click(), '[data-act="online"]');
await B.pg.waitForSelector('[data-join]', { timeout: 20000, state: 'attached' });
console.log('B sees', await list(B.pg)); await B.pg.waitForTimeout(800); await B.pg.screenshot({ path: 'lbB.png' });
await B.pg.evaluate(q => document.querySelector(q).click(), '[data-join]');
await B.pg.waitForFunction(() => window.__nb.lobby && window.__nb.lobby.players.length === 2, null, { timeout: 60000 });
console.log('B in lobby', await B.pg.evaluate(() => [window.__nb.lobby.code, window.__nb.lobby.vis, document.getElementById('lobby-vis-tag').textContent, window.__nb.lobby.players.map(p => p.name).join()]));
await C.pg.waitForTimeout(1500); console.log('C sees', await list(C.pg));
await A.pg.evaluate(q => document.querySelector(q).click(), '#lobby-vis [data-v="private"]'); await C.pg.waitForTimeout(1500);
console.log('after private, C sees', await list(C.pg), 'B tag', await B.pg.evaluate(() => document.getElementById('lobby-vis-tag').textContent));
await A.pg.evaluate(q => document.querySelector(q).click(), '#lobby-vis [data-v="public"]'); await C.pg.waitForTimeout(1500);
console.log('public again, C sees', await list(C.pg));
// C reopens the Online screen (fresh subscription: retained listing)
await C.pg.evaluate(q => document.querySelector(q).click(), '#panel-close'); await C.pg.waitForTimeout(300); await C.pg.evaluate(q => document.querySelector(q).click(), '[data-act="online"]'); await C.pg.waitForTimeout(3000);
console.log('C fresh', await list(C.pg), await A.pg.evaluate(() => window.__nb.lobby.players.map(p => p.name).join()), await B.pg.evaluate(() => [!!window.__nb.lobby, window.__nb.lobby && window.__nb.lobby.net.label]));
await C.pg.screenshot({ path: 'lb.png' }); await A.pg.screenshot({ path: 'lbA.png' });
// host vanishes without a goodbye
await A.ctx.close(); await C.pg.waitForTimeout(4000);
console.log('host gone, C sees', await list(C.pg));
console.log('errors', errs); await br.close(); srv.close();
