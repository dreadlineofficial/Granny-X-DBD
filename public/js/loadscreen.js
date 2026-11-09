// The loading screen: a live 3D reel in front of Granny's House at night. One killer at a time steps out of
// the dark under a swinging bulb (Granny, Grandpa, Slendrina, Angeline), with their name and powers on a
// card; the lights stutter out between them. God rays from the bulb, dust in the light, low fog.
// It is drawn with the game's own renderer (one WebGL context for the whole app: a second one next to a
// match being built is what crashed the page on some PCs). The game and menu do not draw while this is up.
import * as THREE from 'three';
import { loadGranny, loadGrandpa, loadSlendrina, loadAngeline, loadSpiderMom, grannyReady, grandpaReady, slendrinaReady, angelineReady } from './grannyGlb.js';
import { loadScene, cloneScene, sceneReady } from './sceneGlb.js';
import { makeKiller, animate } from './models.js';
import { KILLERS } from './config.js';

const $ = id => document.getElementById(id);
const TIPS = [
  'Granny hears you. Walking is quieter than running, and crouching is quieter still.',
  'Every hook gives a survivor a chance to be rescued. Stay close, but not too close.',
  'Flashlights blind the killer for a moment: aim for the face.',
  'Pallets and windows win chases. Do not waste them.',
  'Spider Mom crawls between generators. If she sees you, Granny knows.',
  "Grandpa's shotgun hits hardest from far away. Get close, or get behind something.",
  'Grandpa hides bear traps in the grass. Watch where you run.',
  "When Slendrina's eyes open, look away. The longer you stare, the worse it gets.",
  'Slendrina can step through walls. A wall between you is not as safe as it looks.',
  "Angeline's yellow eyes mark you. Step out of the light, sideways, fast.",
  "Heard Angeline humming? You won't be running for a few seconds. Hide instead.",
  "Granny's Old House is open: there is a generator inside.",
  'Five generators power the exit gates. Work on them together to finish faster.',
];
// the reel: who steps out, in what order, and what the card says
const REEL = [
  { id: 'granny', ready: grannyReady, st: { aim: true } },
  { id: 'grandpa', ready: grandpaReady, st: { aim: true } },
  { id: 'slendrina', ready: slendrinaReady, st: { gaze: true } },
  { id: 'angeline', ready: angelineReady, st: {} },
];
const SHOT = 5.6; // seconds per killer

let L = null;
let shownAt = 0, want = false, text = 'Entering the fog…', lite = false;

function ui() {
  const el = $('loading');
  if (el.dataset.built) return el;
  el.dataset.built = '1';
  el.innerHTML = `<div class="ls-3d" id="ls-3d"></div><div class="ls-vig"></div><div class="ls-grain"></div>
    <div class="ls-top"><div class="ls-logo"><span class="ls-granny"></span><i>×</i><b>DBD</b></div></div>
    <div class="ls-card" id="ls-card"><div class="ls-kname" id="ls-kname"></div><div class="ls-kpow" id="ls-kpow"></div></div>
    <div class="ls-hud"><div class="ls-msg" id="ls-msg"></div><div class="ls-bar"><i></i></div><div class="ls-tip" id="ls-tip"></div></div>`;
  return el;
}

