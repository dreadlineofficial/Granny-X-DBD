// 1.3.2 trailer thumbnail, 'proper trailer' key art: Granny huge in the foreground with the bat up, the other three killers
// backlit in the fog behind her, logo + OFFICIAL TRAILER. frame('thumb'). (made from devlog132c-page.js)
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
  sc = new THREE.Scene(); sc.background = new THREE.Color(0x05070c); sc.fog = new THREE.FogExp2(0x0b0f17, 0.055);
  sc.add(new THREE.HemisphereLight(0x34405c, 0x0e0806, 0.35));
  const moon = new THREE.DirectionalLight(0x9fb4e6, 0.6); moon.position.set(-14, 26, 30); sc.add(moon);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x13160f, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; sc.add(ground);
  sc.add(cloneScene('granny_map', false));
  const put = (id, x, z, yaw) => { const r = makeKiller(id, {}); r.root.position.set(x, 0, z); r.root.rotation.y = yaw; r.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); sc.add(r.root); return r; };
  A.granny = put('granny', 2.05, 22.7, -0.42);
  A.slend = put('slendrina', -0.4, 17.6, 0.2);
  A.ang = put('angeline', 0.75, 16.6, -0.3);
  A.grandpa = put('grandpa', 2.35, 17.2, -0.2);
  // Granny: a cold key from the front left, a hard red rim from behind right, a faint warm fill under the face
  const key = new THREE.SpotLight(0xd8e2ff, 55, 9, 0.42, 0.7, 1.5); key.position.set(-0.6, 2.6, 25.6); key.target.position.set(2.0, 1.5, 22.7); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); sc.add(key, key.target);
  const rim = new THREE.SpotLight(0xff2a14, 140, 8, 0.5, 0.5, 1.4); rim.position.set(3.6, 2.4, 20.2); rim.target.position.set(2.0, 1.5, 22.7); sc.add(rim, rim.target);
  const rim2 = new THREE.SpotLight(0xff3a20, 60, 7, 0.6, 0.5, 1.4); rim2.position.set(0.6, 2.0, 20.6); rim2.target.position.set(2.0, 1.2, 22.7); sc.add(rim2, rim2.target);
  const fill = new THREE.PointLight(0xffb070, 1.6, 3, 2); fill.position.set(1.6, 0.9, 23.6); sc.add(fill);
  // the three behind her: backlit through the fog (a light behind each, aimed at us), so they read as silhouettes
  const gtex = glowTex('rgba(200,220,255,1)', 'rgba(120,150,255,0)');
  for (const [x, z, col] of [[-0.4, 15.8, 0xbcd0ff], [0.75, 14.8, 0xffe08a], [2.35, 15.4, 0xbcd0ff]]) {
    const b = new THREE.SpotLight(col, 50, 9, 0.7, 0.8, 1.3); b.position.set(x, 2.6, z); b.target.position.set(x * 0.6, 1.0, 25); sc.add(b, b.target);
    const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: gtex, color: col, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); h.position.set(x, 1.7, z - 0.4); h.scale.setScalar(3.2); sc.add(h);
  }
  { const f = new THREE.SpotLight(0xaebfe8, 22, 10, 0.55, 0.8, 1.3); f.position.set(0.6, 2.2, 21.5); f.target.position.set(0.6, 1.5, 16.6); sc.add(f, f.target); } // a faint front light: their faces show through the fog
  // dust in the light
  const n = 700, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = -4 + Math.random() * 9; pos[i * 3 + 1] = Math.random() * 3.4; pos[i * 3 + 2] = 15 + Math.random() * 10; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sc.add(new THREE.Points(dg, new THREE.PointsMaterial({ map: gtex, color: 0xe0e8ff, size: 0.025, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending })));
  R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); R.setSize(W * SS, H * SS);
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.6; R.outputColorSpace = THREE.SRGBColorSpace;
  cam = new THREE.PerspectiveCamera(38, W / H, 0.05, 200);
  logo = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = 'img/granny-logo.png'; });
  await document.fonts.load('100px "Bebas Neue"'); await document.fonts.load('100px "IM Fell English SC"'); await document.fonts.load('600 40px "Barlow Condensed"');
  return true;
};
window.frame = (mode = 'devlog') => {
  const dt = 1 / 30;
  for (let i = 0; i < 40; i++) {
    animate(A.ang, { anim: 'idle', speed: 0 }, dt);
    animate(A.granny, { anim: 'idle', speed: 0, aim: true }, dt);
    animate(A.grandpa, { anim: 'idle', speed: 0 }, dt);
    animate(A.slend, { anim: 'idle', speed: 0 }, dt);
  }
  if (mode === 'thumb') { cam.position.set(0.35, 1.45, 26.1); cam.lookAt(0.95, 1.5, 18.0); } else { cam.position.set(-0.4, 1.3, 27.8); cam.lookAt(0.9, 1.45, 19.8); }
  cam.updateProjectionMatrix();
  R.render(sc, cam);
  const c = document.createElement('canvas'); c.width = W * SS; c.height = H * SS; const x = c.getContext('2d'); x.scale(SS, SS);
  x.imageSmoothingQuality = 'high'; x.drawImage(R.domElement, 0, 0, W, H);
  // darken the left for the words, vignette, bottom fade
  // grade: cool shadows, a touch of warmth, then the left side darkened for the title
  x.globalCompositeOperation = 'soft-light'; x.fillStyle = 'rgba(20,70,90,.55)'; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'source-over';
  const g1 = x.createLinearGradient(0, 0, W * 0.58, 0); g1.addColorStop(0, 'rgba(0,0,0,.88)'); g1.addColorStop(0.65, 'rgba(0,0,0,.45)'); g1.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g1; x.fillRect(0, 0, W, H);
  const vg = x.createRadialGradient(W * 0.6, H * 0.45, H * 0.3, W * 0.6, H * 0.45, W * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.75)'); x.fillStyle = vg; x.fillRect(0, 0, W, H);
  // title block
  x.shadowColor = 'rgba(0,0,0,.95)'; x.shadowBlur = 22;
  const lw = 400, lh = lw * logo.height / logo.width, ly = 150; x.drawImage(logo, 58, ly, lw, lh);
  x.font = '96px "IM Fell English SC"'; x.fillStyle = '#e8241c'; x.fillText('×', 60, ly + lh + 92); x.fillStyle = '#efe6d6'; x.fillText('DBD', 128, ly + lh + 92);
  x.shadowBlur = 0;
  const by = ly + lh + 132; x.font = '64px "Bebas Neue"'; x.letterSpacing = '6px'; const tw = x.measureText('OFFICIAL TRAILER').width;
  x.fillStyle = '#d61f1f'; x.fillRect(58, by, tw + 44, 82); x.fillStyle = '#fff'; x.fillText('OFFICIAL TRAILER', 80, by + 64);
  x.font = '600 30px "Barlow Condensed"'; x.letterSpacing = '9px'; x.fillStyle = '#e8ddd0'; x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 12; x.fillText('UPDATE 1.3.2', 62, by + 128); x.letterSpacing = '0px';
  // film grain
  const gr = x.getImageData(0, 0, W * SS, H * SS), d = gr.data;
  for (let i = 0; i < d.length; i += 4) { const k = (Math.random() - 0.5) * 14; d[i] += k; d[i + 1] += k; d[i + 2] += k; }
  x.putImageData(gr, 0, 0);
  return c.toDataURL('image/png');
};
window.ready = true;
