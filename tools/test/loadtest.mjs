// loading freezes: open the offline single-file build (what the EXE / APK run), record every long frame from the start
// until the menu is up, then (optionally) into a bot match. node loadtest.mjs [quality] [perf 0|1] [match 0|1]
import { chromium } from 'playwright';
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { join, extname } from 'node:path';
const ROOT = '/home/user/granny-x-dbd';
const [quality = 'low', perf = '0', match = '1'] = process.argv.slice(2);
const srv = http.createServer(async (q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); try { const b = await readFile(join(ROOT, u)); r.writeHead(200, { 'content-type': { '.html': 'text/html' }[extname(u)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript(([quality, perf]) => {
  localStorage.setItem('gdbd_profile', JSON.stringify({ seen: { intro: true, help: true, tut: true, granny: true }, killer: { char: 'granny', perks: [] }, survivor: { char: 'mara', perks: [] } }));
  localStorage.setItem('gdbd_settings', JSON.stringify({ quality, perf: perf === '1', name: 'T' })); window.__nbNoRTC = true; window.__nbMqtt = ['ws://127.0.0.1:1'];
  window.__gaps = []; let last = 0; const f = t => { if (last && t - last > 100) window.__gaps.push([Math.round(t), Math.round(t - last)]); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f);
}, [quality, perf]);
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
const cdp = await ctx.newCDPSession(pg); if (process.env.PROF) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 2000 }); await cdp.send('Profiler.start'); }
const t0 = Date.now();
await pg.goto(`http://localhost:${srv.address().port}/GrannyDBD.html`, { timeout: 300000 });
await pg.waitForFunction(() => window.__nb && document.querySelector('#mainnav button') && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 400000 });
const boot = await pg.evaluate(() => ({ t: Math.round(performance.now()), gaps: window.__gaps.slice() }));
if (process.env.PROF) {
  const { profile } = await cdp.send('Profiler.stop'); const self = new Map(), byId = new Map(profile.nodes.map(n => [n.id, n]));
  const dt = profile.timeDeltas; const counts = new Map(); profile.samples.forEach((id, i) => counts.set(id, (counts.get(id) || 0) + (dt[i] || 0)));
  for (const [id, us] of counts) { const n = byId.get(id), k = n.callFrame.functionName + ' ' + (n.callFrame.url || '').split('/').pop() + ':' + n.callFrame.lineNumber; self.set(k, (self.get(k) || 0) + us); }
  console.log('PROFILE top self ms', JSON.stringify([...self].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => [k, Math.round(v / 1000)])));
}
const sum = g => ({ worst: Math.max(0, ...g.map(x => x[1])), over500: g.filter(x => x[1] > 500).length, frozenMs: g.reduce((a, x) => a + x[1], 0) });
console.log('BOOT', quality, 'perf', perf, 'menu at', boot.t, 'ms', JSON.stringify(sum(boot.gaps)), 'top', JSON.stringify(boot.gaps.sort((a, b) => b[1] - a[1]).slice(0, 5)));
if (match === '1') {
  await pg.evaluate(() => { window.__gaps = []; document.querySelector('#mainnav button[data-act="play-survivor"]').click(); }); await pg.waitForTimeout(600);
  await pg.selectOption('#bots-map', 'granny'); await pg.selectOption('#bots-killer', 'granny');
  const m0 = await pg.evaluate(() => { window.__gaps = []; document.getElementById('btn-bots-start').click(); return performance.now(); });
  await pg.waitForFunction(() => window.__nb.session && window.__nb.session.game && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 600000 });
  const m = await pg.evaluate(m0 => ({ t: Math.round(performance.now() - m0), gaps: window.__gaps.slice() }), m0);
  console.log('MATCH load', m.t, 'ms', JSON.stringify(sum(m.gaps)), 'top', JSON.stringify(m.gaps.sort((a, b) => b[1] - a[1]).slice(0, 5)));
}
console.log('errors', errs.slice(0, 3));
await br.close(); srv.close();
