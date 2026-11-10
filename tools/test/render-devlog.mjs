import { chromium } from 'playwright';
import http from 'node:http'; import { readFile, writeFile } from 'node:fs/promises'; import { join, extname } from 'node:path';
const ROOT = '/home/user/granny-x-dbd', HERE = new URL('.', import.meta.url).pathname;
const page0 = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="css/style.css"><style>html,body{overflow:hidden;background:#000}</style>
<script type="importmap">{ "imports": { "three": "./vendor/three/three.module.min.js", "three/addons/": "./vendor/three/addons/" } }</script></head><body>
<div style="font-family:'IM Fell English SC';position:absolute;opacity:0">x×</div><div style="font-family:'Bebas Neue';position:absolute;opacity:0">x</div><div style="font-family:'Barlow Condensed';font-weight:600;position:absolute;opacity:0">x</div>
<script type="module" src="__p.js"></script></body></html>`;
const srv = http.createServer(async (q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/public/__p.html') { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return r.end(page0); }
  if (u === '/public/__p.js') { r.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' }); return r.end(await readFile(join(HERE, 'devlog13-page.js'))); }
  try { const b = await readFile(join(ROOT, u)); r.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png' }[extname(u)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); }
}).listen(0);
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const pg = await br.newPage({ viewport: { width: 640, height: 360 } });
pg.on('pageerror', e => console.log('err', e.message)); pg.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); });
await pg.goto(`http://localhost:${srv.address().port}/public/__p.html`); await pg.waitForFunction(() => window.ready, null, { timeout: 60000 });
await pg.evaluate(() => window.setup());
const d = await pg.evaluate(() => window.frame(0));
await writeFile(join(HERE, 'devlog13.png'), Buffer.from(d.split(',')[1], 'base64'));
await br.close(); srv.close();
