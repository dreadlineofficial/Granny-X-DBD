// survivor match; then put a camera in front of the killer and on the map: node look.mjs killer map pre
import { chromium } from 'playwright';
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { join, extname } from 'node:path';
const ROOT = '/home/user/granny-x-dbd';
const [killer = 'slendrina', map = 'granny1', pre = 'lk'] = process.argv.slice(2);
const srv = http.createServer(async (q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; try { const b = await readFile(join(ROOT, u)); r.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css' }[extname(u)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript(() => { window.__probe = false; window.__up = true; window.__hideGlb = false; window.__px = [[787,560],[300,560],[600,480]]; localStorage.setItem('gdbd_profile', JSON.stringify({ seen: { intro: true, help: true, tut: true }, killer: { char: 'granny', perks: [] }, survivor: { char: 'mara', perks: [] } })); localStorage.setItem('gdbd_settings', JSON.stringify({ quality: 'low', name: 'Tester' })); window.__nbNoRTC = true; window.__nbMqtt = ['ws://127.0.0.1:1']; });
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.text().startsWith('PROBE')) console.log(m.text()); });
await pg.goto(`http://localhost:${srv.address().port}/index.html`);
await pg.waitForFunction(() => window.__nb && document.querySelector('#mainnav button'), null, { timeout: 120000 });
await pg.waitForTimeout(9000); await pg.click('#mainnav button[data-act="play-survivor"]', { force: true }); await pg.waitForTimeout(500);
await pg.selectOption('#bots-map', map); await pg.selectOption('#bots-killer', killer);
await pg.click('#btn-bots-start');
await pg.waitForFunction(() => window.__nb.session && window.__nb.session.game && window.__nb.session.sim && window.__nb.session.sim.S.t > 2, null, { timeout: 240000 });
const cams = JSON.parse(process.argv[5] || 'null');
const shots = await pg.evaluate(async (cams) => {
  const s = window.__nb.session, g = s.game, S = s.sim.S, K = S.players.find(p => p.role === 'killer');
  const out = [];
  // freeze the sim: shoot the killer from the front, then the map
  s.sim.update = () => {}; s.bots.update = () => {};
  if (window.__up) { const me = S.players.find(p => p.id === 'me'); me.fl = 1; me.x = 2.5; me.z = 4; }
  if (window.__hideGlb && g.W.glb) g.W.glb.visible = false;
  const shoot = (x, y, z, lx, ly, lz) => { g.frame(1 / 30); g.camera.position.set(x, y, z); g.camera.lookAt(lx, ly, lz); g.renderer.render(g.scene, g.camera); return g.renderer.domElement.toDataURL('image/jpeg', 0.85); };
  for (let i = 0; i < 8; i++) g.frame(1 / 30);
  if (window.__probe) { const T = window.__THREE, res = {}; const glb = g.W && g.W.glb; const inGlb = o => { for (let q = o; q; q = q.parent) if (q === glb) return true; return false; };
    g.scene.traverse(o => { if (!(o.isMesh || o.isSprite || o.isInstancedMesh || o.isPoints) || inGlb(o)) return; const p = new T.Vector3(); o.getWorldPosition(p); if (p.y > 3.6 && p.y < 8 && Math.abs(p.x) < 15 && Math.abs(p.z) < 17) { let n = o.type + ':' + (o.name || o.parent && o.parent.name || '') + ':' + (o.material && o.material.color ? o.material.color.getHexString() : ''); for (let q = o.parent, d = 0; q && d < 4; q = q.parent, d++) n += ' < ' + (q.name || q.type); res[n] = (res[n] || []); res[n].push(p.toArray().map(v => +v.toFixed(1)).join(',')); } });
    console.log('PROBE', JSON.stringify(res, null, 1));
    const c = (cams || [])[0]; if (c) { g.camera.position.set(c[0], c[1], c[2]); g.camera.lookAt(c[3], c[4], c[5]); g.camera.updateMatrixWorld(true);
      for (const [px, py] of window.__px || []) { const rc = new T.Raycaster(); rc.setFromCamera(new T.Vector2(px / 1280 * 2 - 1, -(py / 720) * 2 + 1), g.camera);
        const hits = rc.intersectObjects(g.scene.children, true).slice(0, 3).map(h => { let n = h.object.name || h.object.type; for (let q = h.object.parent, d = 0; q && d < 5; q = q.parent, d++) n += ' < ' + (q.name || q.type); return n + ' @' + h.point.toArray().map(v => v.toFixed(2)).join(',') + ' mat:' + (h.object.material && h.object.material.name); });
        console.log('PROBE ray', px, py, JSON.stringify(hits)); } } }
  const f = { x: Math.sin(K.yaw), z: Math.cos(K.yaw) };
  out.push(shoot(K.x + f.x * 2.6, 1.6, K.z + f.z * 2.6, K.x, 1.1, K.z));
  out.push(shoot(K.x + f.x * 1.2 + f.z * 0.6, 1.7, K.z + f.z * 1.2 - f.x * 0.6, K.x, 1.5, K.z));
  for (const c of (cams || [[0, 45, 70, 0, 0, 0], [30, 3, 32, 0, 3, 0], [-48, 2, -20, 0, 2, 0]])) out.push(shoot(...c));
  return out;
}, cams);
const fs = await import('node:fs'); shots.forEach((d, i) => fs.writeFileSync(`${pre}${i}.jpg`, Buffer.from(d.split(',')[1], 'base64')));
console.log('shots', shots.length, 'errors', errs);
await br.close(); srv.close();
