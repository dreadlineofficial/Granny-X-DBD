// play a GLB's clips with plain three.js (no game code): node rawglb.mjs file.glb out
import { chromium } from 'playwright';
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { join, extname } from 'node:path';
const ROOT = '/home/user/granny-x-dbd/public';
const [file, pre] = process.argv.slice(2);
const page0 = `<!doctype html><meta charset="utf-8"><body style="margin:0"><script type="importmap">{ "imports": { "three": "./vendor/three/three.module.min.js", "three/addons/": "./vendor/three/addons/" } }</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
window.go = async () => {
  const g = await new GLTFLoader().loadAsync('/__model.glb');
  const r = new THREE.WebGLRenderer({ preserveDrawingBuffer: true }); r.setSize(600, 600); document.body.appendChild(r.domElement);
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x8899aa); sc.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.5));
  sc.add(g.scene); sc.add(new THREE.GridHelper(4, 8));
  const box = new THREE.Box3().setFromObject(g.scene); const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
  const out = [], info = [JSON.stringify(sz.toArray().map(v => +v.toFixed(2))), JSON.stringify(c.toArray().map(v => +v.toFixed(2)))];
  const mixer = new THREE.AnimationMixer(g.scene);
  const shots = [['none', 0]]; for (const a of g.animations) for (const f of [0.1, 0.5]) shots.push([a.name, f]);
  for (const [n, f] of shots) {
    mixer.stopAllAction();
    if (n !== 'none') { const a = g.animations.find(x => x.name === n); const act = mixer.clipAction(a); act.play(); mixer.setTime(a.duration * f); }
    g.scene.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(g.scene, true), cc = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
    const d = Math.max(s.x, s.y, s.z) * 1.6;
    for (const ang of [0, Math.PI / 2]) { const cam = new THREE.PerspectiveCamera(40, 1, 0.01, 500); cam.position.set(cc.x + Math.sin(ang) * d, cc.y, cc.z + Math.cos(ang) * d); cam.lookAt(cc); r.render(sc, cam); out.push(r.domElement.toDataURL('image/jpeg', 0.8)); }
    info.push(n + '@' + f + ' size ' + s.toArray().map(v => v.toExponential(2)).join(','));
  }
  return { out, info };
};
window.ready = true;
</script>`;
const srv = http.createServer(async (q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); if (u === '/__r.html') { r.writeHead(200, { 'content-type': 'text/html' }); return r.end(page0); } if (u === '/__model.glb') { r.writeHead(200); return r.end(await readFile(file)); } try { const b = await readFile(join(ROOT, u)); r.writeHead(200, { 'content-type': { '.js': 'text/javascript' }[extname(u)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await br.newPage(); pg.on('pageerror', e => console.log('err', e.message));
await pg.goto(`http://localhost:${srv.address().port}/__r.html`); await pg.waitForFunction(() => window.ready);
const { out, info } = await pg.evaluate(() => window.go());
console.log(info.join('\n'));
const fs = await import('node:fs'); out.forEach((d, i) => fs.writeFileSync(`${pre}${String(i).padStart(2, '0')}.jpg`, Buffer.from(d.split(',')[1], 'base64')));
await br.close(); srv.close();