let getR = () => null;
function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
function build() {
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x030409); sc.fog = new THREE.FogExp2(0x080b12, 0.05);
  sc.add(new THREE.HemisphereLight(0x3e4a68, 0x0e0806, 0.55));
  const moon = new THREE.DirectionalLight(0x9fb4e6, 1.3); moon.position.set(-14, 26, 22); moon.castShadow = !lite; moon.shadow.mapSize.set(1024, 1024);
  Object.assign(moon.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16 }); moon.target.position.set(0, 0, 18); sc.add(moon, moon.target);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ color: 0x14170f, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; sc.add(ground);
  const L0 = { sc, moon, cam: new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.05, 200), rigs: {}, raf: 0, t: 0, last: performance.now(), set: false, cur: -1 };
  const tex = glowTex();
  // the swinging bulb: a warm spot pointing down, its glow, and a cone of light through the fog
  const bulbG = new THREE.Group(); bulbG.position.set(0.4, 4.6, 20.6); sc.add(bulbG);
  const arm = new THREE.Group(); bulbG.add(arm);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.2, 4), new THREE.MeshBasicMaterial({ color: 0x111111 })); cord.position.y = -0.6; arm.add(cord);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffe2a8 })); bulb.position.y = -1.25; arm.add(bulb);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xffb860, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.setScalar(1.3); halo.position.y = -1.25; arm.add(halo);
  const spot = new THREE.SpotLight(0xffc888, 70, 14, 0.62, 0.55, 1.4); spot.position.y = -1.25; spot.castShadow = !lite; spot.shadow.mapSize.set(1024, 1024); arm.add(spot); const tgt = new THREE.Object3D(); tgt.position.y = -6; arm.add(tgt); spot.target = tgt;
  const rayGeo = new THREE.ConeGeometry(2.1, 3.4, 32, 1, true); rayGeo.translate(0, -1.7, 0);
  // the cone fades out at its edges (seen side-on) and towards the ground, so it reads as light in fog, not a shape
  const rayMat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(0xffb870) }, opacity: { value: 0.07 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vY = -position.y / 3.4; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 color; uniform float opacity; varying vec3 vN; varying vec3 vV; varying float vY;
      void main() { float face = pow(abs(dot(normalize(vN), normalize(vV))), 2.2); float fall = (1.0 - smoothstep(0.15, 1.0, vY)) * smoothstep(0.0, 0.08, vY);
        gl_FragColor = vec4(color * face * fall * opacity, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const rays = new THREE.Mesh(rayGeo, rayMat); rays.position.y = -1.3; arm.add(rays);
  Object.assign(L0, { arm, spot, halo, rays, bulb });
  // a red light from the house behind them, a cold rim from the side
  const red = new THREE.PointLight(0xff2a18, 18, 12, 1.5); red.position.set(0.2, 2.2, 16.6); sc.add(red); L0.red = red;
  const rim = new THREE.SpotLight(0x8fa8ff, 26, 18, 0.5, 0.6, 1.4); rim.position.set(-5, 4, 17); rim.target.position.set(0.4, 1, 20.6); sc.add(rim, rim.target); L0.rim = rim;
  // dust drifting in the light
  const n = lite ? 120 : 360, pos = new Float32Array(n * 3), seed = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { seed[i * 3] = Math.random(); seed[i * 3 + 1] = Math.random(); seed[i * 3 + 2] = Math.random(); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ map: tex, color: 0xffd8a0, size: 0.035, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  dust.frustumCulled = false; sc.add(dust); Object.assign(L0, { dust, dpos: pos, dseed: seed });
  // low fog sheets
  L0.fogs = [];
  for (let i = 0; i < (lite ? 1 : 3); i++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(40, 18), new THREE.MeshBasicMaterial({ map: tex, color: 0x8a96b0, transparent: true, opacity: 0.05, depthWrite: false }));
    f.rotation.x = -Math.PI / 2; f.position.set(0, 0.25 + i * 0.35, 20 + i); sc.add(f); L0.fogs.push(f);
  }
  return L0;
}

// the set needs the house; each killer joins the reel once their model has loaded
function dress() {
  if (!L.set && sceneReady('granny_map')) {
    L.set = true;
    const house = cloneScene('granny_map', lite); if (house) L.sc.add(house);
    $('ls-3d').classList.add('in'); shownAt = Date.now();
  }
  for (const k of REEL) if (!L.rigs[k.id] && k.ready()) {
    const R = makeKiller(k.id, {}); if (!R) continue;
    R.root.visible = false; R.root.traverse(o => { if (o.isMesh) o.castShadow = !lite; });
    L.sc.add(R.root); L.rigs[k.id] = R;
  }
}
function card(k) {
  const D = KILLERS[k.id], el = $('ls-card');
  if (!el || !D) return;
  $('ls-kname').textContent = D.name;
  $('ls-kpow').textContent = [D.ability && D.ability.name, D.ability2 && D.ability2.name, D.teleport && D.teleport.name].filter(Boolean).join('  ·  ');
}

function frame(now) {
  if (!L || !want) { if (L) L.raf = 0; return; }
  const dt = Math.min(0.05, (now - L.last) / 1000); L.last = now; L.t += dt;
  dress();
  const t = L.t, cam = L.cam;
  // whose turn (only killers already loaded)
  const ready = REEL.filter(k => L.rigs[k.id]);
  const slot = Math.floor(t / SHOT), k = ready.length ? ready[slot % ready.length] : null, u = (t % SHOT) / SHOT;
  if (k && (L.cur !== slot || L.curId !== k.id)) { L.cur = slot; L.curId = k.id; card(k); }
  // the card follows the reel's own clock (slides in as they arrive, fades as the lights go)
  const ce = $('ls-card');
  if (ce) { const a = !k ? 0 : Math.min(1, Math.max(0, (u - 0.04) / 0.08), Math.max(0, (0.93 - u) / 0.08)); ce.style.opacity = a; ce.style.transform = `translate(${(1 - a) * (u < 0.5 ? 30 : -10)}px, -50%)`; }
  // the lights stutter out as one leaves and the next arrives
  const cut = u < 0.06 || u > 0.94 ? 1 : 0, flick = Math.random() < 0.03 ? 0.3 : 1;
  for (const id in L.rigs) L.rigs[id].root.visible = !!k && id === k.id && !cut;
  if (k) {
    const R = L.rigs[k.id], walk = u < 0.42;
    R.root.position.set(0.4, 0, 18.4 + Math.min(u, 0.42) / 0.42 * 2.4); R.root.rotation.y = 0;
    animate(R, { anim: walk ? 'walk' : 'idle', speed: walk ? 1.1 : 0, ...(walk ? {} : k.st) }, dt);
    if (L.rigs[k.id].setOpacity && k.id === 'slendrina') R.setOpacity(0.86 + Math.sin(t * 19) * 0.1);
  }
  // camera: a slow push-in for each of them, low, a little handheld
  cam.position.set(1.0 + Math.sin(t * 0.23) * 0.25, 1.15 + Math.sin(t * 0.41) * 0.04, 27.4 - u * 1.6);
  cam.lookAt(0.4, 1.55, 19.5);
  // the bulb swings; lights follow the cut and the flicker
  L.arm.rotation.z = Math.sin(t * 1.25) * 0.22; L.arm.rotation.x = Math.sin(t * 0.9 + 1) * 0.08;
  const on = cut ? 0 : flick;
  L.spot.intensity = 70 * on; L.halo.material.opacity = on; L.rays.material.uniforms.opacity.value = 0.5 * on; L.bulb.visible = !!on;
  L.red.intensity = cut ? 4 : 18; L.rim.intensity = cut ? 0 : 26; L.moon.intensity = cut ? 0.25 : 1.3;
  // dust drifting through the cone of light
  const P = L.dpos, Sd = L.dseed, n = P.length / 3;
  for (let i = 0; i < n; i++) { const a = Sd[i * 3], b = Sd[i * 3 + 1], c = Sd[i * 3 + 2]; P[i * 3] = 0.4 + (a - 0.5) * 3.4 + Math.sin(t * 0.3 + c * 9) * 0.3; P[i * 3 + 1] = ((b * 4 + t * 0.06 * (0.5 + c)) % 4); P[i * 3 + 2] = 20.6 + (c - 0.5) * 3.4 + Math.cos(t * 0.25 + a * 7) * 0.3; }
  L.dust.geometry.attributes.position.needsUpdate = true; L.dust.material.opacity = 0.75 * on;
  for (let i = 0; i < L.fogs.length; i++) L.fogs[i].position.x = Math.sin(t * 0.05 + i * 2) * 4;
  const r = getR();
  if (r) {
    cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
    const exp = r.toneMappingExposure, ac = r.autoClear;
    r.setRenderTarget(null); r.autoClear = true; r.toneMappingExposure = 1.55;
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
  try { if (!L) { L = build(); loadScene('granny_map'); loadGranny(); loadGrandpa(); loadSlendrina(); loadAngeline(); loadSpiderMom(); } } catch (e) { console.warn('loading scene unavailable', e); return; }
  L.last = performance.now();
  if (!L.raf) L.raf = requestAnimationFrame(frame);
}

export const loadingUp = () => want;
window.__lsSeek = s => { if (L) L.t = s; return L && Object.keys(L.rigs).join(); }; // for screenshots: jump the reel to s seconds
export const sceneShownAt = () => shownAt;
