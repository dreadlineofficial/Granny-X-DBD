// 1.3.3 devlog banner (rendered in-engine): the new map, Slendrina's Graveyard. Slendrina waits in front of the
// ruined church, two survivors run for it. window.frame() = 1280x720 at 2x.
import * as THREE from 'three';
import { makeKiller, makeSurvivor, animate } from './js/models.js';
import { loadSlendrina } from './js/grannyGlb.js';
import { buildMap } from './js/map.js';
import { buildWorld } from './js/world.js';
import { updateThemeFx } from './js/themeworld.js';
import { SURVIVORS, skinOf } from './js/config.js';

const W = 1280, H = 720, SS = 2;
let R, sc, cam, logo, A = {}, P;
window.setup = async () => {
  await loadSlendrina();
  const M = buildMap(7, 'grave');
  // the church sits in the middle cell; work in its frame (it is turned 0 or 180 degrees)
  const tw = M.boxes.find(b => b.kind === 'tower'), flip = tw.z < 0 ? -1 : 1;
  const ch = { x: tw.x - 7.2 * flip, z: tw.z - 7.0 * flip };
  P = (x, z) => [ch.x + x * flip, ch.z + z * flip];
  // keep the spots where the figures stand clear of scattered headstones / trees
  const spots = [P(0.4, -7.6), P(1.6, -10.6), P(-1.0, -9.9), P(2.2, -15.6), P(1, -14)];
  const clear = o => spots.every(([x, z]) => Math.hypot(o.x - x, o.z - z) > 2.4);
  for (const k of ['props', 'trees', 'rocks', 'circles']) M[k] = M[k].filter(o => o.kind === 'cage' || o.kind === 'chest' || o.prop === 'lantern' || clear(o));
  // a few graves in shot
  const yaw0 = flip > 0 ? Math.PI : 0;
  for (const [lx0, lz0, kind, dy] of [[-2.6, -8.6, 'headstone', 0.15], [-3.4, -6.7, 'cross', 0.3], [3.6, -8.8, 'headstone', 0.1], [2.8, -6.9, 'cross', -0.25], [-1.9, -7.0, 'headstone', -0.1]]) {
    const [x, z] = P(lx0, lz0); M.props.push({ x, z, r: 0.3, h: 1.15, kind: 'prop', prop: kind, rot: yaw0 + dy, s: 1 });
  }
  const Wd = buildWorld(M, 'high'); sc = Wd.scene;
  const shadows = r => r.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  A.k = makeKiller('slendrina', {}); A.k.root.position.set(...[spots[0][0], 0, spots[0][1]]); A.k.root.rotation.y = (flip > 0 ? Math.PI : 0) + 0.25; shadows(A.k); sc.add(A.k.root);
  const S = [['june', spots[1], 0.35], ['tomas', spots[2], -0.3]];
  A.surv = S.map(([id, [x, z], yaw]) => { const r = makeSurvivor(SURVIVORS[id], skinOf(id, 'default')); r.root.position.set(x, 0, z); r.root.rotation.y = (flip > 0 ? Math.PI : 0) + yaw; shadows(r); sc.add(r.root); return r; });
  // lights: cold moon from behind the church, warm lanterns by the door, a pale key on Slendrina
  Wd.moon.position.set(ch.x + 20 * flip, 40, ch.z + 30 * flip); Wd.moon.target.position.set(ch.x, 0, ch.z - 8 * flip);
  const [lx, lz] = P(0, -6.8);
  const warm = new THREE.PointLight(0xffa050, 18, 10, 1.6); warm.position.set(lx, 1.8, lz); sc.add(warm);
  const [kx, kz] = P(-0.5, -14);
  const key = new THREE.SpotLight(0xc8d8ff, 30, 16, 0.3, 0.7, 1.4); key.position.set(kx, 6.5, kz); key.target.position.set(spots[0][0], 1.2, spots[0][1]); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); sc.add(key, key.target);
  const [rx, rz] = P(1.5, -4.5);
  const rim = new THREE.SpotLight(0x7fa8ff, 40, 12, 0.7, 0.6, 1.4); rim.position.set(rx, 3.5, rz); rim.target.position.set(spots[0][0], 1.2, spots[0][1]); sc.add(rim, rim.target);
  updateThemeFx(Wd, 2, 1 / 30, { x: spots[0][0], z: spots[0][1] });
  R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); R.setSize(W * SS, H * SS);
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.55; R.outputColorSpace = THREE.SRGBColorSpace;
  cam = new THREE.PerspectiveCamera(40, W / H, 0.05, 300);
  logo = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = 'img/granny-logo.png'; });
  await document.fonts.load('100px "Bebas Neue"'); await document.fonts.load('100px "IM Fell English SC"'); await document.fonts.load('600 40px "Barlow Condensed"');
  return true;
};
window.frame = (mode) => {
  const dt = 1 / 30;
  for (let i = 0; i < 40; i++) {
    animate(A.k, { anim: 'idle', speed: 0, aim: true }, dt);
    A.surv.forEach((r, k) => animate(r, { anim: 'run', speed: 4.5, t: i * dt + k * 0.41 }, dt));
  }
  const [cx, cz] = P(2.2, -15.6), [tx, tz] = P(2.0, -7);
  cam.position.set(cx, 1.45, cz); cam.lookAt(tx, 2.4, tz); cam.updateProjectionMatrix();
  R.render(sc, cam);
  if (mode === 'raw') return R.domElement.toDataURL('image/png');
  const c = document.createElement('canvas'); c.width = W * SS; c.height = H * SS; const x = c.getContext('2d'); x.scale(SS, SS);
  x.imageSmoothingQuality = 'high'; x.drawImage(R.domElement, 0, 0, W, H);
  const g1 = x.createLinearGradient(0, 0, W * 0.62, 0); g1.addColorStop(0, 'rgba(0,0,0,.92)'); g1.addColorStop(0.7, 'rgba(0,0,0,.42)'); g1.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g1; x.fillRect(0, 0, W, H);
  const vg = x.createRadialGradient(W * 0.66, H * 0.5, H * 0.25, W * 0.66, H * 0.5, W * 0.72); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.65)'); x.fillStyle = vg; x.fillRect(0, 0, W, H);
  x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 16;
  const lw = 250, lh = lw * logo.height / logo.width; x.drawImage(logo, 56, 42, lw, lh);
  x.font = `${Math.round(lw * 0.26)}px "IM Fell English SC"`; x.fillStyle = '#e8241c'; x.fillText('×', 56 + lw + 14, 42 + lh * 0.82); x.fillStyle = '#efe6d6'; x.fillText('DBD', 56 + lw + lw * 0.23, 42 + lh * 0.82);
  x.font = '600 26px "Barlow Condensed"'; x.letterSpacing = '6px'; x.fillStyle = '#e8241c'; x.fillText('UPDATE 1.3.3', 60, 250); x.letterSpacing = '0px';
  x.font = '128px "Bebas Neue"'; x.fillStyle = '#f2ebdf'; x.fillText('THE GRAVEYARD', 52, 366); x.fillStyle = '#e8241c'; x.shadowColor = 'rgba(232,36,28,.3)'; x.shadowBlur = 26; x.fillText('IS OPEN.', 52, 482);
  x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 14;
  const items = ["New map: Slendrina's Graveyard", 'Phones: button icons · move your controls · tap-anywhere skill checks', 'Optimization mode for slower PCs and phones', 'Smoother loading, fewer freezes', 'Freddy outfit: taller, swings his paws'];
  x.font = '600 23px "Barlow Condensed"'; x.letterSpacing = '1px';
  items.forEach((s, i) => { const y = 536 + i * 33; x.fillStyle = '#e8241c'; x.fillRect(60, y - 13, 9, 9); x.fillStyle = '#d8cfc2'; x.fillText(s.toUpperCase(), 82, y); });
  x.letterSpacing = '0px';
  return c.toDataURL('image/png');
};
window.ready = true;
