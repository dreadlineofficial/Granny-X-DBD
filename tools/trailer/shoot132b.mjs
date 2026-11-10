// 1.3.2 trailer v2 footage. node shoot132b.mjs freddy|pov-granny|pov-grandpa|pov-slendrina|pov-angeline <outdir>
//  freddy: a bot Granny wearing the legendary Freddy Fazbear outfit, filmed from outside
//  pov-*: "playing as" that killer: our player is the killer (driven by the bot AI), filmed with the game's own camera
import { open } from './rig.mjs';
const [mode = 'freddy', OUT = '/tmp/claude-0/tr/g'] = process.argv.slice(2);
const pov = mode.startsWith('pov-'), killer = pov ? mode.slice(4) : 'granny';
const R = await open({ killer, map: 'granny', quality: 'low', w: 1920, h: 1080, diff: 'normal', role: pov ? 'killer' : 'survivor', killerSkin: pov ? null : 'freddy' });
await R.pg.evaluate(() => { const g = window.__nb.session.game;
  g.updateAuras = function () { for (const c of this.chars.values()) if (c.aura !== null) { c.rig.setAura(null); c.aura = null; } for (const G of this.W.gens || []) if (G.userData.aura) G.userData.aura.visible = false; };
  g.renderer.toneMappingExposure *= 1.35;
  g.q = Object.assign({}, g.q, { pixel: 1, minPixel: 1 }); g.pr = 1; g.renderer.setPixelRatio(1); g.renderer.setSize(innerWidth, innerHeight); if (g.composer) { g.composer.setPixelRatio(1); g.composer.setSize(innerWidth, innerHeight); } });
const T = Date.now(), log = (...a) => console.log(((Date.now() - T) / 1000).toFixed(0) + 's', ...a);
const SURV = `S.players.filter(p => p.role === 'survivor' && p.st === 'ok')`;
async function take(name, cond, max, cam, n) {
  const t = cond ? await R.ff(cond, max) : 0;
  if (t < 0) { log(name, 'not found'); return false; }
  await R.shot(cam); const ms = await R.rec(OUT, name, n); log(name, 'at', t && t.toFixed(1), Math.round(ms) + 'ms/f'); return true;
}
if (!pov) {
  log('freddy model', await R.pg.evaluate(() => { const g = window.__nb.session.game, K = window.__nb.session.sim.S.players.find(p => p.role === 'killer'), c = g.chars.get(K.id); return !!(c && c.rig && c.rig.freddy); }));
  // he walks at us out of the dark
  await take('g1', `S.t > 6 && ${SURV}.some(p => d(p, K) < 30)`, 200,
    `(g, S, dt, K, P, V) => { const c = window.__orbit('g1', K, 4.6, 0.75, K.yaw); return [c, new V(K.x, 1.75, K.z), 0.12, 42]; }`, 105);
  // the chase
  await take('g2', `${SURV}.some(p => d(p, K) < 6 && K.carry == null)`, 300,
    `(g, S, dt, K, P, V) => { const s = P.filter(p => p.role === 'survivor' && p.st === 'ok').sort((a, b) => Math.hypot(a.x - K.x, a.z - K.z) - Math.hypot(b.x - K.x, b.z - K.z))[0] || K; const m = { x: (s.x + K.x) / 2, z: (s.z + K.z) / 2 }; const c = window.__orbit('g2', m, 6.2, 2.2, Math.atan2(-(s.z - K.z), s.x - K.x)); return [c, new V(m.x, 1.2, m.z), 0.08, 50]; }`, 120);
  // the bat
  await take('g3', `K.aim || K.atk === 1 || K.dash`, 400,
    `(g, S, dt, K, P, V) => { const c = window.__orbit('g3', K, 3.6, 1.0, K.yaw + 0.5); return [c, new V(K.x, 1.6, K.z), 0.18, 48]; }`, 90);
} else {
  // our player is the killer, the bot AI plays it; the camera follows where it faces
  await R.pg.evaluate(() => { const s = window.__nb.session, me = s.sim.S.players.find(p => p.id === s.myId); me.bot = true; s.sim.inputs.get(me.id).e = false; });
  const POVCAM = `(g, S, dt, K, P, V) => { const me = P.find(p => p.id === g.myId); let d = me.yaw - g.camYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); g.camYaw += d * 0.25; g.camPitch += ((${killer === 'slendrina' || killer === 'angeline' ? 0.22 : 0.06}) - g.camPitch) * 0.2; return null; }`;
  await take('p_' + killer, `${SURV}.some(p => d(p, K) < 9 && d(p, K) > 2.5)`, 400, POVCAM, 90);
}
log('errors', R.errs.slice(0, 3));
await R.close();
