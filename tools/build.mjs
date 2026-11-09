// Builds Nightbound.html: one self-contained file (three.js, game code, CSS, fonts inlined)
// that runs when double-clicked, with no server needed.
//   cd tools && npm install && cd .. && node tools/build.mjs
import { build } from './node_modules/esbuild/lib/main.js';
import { readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');

const threeVendor = {
  name: 'three-vendor',
  setup(b) {
    b.onResolve({ filter: /^three$/ }, () => ({ path: join(pub, 'vendor/three/three.module.min.js') }));
    b.onResolve({ filter: /^three\/addons\// }, a => ({ path: join(pub, 'vendor/three/addons', a.path.slice('three/addons/'.length)) }));
  },
};

const res = await build({
  entryPoints: [join(pub, 'js/main.js')],
  bundle: true, format: 'iife', minify: true, write: false, target: 'es2020',
  plugins: [threeVendor], legalComments: 'none',
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

let css = await readFile(join(pub, 'css/style.css'), 'utf8');
for (const m of [...css.matchAll(/url\(\.\.\/fonts\/([\w.-]+\.woff2)\)/g)]) {
  const b64 = (await readFile(join(pub, 'fonts', m[1]))).toString('base64');
  css = css.replace(m[0], `url(data:font/woff2;base64,${b64})`);
}
const MIME = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };
for (const m of [...new Set([...css.matchAll(/url\(\.\.\/img\/([\w.-]+)\)/g)].map(x => x[0]))]) {
  const file = m.slice('url(../img/'.length, -1), b64 = (await readFile(join(pub, 'img', file))).toString('base64');
  css = css.split(m).join(`url(data:${MIME[file.split('.').pop()]};base64,${b64})`);
}

let html = await readFile(join(pub, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="css\/style.css">/, () => `<style>${css}</style>`);
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, '');
const peer = (await readFile(join(pub, 'vendor/peerjs.min.js'), 'utf8')).replace(/<\/script/gi, '<\\/script');
// the Foreman's rigged model as base64 in an inert tag placed before the game script (read by foremanGlb.js)
const extraGlb = ['ghosttrap', 'granny_map', 'granny1_map', 'slendrina', 'angeline', 'granny', 'granny_anims', 'grandpa', 'spidermom', 'beartrap', 'taser'].map(n => `<script id="nb-${n}-glb" type="application/octet-stream">${readFileSync(join(pub, 'models/' + n + '.glb')).toString('base64')}</script>\n`).join('');
const withModel = html.replace(/<script type="module" src="js\/main.js"><\/script>/, () => `${extraGlb}<script>${peer}</script>\n<script>${js}</script>`);
// the web build stays small: it fetches public/models/foreman.glb instead of embedding it
const web = html.replace(/<script type="module" src="js\/main.js"><\/script>/, () => `<script>${peer}</script>\n<script>${js}</script>`);
const note = `<title>Granny x DBD</title>\n  <!-- Built file: everything is inlined. Source lives in public/. -->\n  <script>window.__NB_BUILT__=${Date.now()}</script>`;
const offline = withModel.replace('<title>Granny x DBD</title>', note), page = web.replace('<title>Granny x DBD</title>', note);
await writeFile(join(root, 'GrannyDBD.html'), offline);
await writeFile(join(root, 'index.html'), page); // GitHub Pages entry point
console.log(`GrannyDBD.html ${(offline.length / 1048576).toFixed(2)} MB, index.html ${(page.length / 1048576).toFixed(2)} MB`);
