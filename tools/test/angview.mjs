// Angeline's coded animation: states x 3 views. node angview.mjs out.jpg
import { chromium } from 'playwright';
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { join, extname } from 'node:path';
const ROOT = '/home/user/granny-x-dbd';
const page0 = `<!doctype html><meta charset="utf-8"><body style="margin:0"><script type="importmap">{ "imports": { "three": "./vendor/three/three.module.min.js", "three/addons/": "./vendor/three/addons/" } }</script>
<script type="module">
import * as THREE from 'three';
import { makeKiller, animate } from './js/models.js';
import { loadAngeline } from './js/grannyGlb.js';
window.go = async (states) => {
  await loadAngeline();
  const r = new THREE.WebGLRenderer({ preserveDrawingBuffer: true }); r.setSize(300, 360); document.body.appendChild(r.domElement);
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x707c8c); sc.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.2)); const dl = new THREE.DirectionalLight(0xffffff, 1.5); dl.position.set(3, 5, 4); sc.add(dl);
  sc.add(new THREE.GridHelper(4, 8));
  const R = makeKiller('angeline', {}); sc.add(R.root);
  const out = [], errs = [];
  for (const [st, secs] of states) {
    try { for (let i = 0; i < secs * 30; i++) animate(R, { anim: 'idle', speed: 0, ...st }, 1 / 30); } catch (e) { errs.push(e.message + e.stack); }
    R.root.updateMatrixWorld(true);
    for (const [x, z] of [[0, 3.4], [3.4, 0], [2.4, -2.4]]) { const cam = new THREE.PerspectiveCamera(42, 300 / 360, 0.05, 50); cam.position.set(x, 1.1, z); cam.lookAt(0, 1.0, 0); r.render(sc, cam); out.push(r.domElement.toDataURL('image/jpeg', 0.85)); }
  }
  return { out, errs };
};
window.ready = true;
</script>`;
const srv = http.createServer(async (q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); if (u === '/public/__a.html') { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return r.end(page0); } try { const b = await readFile(join(ROOT, u)); r.writeHead(200, { 'content-type': { '.js': 'text/javascript' }[extname(u)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await br.newPage({ viewport: { width: 300, height: 360 } });
pg.on('pageerror', e => console.log('err', e.message));
await pg.goto(`http://localhost:${srv.address().port}/public/__a.html`); await pg.waitForFunction(() => window.ready);
const states = JSON.parse(process.env.STATES || '[[{},2],[{"speed":4.6,"anim":"walk"},1.3],[{"speed":4.6,"anim":"walk"},0.4],[{"aim":true},1],[{"atk":1},0.25],[{"atk":1},0.2]]');
const { out, errs } = await pg.evaluate(s => window.go(s), states);
if (errs.length) console.log(errs.slice(0, 2).join('\n'));
const fs = await import('node:fs'); out.forEach((d, i) => fs.writeFileSync(`angv_${String(i).padStart(2, '0')}.jpg`, Buffer.from(d.split(',')[1], 'base64')));
await br.close(); srv.close();
