// 1.3.2 trailer footage: real bot matches, fast-forwarded to the moment, filmed with a scripted camera.
// node shoot132.mjs <killer> <outdir>
import { open } from './rig.mjs';
const [killer = 'granny', OUT = '/tmp/claude-0/tr/f'] = process.argv.slice(2);
const R = await open({ killer, map: 'granny', quality: 'low', w: 1920, h: 1080, diff: 'normal' });
await R.pg.evaluate(() => { const g = window.__nb.session.game;
  g.updateAuras = function () { for (const c of this.chars.values()) if (c.aura !== null) { c.rig.setAura(null); c.aura = null; } for (const G of this.W.gens || []) if (G.userData.aura) G.userData.aura.visible = false; };
  g.renderer.toneMappingExposure *= 1.35;
  // full 1920x1080: the game lowers its resolution when the frame rate drops (always, in software rendering)
  g.q = Object.assign({}, g.q, { pixel: 1, minPixel: 1 }); g.pr = 1; g.renderer.setPixelRatio(1); g.renderer.setSize(innerWidth, innerHeight); if (g.composer) { g.composer.setPixelRatio(1); g.composer.setSize(innerWidth, innerHeight); } });
const T = Date.now(), log = (...a) => console.log(((Date.now() - T) / 1000).toFixed(0) + 's', ...a);
const SURV = `S.players.filter(p => p.role === 'survivor' && p.st === 'ok')`;
async function take(name, cond, max, cam, n, each) {
  const t = cond ? await R.ff(cond, max) : 0;
  if (t < 0) { log(name, 'not found'); return false; }
  await R.shot(cam); const ms = await R.rec(OUT, name, n, each); log(name, 'at', t && t.toFixed(1), Math.round(ms) + 'ms/f'); return true;
}
if (killer === 'granny') {
  // in front of the house, a slow push in (a spot known to be clear of the yard walls)
  await take('a1', null, 0, `(g, S, dt, K, P, V) => { const u = Math.min(1, ((window.__u1 = (window.__u1 || 0) + dt)) / 4); return [new V(0.6 - u * 0.6, 2.2 + u * 0.5, 29.5 - u * 3), new V(0, 4.6 + u * 0.4, 0), 0.25, 50]; }`, 120);
  // they split up: high above, following the survivors as they spread out
  await take('a2', null, 0, `(g, S, dt, K, P, V) => { const s = P.filter(p => p.role === 'survivor'); let x = 0, z = 0; for (const p of s) { x += p.x; z += p.z; } x /= s.length; z /= s.length; const c = window.__orbit('a2', { x, z }, 15, 8, 0.8); return [c, new V(x, 0.5, z), 0.05, 50]; }`, 150);
  // someone on a generator, the killer far away
  await take('a3', `${SURV}.some(p => p.act && p.act.k === 'repair' && d(p, K) > 22)`, 120,
    `(g, S, dt, K, P, V) => { const p = P.find(p => p.act && p.act.k === 'repair') || P.find(p => p.role === 'survivor'); const c = window.__orbit('a3', p, 2.8, 1.3, (p.yaw || 0) + 1.2); return [c, new V(p.x, 0.95, p.z), 0.1, 45]; }`, 90);
  // a chase: side-on, both in frame
  await take('a4', `${SURV}.some(p => d(p, K) < 6 && K.carry == null)`, 240,
    `(g, S, dt, K, P, V) => { const s = P.filter(p => p.role === 'survivor' && p.st === 'ok').sort((a, b) => Math.hypot(a.x - K.x, a.z - K.z) - Math.hypot(b.x - K.x, b.z - K.z))[0] || K; const m = { x: (s.x + K.x) / 2, z: (s.z + K.z) / 2 }; const c = window.__orbit('a4', m, 6.5, 2.6, Math.atan2(-(s.z - K.z), s.x - K.x)); return [c, new V(m.x, 1.1, m.z), 0.08, 52]; }`, 150);
  // the Bat Rush and its Ground Slam
  await take('a5', `K.dash || (K.aim && K.abT > 0.3)`, 300,
    `(g, S, dt, K, P, V) => { const c = window.__orbit('a5', K, 4.2, 0.9, K.yaw + 0.35); return [c, new V(K.x, 1.3, K.z), 0.18, 55]; }`, 90);
} else if (killer === 'angeline') {
  await take('b1', `K.aim`, 400,
    `(g, S, dt, K, P, V) => { const f = { x: Math.sin(K.yaw), z: Math.cos(K.yaw) }; return [new V(K.x + f.x * 3.2 + f.z * 1.2, 1.5, K.z + f.z * 3.2 - f.x * 1.2), new V(K.x, 1.9, K.z), 0.15, 45]; }`, 90);
  await take('b2', `${SURV}.some(p => d(p, K) < 7)`, 300,
    `(g, S, dt, K, P, V) => { const f = { x: Math.sin(K.yaw), z: Math.cos(K.yaw) }; return [new V(K.x - f.x * 3.6, 2.3, K.z - f.z * 3.6), new V(K.x + f.x * 4, 1.2, K.z + f.z * 4), 0.1, 55]; }`, 90);
} else if (killer === 'grandpa') {
  await take('c1', `K.aim && K.abT > 0.2`, 400,
    `(g, S, dt, K, P, V) => { const f = { x: Math.sin(K.yaw), z: Math.cos(K.yaw) }; return [new V(K.x + f.x * 2.8 + f.z * 1.5, 1.6, K.z + f.z * 2.8 - f.x * 1.5), new V(K.x, 1.5, K.z), 0.15, 45]; }`, 75);
} else if (killer === 'slendrina') {
  await take('d1', `${SURV}.some(p => d(p, K) < 9)`, 300,
    `(g, S, dt, K, P, V) => { const f = { x: Math.sin(K.yaw), z: Math.cos(K.yaw) }; return [new V(K.x + f.x * 3 + f.z * 0.8, 1.7, K.z + f.z * 3 - f.x * 0.8), new V(K.x, 1.7, K.z), 0.12, 45]; }`, 75);
}
log('errors', R.errs.slice(0, 3));
await R.close();
