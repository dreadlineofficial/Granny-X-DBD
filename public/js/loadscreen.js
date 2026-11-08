// The loading screen: a live 3D shot of Granny's House at night. Granny shuffles out of the dark
// towards the camera with her bat, stops to listen, then carries on; Spider Mom crawls past now and
// then; the porch lamps flicker. One WebGL renderer is kept for the whole session and only drawn while
// the screen is up.
import * as THREE from 'three';
import { loadGranny, makeGrannyGlb, animateGranny, loadSpiderMom, makeSpiderMom, grannyReady } from './grannyGlb.js';
import { loadScene, cloneScene, sceneReady } from './sceneGlb.js';

const $ = id => document.getElementById(id);
const TIPS = [
  'Granny hears you. Walking is quieter than running, and crouching is quieter still.',
  'Every hook gives a survivor a chance to be rescued. Stay close, but not too close.',
  'Flashlights blind Granny for a moment: aim for her face.',
  'Pallets and windows win chases. Do not waste them.',
  'Spider Mom crawls between generators. If she sees you, Granny knows.',
  "Grandpa's shotgun hits hardest from far away. Get close, or get behind something.",
  "Grandpa hides bear traps in the grass. Watch where you run.",
  "When Slendrina's eyes open, look away. The longer you stare, the worse it gets.",
  "Slendrina can step through walls. A wall between you is not as safe as it looks.",
  'Five generators power the exit gates. Work on them together to finish faster.',
];

let L = null; // { r, sc, cam, G, S, lamps, raf, t, last, on }
let shownAt = 0, want = false, text = 'Entering the fog…', lite = false;

function ui() {
  const el = $('loading');
  if (el.dataset.built) return el;
  el.dataset.built = '1';
  el.innerHTML = `<div class="ls-3d" id="ls-3d"></div><div class="ls-vig"></div><div class="ls-grain"></div>
    <div class="ls-hud"><div class="ls-name">Granny <i>×</i> DBD</div><div class="ls-msg" id="ls-msg"></div><div class="ls-bar"><i></i></div><div class="ls-tip" id="ls-tip"></div></div>`;
  return el;
}

// The set is drawn with the game's own renderer (one WebGL context for the whole app: a second one
// next to a match being built is what crashed the page on some PCs). The game and menu do not draw
// while this is up.
let getR = () => null;
function build() {
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x04060a); sc.fog = new THREE.FogExp2(0x0a0e16, 0.055);
  sc.add(new THREE.HemisphereLight(0x4a5878, 0x120a06, 0.7));
  const moon = new THREE.DirectionalLight(0xa8bce8, 1.8); moon.position.set(-14, 26, 22); moon.castShadow = !lite; moon.shadow.mapSize.set(1024, 1024);
  Object.assign(moon.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16 }); moon.target.position.set(0, 0, 18); sc.add(moon, moon.target);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ color: 0x161a12, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; sc.add(ground);
  const L0 = { rim: null, moon, sc, cam: new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.05, 200), G: null, S: null, lamps: [], raf: 0, t: 0, last: performance.now(), set: false };
  // the porch lamps (flicker) and a cold rim light behind her
  for (const [x, y, z, c, i] of [[1, 3, 15, 0xffa850, 22], [-6, 2.5, 8, 0xff9a40, 9], [6, 2.5, 4, 0xffa850, 9]]) { const l = new THREE.PointLight(c, i, 16, 1.5); l.position.set(x, y, z); l.userData.base = i; sc.add(l); L0.lamps.push(l); }
  const rim = new THREE.SpotLight(0x8fa8ff, 30, 18, 0.5, 0.6, 1.4); rim.position.set(0, 5, 12); rim.target.position.set(0, 1, 21); sc.add(rim, rim.target); L0.rim = rim;
  // a weak warm light in front of her, so her face comes out of the dark as she gets close
  const face = new THREE.PointLight(0xffb070, 5, 5, 1.6); sc.add(face); L0.face = face;
  return L0;
}

