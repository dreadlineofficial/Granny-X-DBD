// Trailer capture rig: a real bot match driven frame by frame, filmed with a scripted camera (window.__cine).
// import { open } from './rig.mjs'; const R = await open({ killer, map, quality, w, h }); await R.ff(cond); await R.rec(dir, n, cam)
import { chromium } from 'playwright';
import http from 'node:http'; import { readFile, writeFile, mkdir } from 'node:fs/promises'; import { join, extname } from 'node:path';
const ROOT = '/home/user/granny-x-dbd';
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.ktx2': 'image/ktx2', '.wasm': 'application/wasm' };
export async function open({ killer = 'angeline', map = 'granny', quality = 'high', w = 1920, h = 1080, diff = 'normal', role = 'survivor', killerSkin = null } = {}) {
  const srv = http.createServer(async (q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; try { const b = await readFile(join(ROOT, u)); r.writeHead(200, { 'content-type': MIME[extname(u)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
  const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([killer, quality, killerSkin]) => {
    if (killerSkin) window.__killerSkin = killerSkin;
    localStorage.setItem('gdbd_profile', JSON.stringify({ seen: { intro: true, help: true, tut: true, granny: true }, killer: { char: killer, perks: [] }, survivor: { char: 'mara', perks: [] } }));
    localStorage.setItem('gdbd_settings', JSON.stringify({ quality, name: 'Mara', vol: 0, music: 0 }));
    window.__nbNoRTC = true; window.__nbMqtt = ['ws://127.0.0.1:1'];
  }, [killer, quality, killerSkin]);
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(`http://localhost:${srv.address().port}/public/index.html`);
  await pg.waitForFunction(() => window.__nb && document.querySelector('#mainnav button') && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 300000 });
  await pg.evaluate(r => document.querySelector(`#mainnav button[data-act="play-${r}"]`).click(), role); await pg.waitForTimeout(600);
  await pg.selectOption('#bots-map', map); if (role === 'survivor') await pg.selectOption('#bots-killer', killer);
  try { await pg.selectOption('#bots-diff', diff); } catch {}
  await pg.evaluate(() => document.getElementById('btn-bots-start').click());
  await pg.waitForFunction(() => window.__nb.session && window.__nb.session.game && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 600000 });
  // take the clock: the page's own loop stops driving the match; our survivor is a bot too
  await pg.evaluate(() => {
    const s = window.__nb.session; s.tick = () => {};
    const me = s.sim.S.players.find(p => p.id === s.myId); me.bot = true; s.sim.inputs.get(me.id).e = false;
    document.getElementById('hud').style.display = 'none';
    const V = window.__THREE.Vector3; const cam = { pos: new V(), look: new V(), init: false };
    window.__C = cam;
    window.__cine = (g, S, dt) => { const f = window.__shot; if (!f) return; const r = f(g, S, dt); if (!r) return;
      const [p, l, k = 0.12, fov] = r; if (!cam.init || window.__cut) { cam.pos.copy(p); cam.look.copy(l); cam.init = true; window.__cut = false; } else { cam.pos.lerp(p, k); cam.look.lerp(l, k); }
      g.camera.position.copy(cam.pos); g.camera.lookAt(cam.look); if (fov && g.camera.fov !== fov) { g.camera.fov = fov; g.camera.updateProjectionMatrix(); } };
    // camera placement that doesn't end up inside / behind a wall: rays against the static scenery
    const RC = new window.__THREE.Raycaster(); let solids = null;
    const getSolids = () => solids ||= (() => { const out = []; s.game.scene.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && !o.isInstancedMesh && o.visible && o.geometry && o.material && !o.material.transparent) { o.geometry.computeBoundingSphere(); if (o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z) > 0.6) out.push(o); } }); return out; })();
    window.__clear = (a, b) => { const d = b.clone().sub(a), l = d.length(); RC.set(a, d.normalize()); RC.far = l; return !RC.intersectObjects(getSolids(), false).length; };
    // orbit around target t at distance r / height h, starting from angle a0, keeping the last good angle
    window.__orbit = (key, t, r, h, a0) => { const V = window.__THREE.Vector3; const st = (window.__orb ||= {}); let pref = st[key] ?? a0;
      for (let k = 0; k < 24; k++) { const a = pref + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.27, c = new V(t.x + Math.sin(a) * r, h, t.z + Math.cos(a) * r);
        if (window.__clear(new V(t.x, 1.2, t.z), c)) { st[key] = a; return c; } }
      return new V(t.x + Math.sin(pref) * r * 0.4, h, t.z + Math.cos(pref) * r * 0.4); };
    window.__step = (n, draw) => { for (let i = 0; i < n; i++) { s.simTick(1 / 30); if (draw || i === n - 1) s.game.frame(1 / 30); } };
  });
  const R = {
    pg, errs,
    S: () => pg.evaluate(() => { const S = window.__nb.session.sim.S; return { t: S.t, phase: S.phase, players: S.players.map(p => ({ id: p.id, role: p.role, char: p.char, st: p.st, x: +p.x.toFixed(1), z: +p.z.toFixed(1), y: +(p.y || 0).toFixed(1), aim: p.aim, hp: p.hp })) }; }),
    // fast-forward (no drawing) until cond(S) is true; cond is a function source string
    ff: (cond, max = 240) => pg.evaluate(([cond, max]) => { const s = window.__nb.session, f = new Function('S', 'K', 'P', 'd', 'return (' + cond + ')');
      const S = s.sim.S, K = S.players.find(p => p.role === 'killer'), d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
      for (let i = 0; i < max * 30; i++) { s.simTick(1 / 30); if (f(S, K, S.players, d)) { s.game.frame(1 / 30); return S.t; } } s.game.frame(1 / 30); return -1; }, [cond, max]),
    // set the camera function (source of (g, S, dt, K, P, V) => [pos, look, k, fov])
    shot: src => pg.evaluate(src => { const V = window.__THREE.Vector3; const fn = new Function('V', 'return ' + src)(V);
      window.__shot = (g, S, dt) => fn(g, S, dt, S.players.find(p => p.role === 'killer'), S.players, V); window.__cut = true; window.__orb = {}; }, src),
    // record n frames to dir/prefix_0000.jpg
    async rec(dir, prefix, n, each) {
      await mkdir(dir, { recursive: true }); let t = Date.now();
      for (let i = 0; i < n; i += 6) {
        const k = Math.min(6, n - i);
        const imgs = await pg.evaluate(([k, each]) => { const s = window.__nb.session, g = s.game, out = [];
          for (let j = 0; j < k; j++) { if (each) new Function('S', 'K', 'P', each)(s.sim.S, s.sim.S.players.find(p => p.role === 'killer'), s.sim.S.players); s.simTick(1 / 30); g.frame(1 / 30); out.push(g.renderer.domElement.toDataURL('image/jpeg', 0.93)); } return out; }, [k, each || null]);
        for (let j = 0; j < imgs.length; j++) await writeFile(`${dir}/${prefix}_${String(i + j).padStart(4, '0')}.jpg`, Buffer.from(imgs[j].split(',')[1], 'base64'));
      }
      return (Date.now() - t) / n;
    },
    close: async () => { await br.close(); srv.close(); },
  };
  return R;
}
