import { chromium } from 'playwright';
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { join, extname } from 'node:path';
const ROOT = '/home/user/granny-x-dbd';
const srv = http.createServer(async (q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/public/index.html'; try { const b = await readFile(join(ROOT, u)); r.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css' }[extname(u)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const errs = [];
async function player(name) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(n => { localStorage.setItem('gdbd_profile', JSON.stringify({ seen: { intro: true, help: true, tut: true }, killer: { char: 'granny', perks: [] }, survivor: { char: 'mara', perks: [] } })); localStorage.setItem('gdbd_settings', JSON.stringify({ quality: 'potato', name: n, net: 'p2p' })); window.__nbNoRTC = true; window.__nbMqtt = ['ws://localhost:8883']; }, name);
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(name + ': ' + e.message));
  await pg.goto(`http://localhost:${srv.address().port}/public/index.html`);
  await pg.waitForFunction(() => window.__nb && document.querySelector('#mainnav button'), null, { timeout: 120000 });
  await pg.waitForFunction(() => document.getElementById('loading').classList.contains('hidden'), null, { timeout: 300000 }); await pg.waitForTimeout(3000);
  await pg.addStyleTag({ content: '#announce{display:none!important}' });
  return { ctx, pg };
}
const list = pg => pg.evaluate(() => [document.getElementById('lb-count').textContent, [...document.querySelectorAll('.lb-row')].map(r => r.innerText.replace(/\s+/g, ' '))]);
const A = await player('HostA'), B = await player('JoinB');
await A.pg.evaluate(q => document.querySelector(q).click(), '[data-act="online"]'); await A.pg.waitForTimeout(500);
await A.pg.evaluate(q => document.querySelector(q).click(), '#btn-host');
await A.pg.waitForFunction(() => window.__nb.lobby && window.__nb.lobby.code, null, { timeout: 60000 });
await B.pg.evaluate(q => document.querySelector(q).click(), '[data-act="online"]');
await B.pg.waitForSelector('[data-join]', { timeout: 30000, state: 'attached' });
await B.pg.evaluate(q => document.querySelector(q).click(), '[data-join]');
await B.pg.waitForFunction(() => window.__nb.lobby && window.__nb.lobby.players.length === 2, null, { timeout: 60000 });
console.log('B joined');
await B.pg.evaluate(() => { window.__toasts = []; new MutationObserver(() => window.__toasts.push(Math.round(performance.now()) + ' ' + document.getElementById('toast').textContent)).observe(document.getElementById('toast'), { childList: true, characterData: true, subtree: true }); });
console.log('before start A lobby', await A.pg.evaluate(() => [window.__nb.lobby.players.map(p => p.name + ':' + p.id).join(), window.__nb.lobby.map]), 'B lobby', await B.pg.evaluate(() => window.__nb.lobby && [window.__nb.lobby.players.map(p => p.name).join(), window.__nb.lobby.myId, document.getElementById('p-lobby').classList.contains('hidden')]));
await A.pg.evaluate(() => { const n = window.__nb.lobby.net, b = n.broadcast.bind(n); window.__sent = {}; n.broadcast = (m, ...r) => { window.__sent[m.t] = (window.__sent[m.t] || 0) + 1; return b(m, ...r); }; });
await A.pg.evaluate(q => document.querySelector(q).click(), '#btn-lobby-start');
const inGame = pg => pg.waitForFunction(() => window.__nb.session && window.__nb.session.game && document.getElementById('loading').classList.contains('hidden') && !document.documentElement.classList.contains('ls-up'), null, { timeout: 400000 });
const st = pg => pg.evaluate(() => { const s = window.__nb.session; return { sess: !!s, kind: s && s.constructor.name, game: !!(s && s.game), S: !!(s && s.S), warming: s && s.warming, loading: !document.getElementById('loading').classList.contains('hidden'), msg: (document.getElementById('ls-msg')||{}).textContent, lsup: document.documentElement.classList.contains('ls-up'), inGame: window.__nb.lobby && window.__nb.lobby.inGame, vote: !!document.querySelector('.mapsel:not(.hidden), #mapselect:not(.hidden)'), panel: [...document.querySelectorAll('.panel-body > div:not(.hidden), #panel > div:not(.hidden)')].map(e => e.id).join() }; });
B.pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('B console', m.text().slice(0, 300)); }); A.pg.on('console', async m => { if (m.type() === 'error') { console.log('A console', m.text().slice(0, 300)); for (const a of m.args()) { try { console.log('  ', await a.evaluate(e => e && e.stack ? e.stack.slice(0, 900) : String(e))); } catch {} } } });
for (let i = 0; i < 4; i++) { console.log('A sent', await A.pg.evaluate(() => JSON.stringify(window.__sent)), 'A sim t', await A.pg.evaluate(() => window.__nb.session && window.__nb.session.sim && window.__nb.session.sim.S.t)); console.log('B toasts', await B.pg.evaluate(() => window.__toasts)); console.log('errs', errs); await A.pg.waitForTimeout(15000); const a = await st(A.pg), b = await st(B.pg); console.log(i, 'A', JSON.stringify(a), 'B', JSON.stringify(b)); if (a.game && b.game && !a.loading && !b.loading) break; }
console.log('both in the match');
await B.pg.waitForTimeout(4000);
console.log('client state', await B.pg.evaluate(() => { const s = window.__nb.session; return { t: s.S && s.S.t, warming: !!s.warming, players: s.S && s.S.players.length, hud: !document.getElementById('hud').classList.contains('hidden') }; }));
await B.pg.screenshot({ path: '/tmp/claude-0/shots/online-B.png' });
console.log('errors', errs); await br.close(); srv.close();
