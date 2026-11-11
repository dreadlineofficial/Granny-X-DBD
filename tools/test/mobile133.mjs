// 1.3.3 mobile fixes on an emulated phone: layout editor (drag USE), emotes by tap, skill check hit by a tap on the
// left side, USE latching. node mobile133.mjs [outprefix]
import { chromium } from 'playwright';
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { join, extname } from 'node:path';
const ROOT = '/home/user/granny-x-dbd', PRE = process.argv[2] || '/tmp/claude-0/shots/m133';
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const srv = http.createServer(async (q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); try { const b = await readFile(join(ROOT, u)); r.writeHead(200, { 'content-type': MIME[extname(u)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const ctx = await br.newContext({ viewport: { width: 1280, height: 600 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
await ctx.addInitScript(() => { localStorage.setItem('gdbd_profile', JSON.stringify({ seen: { intro: true, help: true, tut: true, granny: true }, killer: { char: 'granny', perks: [] }, survivor: { char: 'mara', perks: [] } })); localStorage.setItem('gdbd_settings', JSON.stringify({ quality: 'low', name: 'Phone' })); window.__nbNoRTC = true; window.__nbMqtt = ['ws://127.0.0.1:1']; });
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(`http://localhost:${srv.address().port}/public/index.html`, { timeout: 240000 });
await pg.waitForFunction(() => window.__nb && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 300000 });
await pg.addStyleTag({ content: '#announce{display:none!important}' });
const click = q => pg.evaluate(q => document.querySelector(q).click(), q);
// --- layout editor: drag USE to the left-middle of the screen
await click('[data-act="settings"]'); await pg.waitForTimeout(600);
console.log('edit button visible', await pg.evaluate(() => { const b = document.getElementById('tc-edit'); return !!b && b.offsetParent !== null; }));
await click('#tc-edit'); await pg.waitForTimeout(600);
const ub = await pg.evaluate(() => { const r = [...document.querySelectorAll('#tc-editor .tc-b')].find(b => b.dataset.b === 'use').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
const cdp = await ctx.newCDPSession(pg);
const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
await touch('touchStart', ub.x, ub.y); for (let i = 1; i <= 10; i++) await touch('touchMove', ub.x + (640 - ub.x) * i / 10, ub.y + (300 - ub.y) * i / 10); await touch('touchEnd');
await pg.waitForTimeout(300); await pg.screenshot({ path: PRE + '-editor.png' });
await click('#tc-editor .te-done'); await pg.waitForTimeout(300);
console.log('saved layout', await pg.evaluate(() => { const t = JSON.parse(localStorage.getItem('gdbd_touchlayout')); return JSON.stringify(t.pos['survivor:use']) + ' keys ' + Object.keys(t.pos).length; }));
await click('#panel-close'); await pg.waitForTimeout(300);
// --- a match
await click('#mainnav button[data-act="play-survivor"]'); await pg.waitForTimeout(600);
await pg.selectOption('#bots-map', 'granny'); await pg.selectOption('#bots-killer', 'granny');
await click('#btn-bots-start');
await pg.waitForFunction(() => window.__nb.session && window.__nb.session.game && document.getElementById('loading').classList.contains('hidden') && !document.getElementById('touch').classList.contains('hidden'), null, { timeout: 300000 });
await pg.waitForTimeout(1500);
console.log('USE button in game at', await pg.evaluate(() => { const r = document.querySelector('#touch [data-b=use]').getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)].join(','); }));
// --- emotes: tap EMOTE, then tap Wave
const tapEl = async q => { const r = await pg.evaluate(q => { const e = document.querySelector(q).getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2 }; }, q); await pg.touchscreen.tap(r.x, r.y); };
await tapEl('#touch [data-b=emote]'); await pg.waitForTimeout(400);
console.log('emote bar open', await pg.evaluate(() => !document.getElementById('emote-bar').classList.contains('hidden')));
await pg.screenshot({ path: PRE + '-emotes.png' });
await tapEl('#emote-bar [data-emote="2"]'); await pg.waitForTimeout(800);
console.log('emote after tap', await pg.evaluate(() => { const s = window.__nb.session; return s.sim.S.players.find(p => p.id === s.myId).emote; }));
// --- skill check: put one up, tap the far left of the screen
await pg.evaluate(() => { const g = window.__nb.session.game; g.skill = { phase: 'active', t: 0.5, start: 0.4, end: 0.52, great: 0.435, needle: 0.45 }; g.skillCanvas.classList.remove('hidden'); g.updateSkill = () => {}; });
await pg.waitForTimeout(400); await pg.screenshot({ path: PRE + '-skill.png' });
await pg.touchscreen.tap(120, 300); await pg.waitForTimeout(200);
console.log('skill after left tap', await pg.evaluate(() => { const s = window.__nb.session.game.skill; return s && s.phase + ':' + s.res; }));
// --- USE latch: stand at a generator, hold USE, let go: the repair keeps going; the joystick stops it
await pg.evaluate(() => { const g0 = window.__nb.session.game; g0.skill = null; g0.skillCanvas.classList.add('hidden'); delete g0.updateSkill; g0.skillCooldown = 99; const s = window.__nb.session, S = s.sim.S, me = S.players.find(p => p.id === s.myId), g = s.sim.M.gens[0], K = S.players.find(p => p.role === 'killer');
  K.harmless = true; s.bots.update = () => {}; me.x = g.x + 1.05; me.z = g.z; me.yaw = Math.atan2(g.x - me.x, g.z - me.z); me.emote = 0; window.__nb.session.game.camYaw = me.yaw; });
await pg.waitForTimeout(500);
const useXY = await pg.evaluate(() => { const r = document.querySelector('#touch [data-b=use]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: useXY.x, y: useXY.y, id: 7 }] });
await pg.waitForTimeout(1500);
const act = () => pg.evaluate(() => { const s = window.__nb.session, me = s.sim.S.players.find(p => p.id === s.myId); return me.act ? me.act.k : null; });
console.log('holding USE ->', await act(), await pg.evaluate(() => { const s = window.__nb.session, g = s.game, me = s.sim.S.players.find(p => p.id === s.myId), G = s.sim.M.gens[0]; return JSON.stringify({ eHeld: g.eHeld, inE: s.sim.inputs.get(me.id).e, d: Math.hypot(me.x - G.x, me.z - G.z).toFixed(2), st: me.st, emote: me.emote, held: [...document.querySelectorAll('#touch .tc-b.down')].map(b => b.dataset.b), prompt: (document.getElementById('prompt') || {}).textContent }); }));
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await pg.waitForTimeout(2000);
console.log('released USE, 2s later ->', await act(), 'latched button:', await pg.evaluate(() => document.querySelector('#touch [data-b=use]').classList.contains('on')));
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 400, id: 8 }] });
for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: 400 - i * 10, id: 8 }] });
await pg.waitForTimeout(800); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
console.log('after joystick ->', await act());
console.log('errors', errs);
await br.close(); srv.close();
