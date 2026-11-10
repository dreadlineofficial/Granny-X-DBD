// look at the Freddy outfit: standing, walking, running, crouching (procedural animation retargeted)
import { chromium } from 'playwright';
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { join, extname } from 'node:path';
const ROOT = '/home/user/granny-x-dbd';
const srv = http.createServer(async (q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); try { const b = await readFile(join(ROOT, u)); r.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.html': 'text/html' }[extname(u)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const pg = await br.newPage({ viewport: { width: 1600, height: 500 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 200)); });
await pg.goto(`http://localhost:${srv.address().port}/public/index.html`);
await pg.addScriptTag({ type: 'module', content: `
  import * as THREE from 'three';
  import { loadRealism } from './js/realism.js';
  import { loadGranny } from './js/grannyGlb.js';
  import { makeKiller } from './js/models.js';
  import { makeSurvivor, animate } from './js/models.js';
  import { SURVIVORS, skinOf } from './js/config.js';
  window.__go = async () => {
    await loadRealism('freddy'); await loadGranny();
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(1600, 500); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
    const sc = new THREE.Scene(); sc.background = new THREE.Color(0x202428);
    sc.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.6)); const d = new THREE.DirectionalLight(0xffffff, 2.5); d.position.set(2, 4, 5); sc.add(d);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), new THREE.MeshStandardMaterial({ color: 0x3a3a3a })); fl.rotation.x = -Math.PI / 2; sc.add(fl);
    const poses = [{ anim: 'idle', speed: 0 }, { anim: 'walk', speed: 3 }, { anim: 'idle', speed: 0, aim: true }, { anim: 'idle', speed: 0, atk: 1 }, { anim: 'walk', speed: 6, dash: true }];
    const out = [];
    poses.forEach((s, i) => {
      const R = makeKiller('granny', skinOf('granny', 'freddy')); R.root.position.x = (i - 2) * 1.6; R.root.rotation.y = i === 1 ? Math.PI / 2 : 0.3; sc.add(R.root);
      for (let k = 0; k < (i === 3 ? 12 : 20); k++) animate(R, s, 0.05);
      out.push(!!R.freddy);
      if (i === 0) { const M = makeKiller('granny', {}); M.root.position.set(-4.6, 0, 0); for (let k = 0; k < 5; k++) animate(M, s, 0.05); sc.add(M.root); }
    });
    const cam = new THREE.PerspectiveCamera(30, 1600 / 500, 0.1, 100); cam.position.set(0, 1.3, 11); cam.lookAt(0, 1.0, 0);
    r.render(sc, cam); window.__img = r.domElement.toDataURL('image/png'); return out;
  };` });
await pg.waitForFunction(() => window.__go, null, { timeout: 60000 });
console.log('retargeted', await pg.evaluate(() => window.__go()));
const d = await pg.evaluate(() => window.__img); (await import('node:fs')).writeFileSync('/tmp/claude-0/shots/freddyg.png', Buffer.from(d.split(',')[1], 'base64'));
console.log('errors', errs.slice(0, 5)); await br.close(); srv.close();
