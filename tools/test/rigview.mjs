// render a game rig (makeKiller id) from front/side with a given anim state: node rigview.mjs id out [stateJSON]
import { chromium } from 'playwright';
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { join, extname } from 'node:path';
const ROOT = '/home/user/granny-x-dbd';
const [id, pre, stJ] = process.argv.slice(2);
const page0 = `<!doctype html><meta charset="utf-8"><body style="margin:0"><script type="importmap">{ "imports": { "three": "./vendor/three/three.module.min.js", "three/addons/": "./vendor/three/addons/" } }</script>
<script type="module">
import * as THREE from 'three';
import { makeKiller, animate } from './js/models.js';
import { loadGranny, loadGrandpa, loadSlendrina, loadAngeline } from './js/grannyGlb.js';
window.go = async (id, st) => {
  await Promise.all([loadGranny(), loadGrandpa(), loadSlendrina(), loadAngeline()]);
  const r = new THREE.WebGLRenderer({ preserveDrawingBuffer: true }); r.setSize(900, 900); document.body.appendChild(r.domElement);
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x8899aa); sc.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.5)); const d = new THREE.DirectionalLight(0xffffff, 1.5); d.position.set(3, 5, 4); sc.add(d);
  sc.add(new THREE.GridHelper(4, 8));
  const R = makeKiller(id, {}); sc.add(R.root);
  if (st.bind) { R.mixer.stopAllAction(); R.root.traverse(o => { if (o.isSkinnedMesh) o.skeleton.pose(); }); } else for (let i = 0; i < 20; i++) animate(R, { anim: 'idle', speed: 0, ...st }, 1 / 30);
  R.root.updateMatrixWorld(true);
  const out = [];
  for (const [x, z] of [[0, 3.2], [3.2, 0], [0, -3.2]]) { const cam = new THREE.PerspectiveCamera(45, 1, 0.05, 50); cam.position.set(x, 1.0, z); cam.lookAt(0, 0.95, 0); r.render(sc, cam); out.push(r.domElement.toDataURL('image/jpeg', 0.85)); }
  return out;
};
window.ready = true;
</script>`;
const srv = http.createServer(async (q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); if (u === '/public/__rig.html') { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return r.end(page0); } try { const b = await readFile(join(ROOT, u)); r.writeHead(200, { 'content-type': { '.js': 'text/javascript' }[extname(u)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await br.newPage({ viewport: { width: 900, height: 900 } });
pg.on('pageerror', e => console.log('err', e.message)); pg.on('console', m => console.log(m.text()));
await pg.goto(`http://localhost:${srv.address().port}/public/__rig.html`); await pg.waitForFunction(() => window.ready);
const imgs = await pg.evaluate(([i, s]) => window.go(i, s), [id, JSON.parse(stJ || '{}')]);
const fs = await import('node:fs'); imgs.forEach((d, i) => fs.writeFileSync(`${pre}${i}.jpg`, Buffer.from(d.split(',')[1], 'base64')));
await br.close(); srv.close();
