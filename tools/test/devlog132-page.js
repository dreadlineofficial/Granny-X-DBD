// 1.3.2 key art (rendered in-engine): the four survivors scattering in front of Granny's House, Granny behind them
// with the bat up. window.frame('devlog') = the devlog thumbnail (1280x720 at 2x), window.frame('thumb') = the
// trailer's YouTube thumbnail (1280x720). Nothing about the secret outfit.
import * as THREE from 'three';
import { makeKiller, makeSurvivor, animate } from './js/models.js';
import { loadScene, cloneScene } from './js/sceneGlb.js';
import { loadGranny } from './js/grannyGlb.js';
import { SURVIVORS, skinOf } from './js/config.js';

const W = 1280, H = 720, SS = 2;
let R, sc, cam, logo, A = {};
function glowTex(c0, c1) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, c0); g.addColorStop(1, c1); x.fillStyle = g; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
window.setup = async () => {
  await Promise.all([loadScene('granny_map'), loadGranny()]);
  sc = new THREE.Scene(); sc.background = new THREE.Color(0x03040a); sc.fog = new THREE.FogExp2(0x070a12, 0.04);
  sc.add(new THREE.HemisphereLight(0x3a4666, 0x0e0806, 0.55));
  const moon = new THREE.DirectionalLight(0x9fb4e6, 1.2); moon.position.set(-14, 26, 30); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14 }); moon.target.position.set(0, 0, 20); sc.add(moon, moon.target);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x13160f, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; sc.add(ground);
  sc.add(cloneScene('granny_map', false));
  const shadows = r => r.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  A.granny = makeKiller('granny', {}); A.granny.root.position.set(1.4, 0, 18.6); A.granny.root.rotation.y = 0.15; shadows(A.granny); sc.add(A.granny.root);
  // they split up: four directions
  const S = [['mara', 2.9, 21.2, -2.0], ['eli', 4.6, 23.4, 1.9], ['june', 0.6, 24.6, 2.9], ['tomas', 6.9, 20.4, 0.9]];
  A.surv = S.map(([id, x, z, yaw]) => { const r = makeSurvivor(SURVIVORS[id], skinOf(id, 'default')); r.root.position.set(x, 0, z); r.root.rotation.y = yaw; shadows(r); sc.add(r.root); return r; });
  // lights: a cold key from the front, red from the house behind Granny, a warm porch bulb
  const key = new THREE.SpotLight(0xdfe6ff, 70, 18, 0.6, 0.6, 1.4); key.position.set(3.5, 5, 28); key.target.position.set(0.6, 1, 22); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); sc.add(key, key.target);
  const red = new THREE.PointLight(0xff2412, 26, 9, 1.6); red.position.set(1.4, 2.4, 16.0); sc.add(red);
  const back = new THREE.SpotLight(0xff3a20, 36, 14, 0.7, 0.6, 1.4); back.position.set(1.0, 3.6, 15.2); back.target.position.set(1.4, 1, 19); sc.add(back, back.target);
  const bulb = new THREE.PointLight(0xffc070, 8, 8, 1.6); bulb.position.set(-2.5, 3.2, 17.5); sc.add(bulb);
  const gtex = glowTex('rgba(255,220,170,1)', 'rgba(255,160,60,0)');
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: gtex, color: 0xffb060, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })); halo.position.copy(bulb.position); halo.scale.setScalar(0.9); sc.add(halo);
  const n = 500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = -5 + Math.random() * 11; pos[i * 3 + 1] = Math.random() * 3.6; pos[i * 3 + 2] = 17 + Math.random() * 9; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sc.add(new THREE.Points(dg, new THREE.PointsMaterial({ map: gtex, color: 0xffe0b0, size: 0.03, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })));
  R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); R.setSize(W * SS, H * SS);
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.5; R.outputColorSpace = THREE.SRGBColorSpace;
  cam = new THREE.PerspectiveCamera(36, W / H, 0.05, 200);
  logo = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = 'img/granny-logo.png'; });
  await document.fonts.load('100px "Bebas Neue"'); await document.fonts.load('100px "IM Fell English SC"'); await document.fonts.load('600 40px "Barlow Condensed"');
  return true;
};
window.frame = (mode = 'devlog') => {
  const dt = 1 / 30;
  for (let i = 0; i < 40; i++) {
    animate(A.granny, { anim: 'idle', speed: 0, aim: true }, dt);
    A.surv.forEach((r, k) => animate(r, { anim: k === 2 ? 'crouch' : 'run', speed: k === 2 ? 1.2 : 4.5, t: i * dt + k * 0.37 }, dt));
  }
  if (mode === 'thumb') { cam.position.set(1.9, 1.15, 26.2); cam.lookAt(0.6, 1.55, 19.6); cam.fov = 36; }
  else { cam.position.set(-0.9, 1.45, 28.6); cam.lookAt(1.2, 1.35, 20.4); cam.fov = 42; }
  cam.updateProjectionMatrix();
  R.render(sc, cam);
  const c = document.createElement('canvas'); c.width = W * SS; c.height = H * SS; const x = c.getContext('2d'); x.scale(SS, SS);
  x.imageSmoothingQuality = 'high'; x.drawImage(R.domElement, 0, 0, W, H);
  const g1 = x.createLinearGradient(0, 0, W * 0.62, 0); g1.addColorStop(0, 'rgba(0,0,0,.92)'); g1.addColorStop(0.7, 'rgba(0,0,0,.45)'); g1.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g1; x.fillRect(0, 0, W, H);
  const vg = x.createRadialGradient(W * 0.66, H * 0.5, H * 0.25, W * 0.66, H * 0.5, W * 0.72); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.7)'); x.fillStyle = vg; x.fillRect(0, 0, W, H);
  x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 16;
  const lw = mode === 'thumb' ? 210 : 250, lh = lw * logo.height / logo.width; x.drawImage(logo, 56, 42, lw, lh);
  x.font = `${Math.round(lw * 0.26)}px "IM Fell English SC"`; x.fillStyle = '#e8241c'; x.fillText('×', 56 + lw + 14, 42 + lh * 0.82); x.fillStyle = '#efe6d6'; x.fillText('DBD', 56 + lw + lw * 0.23, 42 + lh * 0.82);
  if (mode === 'thumb') {
    // big and short: it has to read at phone size
    x.font = '600 30px "Barlow Condensed"'; x.letterSpacing = '8px'; x.fillStyle = '#e8241c'; x.fillText('UPDATE 1.3.2', 62, 262); x.letterSpacing = '0px';
    x.font = '178px "Bebas Neue"'; x.fillStyle = '#f2ebdf'; x.fillText('THEY GOT', 52, 430); x.fillStyle = '#e8241c'; x.shadowColor = 'rgba(232,36,28,.35)'; x.shadowBlur = 30; x.fillText('SMARTER.', 52, 590);
  } else {
    x.font = '600 26px "Barlow Condensed"'; x.letterSpacing = '6px'; x.fillStyle = '#e8241c'; x.fillText('UPDATE 1.3.2', 60, 250); x.letterSpacing = '0px';
    x.font = '150px "Bebas Neue"'; x.fillStyle = '#f2ebdf'; x.fillText('THEY GOT', 52, 384); x.fillStyle = '#e8241c'; x.shadowColor = 'rgba(232,36,28,.3)'; x.shadowBlur = 26; x.fillText('SMARTER.', 52, 520);
    x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 14;
    const items = ['Smarter bots: they split up, loop and heal', 'Profile cards: avatar · banner · title · motto', 'Gift outfits to friends with a code', 'Ground Slam can only injure now'];
    x.font = '600 25px "Barlow Condensed"'; x.letterSpacing = '1px';
    items.forEach((s, i) => { const y = 572 + i * 36; x.fillStyle = '#e8241c'; x.fillRect(60, y - 13, 9, 9); x.fillStyle = '#d8cfc2'; x.fillText(s.toUpperCase(), 82, y); });
    x.letterSpacing = '0px';
  }
  return c.toDataURL('image/png');
};
window.ready = true;