// the set needs the house and Granny: added as soon as they have loaded
function dress() {
  if (L.set || !sceneReady('granny_map') || !grannyReady()) return;
  L.set = true;
  const house = cloneScene('granny_map', lite); if (house) L.sc.add(house);
  L.G = makeGrannyGlb({}, lite);
  if (L.G) { L.sc.add(L.G.root); L.G.root.traverse(o => { if (o.isMesh) o.castShadow = !lite; }); }
  L.S = makeSpiderMom(lite); if (L.S) L.sc.add(L.S.root);
  $('ls-3d').classList.add('in'); shownAt = Date.now();
}

// Granny's walk: out of the porch light towards the camera, stop and listen, on again, then back into the dark
const CYCLE = 22;
function grannyAt(t) {
  const c = t % CYCLE;
  if (c < 7) return { z: 14 + c / 7 * 4.2, s: { speed: 1.1 } };
  if (c < 10.5) return { z: 18.2, s: { listen: true } };
  if (c < 17) return { z: 18.2 + (c - 10.5) / 6.5 * 3.6, s: { speed: 1.1 } };
  if (c < 19) return { z: 21.8, s: { speed: 0 } };
  return { z: 21.8, s: { speed: 0 }, dark: c > 20.6 }; // the lights cut out, and she is back on the porch
}

function frame(now) {
  if (!L || !want) { if (L) L.raf = 0; return; }
  const dt = Math.min(0.05, (now - L.last) / 1000); L.last = now; L.t += dt;
  dress();
  const t = L.t, cam = L.cam;
  // a slow handheld push-in, low to the ground
  cam.position.set(Math.sin(t * 0.21) * 0.35 + 1.1, 1.05 + Math.sin(t * 0.37) * 0.05, 27.2 - Math.min(1, t / 30) * 0.8);
  cam.lookAt(0.2, 1.45, 19);
  const g = grannyAt(t);
  for (const l of L.lamps) l.intensity = g.dark ? 0 : l.userData.base * (Math.random() < 0.04 ? 0.25 : 0.85 + Math.sin(t * 9 + l.position.x) * 0.08);
  L.rim.intensity = g.dark ? 0 : 30; L.moon.intensity = g.dark ? 0.15 : 1.8;
  if (L.G) { L.G.root.position.set(0, 0, g.z); L.G.root.rotation.y = 0;
    animateGranny(L.G, g.s, dt);
    L.face.position.set(0.6, 1.9, g.z + 1.8); L.face.intensity = g.dark ? 0 : 5 * (0.9 + Math.sin(t * 7) * 0.1);
  }
  if (L.S) {
    const c = (t + 6) % 16, on = c < 6;
    L.S.root.visible = on;
    if (on) { L.S.root.position.set(-7 + c / 6 * 14, 0, 16.5); L.S.root.rotation.y = Math.PI / 2; L.S.play('walk', dt); }
  }
  const r = getR();
  if (r) {
    cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
    const exp = r.toneMappingExposure, ac = r.autoClear;
    r.setRenderTarget(null); r.autoClear = true; r.toneMappingExposure = 1.5;
    try { r.render(L.sc, cam); } catch (e) { console.warn(e); }
    r.toneMappingExposure = exp; r.autoClear = ac;
    if (!L.drawn) { L.drawn = true; $('ls-3d').classList.add('drawn'); }
  }
  L.raf = requestAnimationFrame(frame);
}

let tipT = 0, tipI = Math.floor(Math.random() * TIPS.length);
function tip() { const el = $('ls-tip'); if (el) el.textContent = TIPS[tipI++ % TIPS.length]; }

export function showLoading(on, msg, isLite, rendererOf) {
  if (rendererOf) getR = rendererOf;
  const el = ui();
  if (msg) text = msg;
  $('ls-msg').textContent = text;
  if (on === want) return;
  want = on;
  el.classList.toggle('hidden', !on);
  if (!on) { clearInterval(tipT); return; }
  tip(); clearInterval(tipT); tipT = setInterval(tip, 6000);
  lite = !!isLite;
  try { if (!L) { L = build(); loadScene('granny_map'); loadGranny(); loadSpiderMom(); } } catch (e) { console.warn('loading scene unavailable', e); return; }
  L.last = performance.now();
  if (!L.raf) L.raf = requestAnimationFrame(frame);
}

export const loadingUp = () => want;
export const sceneShownAt = () => shownAt;