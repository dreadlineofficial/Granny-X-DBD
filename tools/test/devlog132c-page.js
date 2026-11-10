// 1.3.2 trailer thumbnail: no Freddy, the four killers ('pick your killer'), made from devlog132b-page.js
// 1.3.2 key art v2 (1280x720 at 2x): Granny in her legendary Freddy Fazbear skin in front of the house, bat up,
// the other three killers behind. frame('devlog') = devlog thumbnail, frame('thumb') = trailer thumbnail
import * as THREE from 'three';
import { makeKiller, animate } from './js/models.js';
import { loadRealism } from './js/realism.js';
import { skinOf } from './js/config.js';
import { loadScene, cloneScene } from './js/sceneGlb.js';
import { loadGranny, loadGrandpa, loadSlendrina, loadAngeline } from './js/grannyGlb.js';

const W = 1280, H = 720, SS = 2;
let R, sc, cam, logo, A = {};
function glowTex(c0, c1) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, c0); g.addColorStop(1, c1); x.fillStyle = g; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
window.setup = async () => {
  await Promise.all([loadScene('granny_map'), loadGranny(), loadGrandpa(), loadSlendrina(), loadAngeline()]);
  sc = new THREE.Scene(); sc.background = new THREE.Color(0x03040a); sc.fog = new THREE.FogExp2(0x070a12, 0.045);
  sc.add(new THREE.HemisphereLight(0x3a4666, 0x0e0806, 0.5));
  const moon = new THREE.DirectionalLight(0x9fb4e6, 1.1); moon.position.set(-14, 26, 30); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14 }); moon.target.position.set(0, 0, 18); sc.add(moon, moon.target);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x13160f, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; sc.add(ground);
  const house = cloneScene('granny_map', false); sc.add(house);
  const put = (id, x, z, yaw) => { const r = makeKiller(id, {}); r.root.position.set(x, 0, z); r.root.rotation.y = yaw; r.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); sc.add(r.root); return r; };
  A.granny = put('granny', 1.6, 22.2, -0.3);
  A.ang = put('angeline', 3.9, 21.3, -0.5);
  A.grandpa = put('grandpa', 5.9, 20.2, -0.65);
  A.slend = put('slendrina', 2.8, 19.4, -0.15);
  { const f = new THREE.PointLight(0xffe0c8, 14, 7, 1.6); f.position.set(5.0, 2.4, 23.0); sc.add(f); const f2 = new THREE.PointLight(0xdfe6ff, 8, 6, 1.6); f2.position.set(2.4, 2.2, 22.4); sc.add(f2); }
  // lights: a cold key on Angeline, red from the house, her yellow eyes
  const key = new THREE.SpotLight(0xdfe6ff, 60, 14, 0.5, 0.6, 1.4); key.position.set(4.5, 4.2, 25.5); key.target.position.set(1.6, 1.2, 21.4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); sc.add(key, key.target);
  const red = new THREE.PointLight(0xff2412, 22, 9, 1.6); red.position.set(1.6, 2.4, 16.2); sc.add(red);
  const back = new THREE.SpotLight(0xff3a20, 30, 14, 0.7, 0.6, 1.4); back.position.set(0.5, 3.5, 15.5); back.target.position.set(0.5, 1, 20); sc.add(back, back.target);
  const gtex = glowTex('rgba(255,240,170,1)', 'rgba(255,200,40,0)');
  // dust in the beams
  const n = 500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = -3 + Math.random() * 8; pos[i * 3 + 1] = Math.random() * 3.6; pos[i * 3 + 2] = 18 + Math.random() * 8; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sc.add(new THREE.Points(dg, new THREE.PointsMaterial({ map: gtex, color: 0xffe0a0, size: 0.03, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })));
  R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); R.setSize(W * SS, H * SS);
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.45; R.outputColorSpace = THREE.SRGBColorSpace;
  cam = new THREE.PerspectiveCamera(34, W / H, 0.05, 200);
  logo = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = 'img/granny-logo.png'; });
  await document.fonts.load('100px "Bebas Neue"'); await document.fonts.load('100px "IM Fell English SC"'); await document.fonts.load('600 40px "Barlow Condensed"');
  return true;
};
window.frame = (mode = 'devlog') => {
  const dt = 1 / 30;
  for (let i = 0; i < 40; i++) {
    animate(A.ang, { anim: 'idle', speed: 0 }, dt);
    animate(A.granny, { anim: 'idle', speed: 0, aim: true }, dt);
    animate(A.grandpa, { anim: 'idle', speed: 0, aim: true }, dt);
    animate(A.slend, { anim: 'idle', speed: 0 }, dt);
  }
  if (mode === 'thumb') { cam.position.set(0.2, 1.3, 28.0); cam.lookAt(2.4, 1.45, 20.0); } else { cam.position.set(-0.4, 1.3, 27.8); cam.lookAt(0.9, 1.45, 19.8); }
  cam.updateProjectionMatrix();
  R.render(sc, cam);
  const c = document.createElement('canvas'); c.width = W * SS; c.height = H * SS; const x = c.getContext('2d'); x.scale(SS, SS);
  x.imageSmoothingQuality = 'high'; x.drawImage(R.domElement, 0, 0, W, H);
  // darken the left for the words, vignette, bottom fade
  const g1 = x.createLinearGradient(0, 0, W * 0.6, 0); g1.addColorStop(0, 'rgba(0,0,0,.92)'); g1.addColorStop(0.7, 'rgba(0,0,0,.5)'); g1.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g1; x.fillRect(0, 0, W, H);
  const vg = x.createRadialGradient(W * 0.66, H * 0.48, H * 0.25, W * 0.66, H * 0.48, W * 0.72); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.7)'); x.fillStyle = vg; x.fillRect(0, 0, W, H);
  x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 16;
  const lw = 250, lh = lw * logo.height / logo.width; x.drawImage(logo, 56, 42, lw, lh);
  x.font = '66px "IM Fell English SC"'; x.fillStyle = '#e8241c'; x.fillText('×', 56 + lw + 14, 42 + lh * 0.82); x.fillStyle = '#efe6d6'; x.fillText('DBD', 56 + lw + 58, 42 + lh * 0.82);
  if (mode === 'thumb') {
    x.font = '600 30px "Barlow Condensed"'; x.letterSpacing = '8px'; x.fillStyle = '#e8241c'; x.fillText('UPDATE 1.3.2', 62, 250); x.letterSpacing = '0px';
    x.font = '168px "Bebas Neue"'; x.fillStyle = '#f2ebdf'; x.fillText('PICK YOUR', 52, 410); x.fillStyle = '#e8241c'; x.shadowColor = 'rgba(232,36,28,.35)'; x.shadowBlur = 30; x.fillText('KILLER.', 52, 566);
    x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 14;
    x.font = '600 28px "Barlow Condensed"'; x.letterSpacing = '4px'; x.fillStyle = '#d8cfc2'; x.fillText('GRANNY · GRANDPA · SLENDRINA · ANGELINE', 60, 620); x.letterSpacing = '0px';
  } else {
    x.font = '600 26px "Barlow Condensed"'; x.letterSpacing = '6px'; x.fillStyle = '#e8241c'; x.fillText('UPDATE 1.3.2', 60, 250); x.letterSpacing = '0px';
    x.font = '120px "Bebas Neue"'; x.fillStyle = '#f2ebdf'; x.fillText('FREDDY', 52, 362); x.fillStyle = '#e8241c'; x.shadowColor = 'rgba(232,36,28,.3)'; x.shadowBlur = 26; x.fillText('FAZBEAR', 52, 474);
    x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 14;
    x.font = '36px "Bebas Neue"'; x.fillStyle = '#f2ebdf'; x.fillText("GRANNY'S LEGENDARY SKIN · FIRST 10 DISCORD MEMBERS", 58, 520);
    const items = ['Play as Granny, Grandpa, Slendrina or Angeline', 'Gift outfits to friends with a code', 'Profile cards: avatar · banner · title · motto', 'Smarter bots'];
    x.font = '600 25px "Barlow Condensed"'; x.letterSpacing = '1px';
    items.forEach((s, i) => { const y = 572 + i * 36; x.fillStyle = '#e8241c'; x.fillRect(60, y - 13, 9, 9); x.fillStyle = '#d8cfc2'; x.fillText(s.toUpperCase(), 82, y); });
    x.letterSpacing = '0px';
  }
  return c.toDataURL('image/png');
};
window.ready = true;
