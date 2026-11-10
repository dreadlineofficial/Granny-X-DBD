// Play the built game (index.html, web build) in headless Chromium: bot match as killer/survivor,
// capture frames, report errors.   node play.mjs <role> <killer> <map> <outprefix> [seconds]
import { chromium } from 'playwright';
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { join, extname } from 'node:path';
const ROOT = '/home/user/granny-x-dbd';
const [role = 'killer', killer = 'grandpa', map = 'granny1', pre = 'p', SEC = '25'] = process.argv.slice(2);
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const srv = http.createServer(async (q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; try { const b = await readFile(join(ROOT, u)); r.writeHead(200, { 'content-type': MIME[extname(u)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript(([role, killer]) => {
  const prof = { seen: { intro: true, help: true, tut: true }, killer: { char: killer, perks: [] }, survivor: { char: 'mara', perks: [] } };
  try {
    const old = JSON.parse(localStorage.getItem('gdbd_profile') || 'null');
    localStorage.setItem('gdbd_profile', JSON.stringify(Object.assign(old || {}, prof, { killer: prof.killer })));
    const st = JSON.parse(localStorage.getItem('gdbd_settings') || '{}'); st.quality = 'low'; st.name = 'Tester'; localStorage.setItem('gdbd_settings', JSON.stringify(st));
  } catch (e) {}
  window.__nbNoRTC = true; window.__nbMqtt = ['ws://127.0.0.1:1']; window.__holdRMB = !!(new URLSearchParams(location.search).get('hold'));
}, [role, killer]);
const pg = await ctx.newPage();
const errs = []; pg.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/WebSocket|ws:\/\/|ERR_/.test(m.text())) errs.push(m.text()); });
await pg.goto(`http://localhost:${srv.address().port}/index.html${process.env.HOLD ? '?hold=1' : ''}`);
await pg.waitForFunction(() => window.__nb && document.querySelector('#mainnav button'), null, { timeout: 120000 });
await pg.evaluate(([role, killer]) => { const P = window.__nb.profile; P.killer.char = killer; }, [role, killer]);
await pg.click(`#mainnav button[data-act="play-${role}"]`); await pg.waitForTimeout(600);
await pg.selectOption('#bots-map', map);
if (role === 'survivor') await pg.selectOption('#bots-killer', killer);
await pg.click('#btn-bots-start');
await pg.waitForFunction(() => window.__nb.session && window.__nb.session.game && window.__nb.session.sim && window.__nb.session.sim.S.t > 0.5, null, { timeout: 240000 });
const info = await pg.evaluate(() => { const s = window.__nb.session; return { map: s.map, players: s.sim.S.players.map(p => p.role + ':' + p.char + (p.bot ? '(bot)' : '')) }; });
console.log('match:', JSON.stringify(info));
// let it play: me idle (bots act); for killers try the powers
const shots = [];
const t0 = Date.now();
for (let i = 0; Date.now() - t0 < +SEC * 1000; i++) {
  if (role === 'killer') await pg.evaluate(async () => {
    const g = window.__nb.session.game; g.touch = true;
    const S = window.__nb.session.sim.S, me = S.players.find(p => p.id === 'me');
    const s = S.players.filter(p => p.role === 'survivor' && p.st === 'ok').sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z))[0];
    if (s) { g.camYaw = me.yaw = Math.atan2(s.x - me.x, s.z - me.z); }
    window.__evlog ||= []; if (!g.__wrapped) { g.__wrapped = true; const on = g.onEvents.bind(g); g.onEvents = evs => { for (const e of evs) if (['shot', 'bearset', 'bearsnap', 'haunt', 'tele-end', 'gaze', 'cursed', 'doomed', 'hauntfail', 'bearfail', 'hit', 'beam', 'spotted', 'lullaby'].includes(e.k)) window.__evlog.push(e.k); on(evs); }; }
    g.onKeyCode({ code: 'KeyR', repeat: false, target: document.body, preventDefault() {} }, true);
    g.onKeyCode({ code: 'KeyR', repeat: false, target: document.body, preventDefault() {} }, false);
    g.onMouse({ button: 2 }, true);
    await new Promise(r => setTimeout(r, 900));
    if (!window.__holdRMB) g.onMouse({ button: 2 }, false);
  });
  await pg.waitForTimeout(2500);
  const st = await pg.evaluate(() => { const s = window.__nb.session, S = s.sim.S, me = S.players.find(p => p.id === 'me'); return { t: S.t.toFixed(0), me: me && { st: me.st, x: me.x.toFixed(1), z: me.z.toFixed(1), abCd: me.abCd, ab2Cd: me.ab2Cd }, ev: (window.__evlog || []).slice(-5) }; });
  console.log(JSON.stringify(st));
  const d = await pg.evaluate(() => { const g = window.__nb.session.game; g.frame && g.frame(1 / 30); const c = g.camera; window.__cam = [c.position.x, c.position.y, c.position.z, c.rotation.x, c.rotation.y].map(v => +v.toFixed(2)); return g.renderer.domElement.toDataURL('image/jpeg', 0.8); });
  console.log('cam', JSON.stringify(await pg.evaluate(() => window.__cam)), JSON.stringify(await pg.evaluate(() => { const me = window.__nb.session.sim.S.players.find(p => p.id === 'me'); return { tele: me.tele, gaze: me.gaze, x: me.x, z: me.z }; })));
  shots.push(d);
}
const fs = await import('node:fs');
shots.forEach((d, i) => fs.writeFileSync(`${pre}${i}.jpg`, Buffer.from(d.split(',')[1], 'base64')));
console.log('errors:', errs.length ? errs.slice(0, 12) : 'none');
await br.close(); srv.close();
