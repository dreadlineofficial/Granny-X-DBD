// Headless bot-vs-bot matches: Sim + Bots only (no rendering), many minutes of game time per second.
// usage: node simtest.mjs <map> <killerChar> <matches> <minutes> [diff]
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const ROOT = '/home/user/granny-x-dbd';
const [map = 'granny', killer = 'granny', N = '2', MIN = '6', diff = 'normal'] = process.argv.slice(2);
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const page0 = `<!doctype html><script type="importmap">{ "imports": { "three": "./vendor/three/three.module.min.js", "three/addons/": "./vendor/three/addons/" } }</script>
<script type="module">
import { buildMap } from './js/map.js';
import { Sim } from './js/sim.js';
import { Bots } from './js/bots.js';
import { killersOf, findInteraction } from './js/rules.js';
window.run = (map, killer, minutes, diff, seed) => {
  const M = buildMap(seed, map);
  const roster = [{ id: 'k', name: 'K', role: 'killer', char: killer, skin: 'default', perks: [], bot: true }];
  const chars = ['mara', 'eli', 'june', 'tomas'];
  for (let i = 0; i < 4; i++) roster.push({ id: 's' + i, name: 'S' + i, role: 'survivor', char: chars[i], skin: 'default', perks: [], item: 'flashlight', bot: true });
  const sim = new Sim(M, roster, { difficulty: diff, mode: 'classic' }), bots = new Bots(sim), S = sim.S;
  const dt = 1 / 30, stall = {}, log = [], evc = {}; let stallSec = 0, insideT = 0, upT = 0, falls = 0; const hg = M.gens.find(g => g.x > -5.6 && g.x < 12.5 && g.z > 3.9 && g.z < 15.8);
  let t = 0;
  const still = new Map();
  while (S.phase === 'play' && t < minutes * 60) {
    bots.update(dt); sim.update(dt); const ev = sim.takeEvents(); bots.onEvents(ev);
    for (const e of ev) evc[e.k] = (evc[e.k] || 0) + 1;
    t += dt;
    for (const p of S.players) { if (p.x > -5.5 && p.x < 12.4 && p.z > 4 && p.z < 15.6) insideT += dt; if ((p.fl || 0) > 0) upT += dt; if (p.fell) { falls += p.fell; p.fell = 0; } }
    for (const p of S.players) {
      const busy = p.act || p.stun > 0 || p.vault || (p.role === 'survivor' && p.st !== 'ok') || p.tele || p.carry != null && false;
      const w = still.get(p.id) || { x: p.x, z: p.z, t: 0 };
      if (Math.hypot(p.x - w.x, p.z - w.z) > 0.6 || busy) { w.x = p.x; w.z = p.z; w.t = 0; }
      else { w.t += dt; if (w.t > 6) stallSec += dt; if (w.t > 6 && !w.logged) { w.logged = true; const b = bots.brains.get(p.id) || {}; log.push({ t: +t.toFixed(1), id: p.id, char: p.char, st: p.st, x: +p.x.toFixed(1), z: +p.z.toFixed(1), fl: p.fl || 0, mode: b.mode, goalKey: b.goalKey, path: b.path ? b.path.length : null, pi: b.pi, aim: b.aim, target: b.target, ab: p.ab, gp: S.gatesPowered, carry: p.carry, it: JSON.stringify(findInteraction(M, S, p)), stun: p.stun, gensP: S.gens.map(g => g.done ? 'D' : g.p.toFixed(2)).join(' '), inp: JSON.stringify(sim.inputs.get(p.id)) }); } }
      if (w.t <= 6) w.logged = false;
      still.set(p.id, w);
    }
  }
  const res = { t: +t.toFixed(0), phase: S.phase, gens: S.gensDone, need: S.gensNeeded, out: S.players.filter(p => p.role === 'survivor').map(p => p.st + (p.outcome ? ':' + p.outcome : '')), evc: { hit: evc.hit, shot: evc.shot, died: evc.died, escaped: evc.escaped, bearset: evc.bearset, bearsnap: evc.bearsnap, haunt: evc.haunt, hauntfail: evc.hauntfail, gaze: evc.gaze, cursed: evc.cursed, doomed: evc.doomed, bearfail: evc.bearfail, spotted: evc.spotted, lullaby: evc.lullaby, beam: evc.beam }, stalls: log, stallSec: +stallSec.toFixed(0), insideT: +insideT.toFixed(0), upT: +upT.toFixed(0), falls, houseGen: hg ? (S.gens[hg.id].done ? 'DONE' : S.gens[hg.id].p.toFixed(2)) : 'none' };
  return res;
};
window.ready = true;
</script>`;
const srv = http.createServer(async (q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/public/__simtest.html') { r.writeHead(200, { 'content-type': 'text/html' }); return r.end(page0); }
  try { const b = await readFile(join(ROOT, u)); r.writeHead(200, { 'content-type': MIME[extname(u)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); }
}).listen(0);
const port = srv.address().port;
const br = await chromium.launch();
const pg = await br.newPage();
pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
pg.on('pageerror', e => console.log('[pageerror]', e.message));
await pg.goto(`http://localhost:${port}/public/__simtest.html`);
await pg.waitForFunction(() => window.ready, null, { timeout: 30000 });
let tot = 0;
for (let i = 0; i < +N; i++) {
  const t0 = Date.now();
  const r = await pg.evaluate(([a, b, c, d, s]) => window.run(a, b, c, d, s), [map, killer, +MIN, diff, 1000 + i * 7919]);
  tot += r.stallSec; console.log(`#${i} ${map}/${killer} ${((Date.now() - t0) / 1000).toFixed(1)}s real:`, JSON.stringify({ ...r, stalls: r.stalls.length }));
  for (const s of r.stalls) console.log('   STALL', JSON.stringify(s));
}
console.log('TOTAL stall seconds', tot.toFixed(0));
await br.close(); srv.close();
