// Granny (Granny chapter, fan-made crossover).
//  - Model: "Granny official model pc (Granny 3)" by alessio.fnf.bf (sketchfab.com/alessio.fnf.bf),
//    CC BY 4.0: a clean T-posed rig with no animations.
//  - Animations: from "Granny (7)" by Yandu27 (sketchfab.com/Yandu27), CC BY 4.0 (its skin is
//    broken, so only its skeleton and clips are kept: granny_anims.glb). Both use the game's Bip01
//    skeleton: the clips play on an invisible copy of that skeleton and every bone of the model
//    follows it (world-space rotation from rest), so she moves with her own animations: idle, Walk,
//    Hit (bat swing), arrowHit (staggered), pepperHit (blinded), freezeTrap, Look, lookBed (bending).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { auraSkinMat } from './foremanGlb.js';
import { GFX } from './gfx.js';

const M = {}, loading = {}, waiters = {};
async function bytes(name) {
  const el = document.getElementById('nb-' + name + '-glb');
  if (el && el.textContent.trim()) { const s = atob(el.textContent.trim()), b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b.buffer; }
  const dev = !!document.querySelector('script[type=importmap]');
  let last;
  for (const url of dev ? [`models/${name}.glb`, `public/models/${name}.glb`] : [`public/models/${name}.glb`, `models/${name}.glb`]) {
    try { const r = await fetch(url); if (r.ok) return await r.arrayBuffer(); last = new Error(url + ' ' + r.status); } catch (e) { last = e; }
  }
  throw last;
}
// height (m) and which way the raw model faces
const SPEC = { granny: { h: 1.82, yaw: 0 }, granny_anims: { anim: true }, grandpa: { h: 1.86, yaw: 0 }, spidermom: { h: 1.15, yaw: 0 }, slendrina: { h: 1.95, yaw: 0 }, angeline: { h: 1.88, yaw: Math.PI } };
function load(name) {
  if (loading[name]) return loading[name];
  loading[name] = bytes(name).then(buf => new Promise((res, rej) => new GLTFLoader().parse(buf, '', res, rej))).then(g => {
    const S = SPEC[name];
    if (S.anim) { M[name] = { g }; return M[name]; }
    if (name === 'angeline') { toBindPose(g.scene); } // animated in code from her T-pose (see animateAngeline)
    // measure in the first frame of the idle clip (the rest pose isn't a standing pose)
    const probe = cloneSkinned(g.scene), mx = new THREE.AnimationMixer(probe);
    const idle = name === 'angeline' ? null : g.animations.find(c => /^idle$/i.test(c.name)) || g.animations[0];
    if (idle) { mx.clipAction(idle).play(); mx.update(0); }
    probe.updateMatrixWorld(true);
    if (name === 'slendrina') seatHair(probe, g.scene);
    const box = new THREE.Box3();
    probe.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); box.union(o.isSkinnedMesh ? skinnedBox(o) : new THREE.Box3().copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld)); } });
    const h = box.max.y - box.min.y, k = S.h / h, c = box.getCenter(new THREE.Vector3());
    M[name] = { g, fit: { s: k, x: -c.x * k, y: -box.min.y * k, z: -c.z * k }, yaw: S.yaw };
    for (const cb of (waiters[name] || []).splice(0)) { try { cb(); } catch (e) { console.error(e); } }
    return M[name];
  }).catch(e => { console.warn(name + ' model unavailable:', e); return null; });
  return loading[name];
}
// Angeline's file: the skeleton's bind matrices are about 1.8x taller than the mesh (an FBX conversion left a stretched
// node in between), so every joint sits above the part of her it moves and turning a bone swings that part around the
// wrong point. Measure the stretch from the mesh itself (where each bone meets its parent, against where the bind matrices
// put that joint), take it out of the bind matrices, and put the skeleton into that corrected T-pose.
function toBindPose(scene) {
  scene.updateMatrixWorld(true);
  scene.traverse(o => {
    if (!o.isSkinnedMesh) return;
    const sk = o.skeleton, P = o.geometry.attributes.position, J = o.geometry.attributes.skinIndex, W = o.geometry.attributes.skinWeight;
    // joints in the mesh: the middle of the vertices shared by a bone and its parent
    const acc = new Map();
    for (let i = 0; i < P.count; i++) {
      const inf = []; for (let k = 0; k < 4; k++) if (W.getComponent(i, k) > 0.15) inf.push(J.getComponent(i, k));
      for (const a of inf) for (const b of inf) if (sk.bones[a].parent === sk.bones[b]) { const e = acc.get(a) || [0, 0, 0, 0]; e[0] += P.getX(i); e[1] += P.getY(i); e[2] += P.getZ(i); e[3]++; acc.set(a, e); }
    }
    // per axis, a least-squares line from the bind matrices' joints to the mesh's
    const pairs = [];
    for (const [j, e] of acc) if (e[3] >= 6) pairs.push([new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(sk.boneInverses[j]).invert()), [e[0] / e[3], e[1] / e[3], e[2] / e[3]]]);
    const fit = ax => {
      const n = pairs.length; let sx = 0, sy = 0, sxx = 0, sxy = 0;
      for (const [p, c] of pairs) { const x = p.getComponent(ax), y = c[ax]; sx += x; sy += y; sxx += x * x; sxy += x * y; }
      const den = n * sxx - sx * sx; let a = Math.abs(den) > 1e-9 ? (n * sxy - sx * sy) / den : 1;
      if (!(a > 0.2 && a < 5)) a = 1;
      return [a, (sy - a * sx) / n];
    };
    const [fx, fy, fz] = [0, 1, 2].map(fit);
    const K = pairs.length >= 6 ? new THREE.Matrix4().set(fx[0], 0, 0, fx[1], 0, fy[0], 0, fy[1], 0, 0, fz[0], fz[1], 0, 0, 0, 1) : new THREE.Matrix4();
    const Ki = new THREE.Matrix4().copy(K).invert();
    const bind = new Map();
    sk.bones.forEach((b, i) => {
      const w = new THREE.Matrix4().copy(sk.boneInverses[i]).invert().premultiply(K); // joint where the mesh has it
      bind.set(b, w); sk.boneInverses[i].copy(w).invert();                           // = IBM * K^-1: the mesh stays put
    });
    const m = new THREE.Matrix4();
    for (const b of sk.bones) {
      if (bind.has(b.parent)) m.copy(bind.get(b.parent)).invert().multiply(bind.get(b));
      else m.copy(b.parent.matrixWorld).invert().multiply(bind.get(b)); // the top bone
      m.decompose(b.position, b.quaternion, b.scale);
    }
  });
  scene.updateMatrixWorld(true);
}
// bounding box of a skinned mesh as currently posed
function skinnedBox(m) {
  const b = new THREE.Box3(), v = new THREE.Vector3(), P = m.geometry.attributes.position;
  for (let i = 0; i < P.count; i += 3) { v.fromBufferAttribute(P, i); m.applyBoneTransform(i, v); v.applyMatrix4(m.matrixWorld); b.expandByPoint(v); }
  return b;
}
// Slendrina's hair mesh sits above her head in the file: move it down onto her head (in the template)
function seatHair(probe, scene) {
  let hairP = null, hairT = null, body = null;
  probe.traverse(o => { if (o.isMesh && /hair/i.test(o.name)) hairP = o; if (o.isSkinnedMesh) body = o; });
  scene.traverse(o => { if (o.isMesh && /hair/i.test(o.name)) hairT = o; });
  if (!hairP || !hairT || !body) return;
  const bb = skinnedBox(body), hb = new THREE.Box3().setFromObject(hairP);
  const headTop = bb.max.y, drop = hb.max.y - (headTop + (bb.max.y - bb.min.y) * 0.015);
  // the offset is in world units: convert into the hair's parent space
  const w = hairT.parent.getWorldScale(new THREE.Vector3()), p = hairT.parent;
  const dLocal = p.worldToLocal(new THREE.Vector3(hb.getCenter(new THREE.Vector3()).x, hb.getCenter(new THREE.Vector3()).y - drop, hb.getCenter(new THREE.Vector3()).z)).sub(p.worldToLocal(hb.getCenter(new THREE.Vector3())));
  hairT.position.add(dLocal);
  void w;
}
export const loadGranny = () => Promise.all([load('granny'), load('granny_anims')]).then(() => M.granny);
// Grandpa (outfit): "Grandpa Shotgun (G3 And Recaptured)" by DVUnit (sketchfab.com/DVUnit), CC BY 4.0, with his own clips
export const loadGrandpa = () => load('grandpa');
// Spider Mom (helper): "Spider Mom - Granny" by DVUnit (sketchfab.com/DVUnit), CC BY 4.0, with her own clips
export const loadSpiderMom = () => load('spidermom');
export const spiderMomReady = () => !!M.spidermom;
// Slendrina (killer): "Slendrina (Granny 3)" by DVUnit (sketchfab.com/DVUnit), CC BY 4.0, with her own clip
export const loadSlendrina = () => load('slendrina');
export const slendrinaReady = () => !!M.slendrina;
// Angeline (killer): "Angeline Unity" by A_Forogotten_Studio (sketchfab.com/A_Forogotten_Studio), CC BY 4.0: idle, Walk, attack
export const loadAngeline = () => load('angeline');
export const angelineReady = () => !!M.angeline;
export function makeAngelineGlb(sk = {}, lite = false) {
  if (!M.angeline) return null;
  const R = new AnimRig('angeline', sk, lite);
  Object.assign(R, { kind: 'killer', killer: 'angeline', glb: true, angeline: true });
  angBones(R); // record her rest (T-) pose before anything moves a bone
  // size her as she actually stands (in the coded pose, not the file's): 1.88 m, feet on the ground, centred
  const model = R.holder.children[0], fit = M.angeline.standFit || (M.angeline.standFit = (() => {
    animateAngeline(R, {}, 0); R.root.updateMatrixWorld(true);
    let sm = null; R.root.traverse(o => { if (o.isSkinnedMesh && !sm) sm = o; });
    const b = skinnedBox(sm), k = SPEC.angeline.h / (b.max.y - b.min.y), c = b.getCenter(new THREE.Vector3());
    return { k, x: -c.x * k, y: -b.min.y * k, z: -c.z * k, x0: model.position.x, y0: model.position.y, z0: model.position.z };
  })());
  model.scale.multiplyScalar(fit.k);
  model.position.set(fit.x0 * fit.k + fit.x, fit.y0 * fit.k + fit.y, fit.z0 * fit.k + fit.z);
  R.t = Math.random() * 10;
  return R;
}
// Angeline is animated in code. The file's own clips twist her body when she walks and stretch her arm to twice its
// length in the attack, and its rest pose holds her arms up at her face, which stands her sleeves up like flat wings.
// So: her bones start from the rest pose every frame and are aimed in world space: arms hanging (sleeves hang with
// them), a slight hunch, a floating glide, a two-handed lunge for the strike, arms spread and head forward for
// Yellow Eyes.
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
function angBones(R) {
  if (R.ab) return R.ab;
  const by = {};
  R.root.traverse(o => { if (o.isBone) by[o.name.replace(/[^A-Za-z]/g, '').toLowerCase()] = o; });
  const f = re => { for (const k in by) if (re.test(k)) return by[k]; return null; };
  const B = { pelvis: f(/^bippelvis/), neck: f(/^bipneck/), head: f(/^biphead$/), headNub: f(/^bipheadnub/) };
  // the spine bones (Spine, Spine1..3) all read "bipspine" without digits: take them from the chain instead
  const chain = []; for (let b = B.neck; b && b !== B.pelvis; b = b.parent) if (b.isBone) chain.unshift(b);
  B.spines = chain.filter(b => b !== B.neck);
  for (const sd of ['l', 'r']) {
    B[sd] = { cl: f(new RegExp('^bip' + sd + 'clavicle')), up: f(new RegExp('^bip' + sd + 'upperarm')), fo: f(new RegExp('^bip' + sd + 'forearm')), ha: f(new RegExp('^bip' + sd + 'hand')) };
  }
  B.all = []; R.root.traverse(o => { if (o.isBone) B.all.push(o); });
  B.rest = new Map(B.all.map(b => [b, b.quaternion.clone()]));
  R.ab = B; return B;
}
// turn bone b (weight k) so the line from it to its child `to` points along world direction dir.
// Worked out in the parent's space (her skeleton sits under scaled nodes, so world rotations don't decompose cleanly).
const _m = new THREE.Matrix4(), _m3 = new THREE.Matrix3();
function toParent(b, dir, out) {
  b.parent.updateWorldMatrix(true, false);
  _m3.setFromMatrix4(_m.copy(b.parent.matrixWorld).invert());
  return out.copy(dir).applyMatrix3(_m3).normalize();
}
function aimBone(b, to, dir, k) {
  if (!b || !to || k <= 0) return;
  const cur = _v1.copy(to.position).multiply(b.scale).applyQuaternion(b.quaternion).normalize(); // child direction, parent space
  const want = toParent(b, dir, _v2);
  _q1.setFromUnitVectors(cur, want); if (k < 1) _q1.slerp(_q3.identity(), 1 - k);
  b.quaternion.premultiply(_q1);
  b.updateMatrixWorld(true);
}
// rotate bone b by angle a about world axis ax
function turnBone(b, ax, a) {
  if (!b || !a) return;
  _q1.setFromAxisAngle(toParent(b, ax, _v2), a);
  b.quaternion.premultiply(_q1);
  b.updateMatrixWorld(true);
}
const smooth = (x, a, b) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function animateAngeline(R, s, dt) {
  const B = angBones(R);
  R.t += dt;
  if (s.atk === 1 && R.prevAtk !== 1) R.hitT = 0; else if (R.hitT != null) R.hitT += dt;
  if (!s.atk) R.hitT = null;
  R.prevAtk = s.atk;
  // smoothed drives: how fast she glides, how far into Yellow Eyes, the strike (0..1 through the swing)
  const e = k => 1 - Math.exp(-dt * k);
  const sp = Math.min(1, (s.speed || 0) / 3);
  R.gl = (R.gl || 0) + (sp - (R.gl || 0)) * e(6);
  R.ey = (R.ey || 0) + ((s.aim ? 1 : 0) - (R.ey || 0)) * e(7);
  R.st = (R.st || 0) + ((s.stun ? 1 : 0) - (R.st || 0)) * e(10);
  let atk = -1;
  if (s.exec && s.exec.role === 'killer') atk = Math.min(1, s.exec.f * 1.4);
  else if (R.hitT != null && R.hitT < 0.75) atk = R.hitT / 0.75;
  const t = R.t, gl = R.gl, ey = R.ey;
  // every frame from the rest pose
  for (const b of B.all) b.quaternion.copy(B.rest.get(b));
  R.root.updateWorldMatrix(true, false);
  const rq = R.root.getWorldQuaternion(new THREE.Quaternion());
  const F = new THREE.Vector3(0, 0, 1).applyQuaternion(rq), UP = new THREE.Vector3(0, 1, 0), RT = new THREE.Vector3().crossVectors(F, UP).normalize();
  const d = (f, u, r) => new THREE.Vector3().addScaledVector(F, f).addScaledVector(UP, u).addScaledVector(RT, r).normalize();
  // the strike: wind up (arms up and back), lunge (both claws forward and down), recover
  const wind = atk < 0 ? 0 : smooth(atk, 0, 0.25) * (1 - smooth(atk, 0.25, 0.45));
  const lunge = atk < 0 ? 0 : smooth(atk, 0.22, 0.45) * (1 - smooth(atk, 0.7, 1));
  // body: upright, a slight hunch; leans into the glide and the lunge; head forward for Yellow Eyes
  const hunch = 0.04 + gl * 0.2 + lunge * 0.5 - wind * 0.15 + ey * 0.06 - R.st * 0.3;
  const sway = Math.sin(t * 1.3) * 0.035 + Math.sin(t * 3.1) * gl * 0.05;
  // her T-pose already stands upright: lean the spine and tilt the head by small turns from it
  const PITCH = RT.clone().negate();                        // turning about this leans her forward
  const sp0 = B.spines;
  for (let i = 0; i < sp0.length; i++) { turnBone(sp0[i], PITCH, hunch * 0.22); turnBone(sp0[i], F, sway * 0.5); }
  const tilt = (Math.sin(t * 0.7) * 0.14 + Math.sin(t * 2.3) * 0.03) * (1 - ey * 0.8) + R.st * Math.sin(t * 17) * 0.2;
  turnBone(B.neck, PITCH, hunch * 0.3 - ey * 0.1);
  turnBone(B.head, F, tilt);
  turnBone(B.head, PITCH, -0.05 + lunge * 0.15 - R.st * 0.3);
  // arms
  for (const sd of ['l', 'r']) {
    const A = B[sd]; if (!A.up || !A.fo || !A.ha) continue;
    // which side this arm is on (in her own frame)
    A.up.updateWorldMatrix(true, false); B.neck.updateWorldMatrix(true, false);
    const out = Math.sign(_v1.setFromMatrixPosition(A.up.matrixWorld).sub(_v2.setFromMatrixPosition(B.neck.matrixWorld)).dot(RT)) || (sd === 'l' ? -1 : 1);
    const ph = sd === 'l' ? 0 : Math.PI;
    // hanging, a little forward and away from the dress; trailing back as she glides; swaying
    let up = d(0.18 - gl * 0.35 + Math.sin(t * 1.1 + ph) * 0.06, -1, out * 0.2);
    let fo = d(0.18 - gl * 0.25 + Math.sin(t * 1.1 + ph + 0.6) * 0.06, -1, out * 0.12);
    // Yellow Eyes: arms spread wide, palms out
    if (ey > 0.01) { up.lerp(d(0.35, -0.35, out * 0.9), ey).normalize(); fo.lerp(d(0.5, -0.1, out * 0.8), ey).normalize(); }
    if (wind > 0) { up.lerp(d(-0.25, 0.9, out * 0.35), wind).normalize(); fo.lerp(d(0.3, 0.9, out * 0.15), wind).normalize(); }
    if (lunge > 0) { up.lerp(d(1, -0.05, out * 0.3), lunge).normalize(); fo.lerp(d(1, -0.28, out * 0.1), lunge).normalize(); }
    if (R.st > 0.01) { up.lerp(d(0.2, 0.8, out * 0.6), R.st).normalize(); fo.lerp(d(0, 1, out * 0.3), R.st).normalize(); }
    // the collarbones are shrugged up in the file's pose: level them out (a little up in the wind-up)
    aimBone(A.cl, A.up, d(lunge * 0.25, -0.12 + wind * 0.35, out), 1);
    aimBone(A.up, A.fo, up, 1);
    aimBone(A.fo, A.ha, fo, 1);
  }
  // a ghost's float: a slow bob, a little higher and steadier while gliding
  R.holder.position.y = 0.03 + Math.sin(t * 1.6) * 0.025 + gl * 0.03;
  // dress sway while she moves
  turnBone(B.pelvis, F, Math.sin(t * 3.1) * gl * 0.05);
}
export const grandpaReady = () => !!M.grandpa;
export const grannyReady = () => !!(M.granny && M.granny_anims);
export function onGrannyReady(cb) { if (grannyReady()) cb(); else loadGranny().then(() => grannyReady() && cb()); }

class AnimRig {
  constructor(name, sk = {}, lite = false) {
    const D = M[name];
    this.root = new THREE.Group(); this.aura = []; this.meshes = []; this.t = Math.random() * 10;
    const holder = new THREE.Group(); holder.rotation.y = D.yaw; this.root.add(holder); this.holder = holder;
    const model = cloneSkinned(D.g.scene);
    model.scale.setScalar(D.fit.s); model.position.set(D.fit.x, D.fit.y, D.fit.z);
    holder.add(model);
    const mats = new Map(), skinned = [];
    model.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.frustumCulled = false;
      if (/hat_santa/i.test(o.name)) o.visible = !!sk.santa; // her Christmas hat, only for that outfit
      if (!mats.has(o.material)) mats.set(o.material, this.material(o.material, sk, lite));
      o.material = mats.get(o.material);
      this.meshes.push(o);
      if (o.isSkinnedMesh) skinned.push(o);
    });
    for (const m of skinned) {
      const a = new THREE.SkinnedMesh(m.geometry, auraSkinMat(0xffffff));
      a.bind(m.skeleton, m.bindMatrix); a.position.copy(m.position); a.quaternion.copy(m.quaternion); a.scale.copy(m.scale);
      a.visible = false; a.renderOrder = 10; a.frustumCulled = false; m.parent.add(a); this.aura.push(a);
    }
    this.mixer = new THREE.AnimationMixer(model);
    this.acts = {};
    for (const clip of name === 'angeline' ? [] : D.g.animations) { const a = this.mixer.clipAction(clip); a.enabled = true; a.setEffectiveWeight(0); a.play(); this.acts[clip.name] = a; }
    this.w = Object.fromEntries(Object.keys(this.acts).map(k => [k, 0]));
    const first = this.acts.idle ? 'idle' : Object.keys(this.acts)[0];
    if (first) { this.w[first] = 1; this.acts[first].setEffectiveWeight(1); }
  }
  material(src, sk, lite) {
    // Grandpa's file darkens his body and gun to 30-40% and adds a flat grey glow: at night that drew a black
    // silhouette. Use the texture as it is.
    const fix = /^(TextureAtlasGrandpa|Shotgun)$/.test(src.name || '');
    const col = fix ? new THREE.Color(0.92, 0.92, 0.92) : src.color;
    let m = lite ? new THREE.MeshLambertMaterial({ color: col, map: src.map || null, side: src.side, transparent: src.transparent, alphaTest: src.alphaTest }) : src.clone();
    if (fix) { m.color = col.clone(); if (m.emissive) m.emissive.setRGB(0, 0, 0); }
    for (const t of [m.map, m.normalMap]) if (t && t.anisotropy !== GFX.aniso) { t.anisotropy = GFX.aniso; t.needsUpdate = true; }
    if (sk.tint != null) m.color = new THREE.Color(col).lerp(new THREE.Color(sk.tint), sk.tintK ?? 0.5);
    if (sk.glow != null && 'emissive' in m) { m.emissive = new THREE.Color(sk.glow); m.emissiveIntensity = sk.glowK ?? 0.4; }
    return m;
  }
  setAura(color) { for (const a of this.aura) { if (color == null) a.visible = false; else { a.visible = true; a.material = auraSkinMat(color); } } }
  setOpacity(o) {
    for (const m of this.meshes) {
      if (!m.userData.baseMat) m.userData.baseMat = m.material;
      if (o >= 0.999) { m.material = m.userData.baseMat; m.castShadow = true; continue; }
      if (!m.userData.fadeMat) { m.userData.fadeMat = m.userData.baseMat.clone(); m.userData.fadeMat.transparent = true; m.userData.fadeMat.depthWrite = false; }
      m.userData.fadeMat.opacity = o; m.material = m.userData.fadeMat; m.castShadow = o > 0.5;
    }
  }
}
const base = n => n.replace(/_\d+$/, '').replace(/_/g, ' ').trim();
class GrannyRig extends AnimRig {
  constructor(sk, lite) {
    super('granny', sk, lite);
    this.kind = 'killer'; this.killer = 'granny'; this.glb = true; this.granny = true;
    // the puppet: Granny (7)'s skeleton playing her clips, never drawn
    const src = M.granny_anims.g.scene.clone(true), sh = new THREE.Group();
    sh.rotation.y = Math.PI / 2; sh.add(src); this.root.add(sh); sh.visible = false; this.src = sh;
    this.mixer = new THREE.AnimationMixer(src); this.acts = {};
    for (const clip of M.granny_anims.g.animations) { const a = this.mixer.clipAction(clip); a.enabled = true; a.setEffectiveWeight(0); a.play(); this.acts[clip.name] = a; }
    this.w = Object.fromEntries(Object.keys(this.acts).map(k => [k, 0]));
    if (this.acts.idle) { this.w.idle = 1; this.acts.idle.setEffectiveWeight(1); }
    const sb = {}; src.traverse(o => { sb[base(o.name)] = o; });
    const tb = []; this.holder.traverse(o => { if (o.isBone && sb[base(o.name)] && /Bip01|SlendrinaMom/.test(o.name)) tb.push(o); });
    // line the puppet up with the model: same spine height and place
    this.root.updateMatrixWorld(true);
    const tSp = tb.find(b => base(b.name) === 'Bip01 Spine'), sSp = sb['Bip01 Spine'];
    const tp = tSp.getWorldPosition(new THREE.Vector3()), sp0 = sSp.getWorldPosition(new THREE.Vector3());
    const k = tp.y / Math.max(1e-6, sp0.y); src.scale.multiplyScalar(k); this.root.updateMatrixWorld(true);
    const sp1 = sSp.getWorldPosition(new THREE.Vector3()); src.position.add(sh.worldToLocal(tp.clone()).sub(sh.worldToLocal(sp1.clone()))); this.root.updateMatrixWorld(true);
    // rest rotations (world, relative to the rig's root) of every mapped pair, parents first
    const depth = o => { let d = 0; while (o.parent) { o = o.parent; d++; } return d; };
    tb.sort((a, b) => depth(a) - depth(b));
    const q = () => new THREE.Quaternion();
    // the puppet's T-pose comes from its bind matrices (stored as extras.bindQ: world rotation in the file)
    const shq = sh.quaternion.clone();
    const tposeOf = o => o.userData && o.userData.bindQ ? shq.clone().multiply(new THREE.Quaternion().fromArray(o.userData.bindQ)) : o.getWorldQuaternion(q());
    this.pairs = tb.map(t => ({ t, s: sb[base(t.name)], rt: t.getWorldQuaternion(q()), rs: tposeOf(sb[base(t.name)]), wq: q() }));
    this.spine = { t: tSp, s: sSp, rt: tp.clone(), rs: sSp.getWorldPosition(new THREE.Vector3()) };
    // one constant frame correction for the stored T-pose rotations: in the first frame of her idle
    // clip the puppet's spine stands upright, like the model's in its T-pose
    if (this.acts.idle) {
      this.mixer.update(0); sh.updateMatrixWorld(true);
      const P0 = this.pairs.find(P => P.t === tSp);
      const E = sSp.getWorldQuaternion(q()).multiply(P0.rs.clone().invert());
      for (const P of this.pairs) P.rs.premultiply(E);
    }
    this._q = q(); this._p = q(); this._v = new THREE.Vector3();
  }
  // copy the puppet's pose onto the model
  follow() {
    this.src.updateMatrixWorld(true);
    const root = this.root, rq = root.getWorldQuaternion(this._p), rqi = rq.clone().invert();
    const byBone = new Map();
    for (const P of this.pairs) {
      // the puppet's rotation now, relative to its T-pose, applied to the model's T-pose (world space)
      const sw = P.s.getWorldQuaternion(this._q).premultiply(rqi);
      P.wq.copy(sw).multiply(P.rs.clone().invert()).multiply(P.rt);
      const parent = P.t.parent, pw = byBone.get(parent) || parent.getWorldQuaternion(new THREE.Quaternion()).premultiply(rqi);
      P.t.quaternion.copy(pw.clone().invert().multiply(P.wq));
      byBone.set(P.t, P.wq);
    }
    // hips: follow the puppet's spine up and down (bending, crouching, staggering)
    const S = this.spine, sp = root.worldToLocal(S.s.getWorldPosition(this._v)).sub(S.rs);
    const want = S.rt.clone().add(sp);
    S.t.parent.updateMatrixWorld(true);
    S.t.position.copy(S.t.parent.worldToLocal(root.localToWorld(want)));
  }
}
export function makeSlendrinaGlb(sk = {}, lite = false) {
  if (!M.slendrina) return null;
  const R = new AnimRig('slendrina', sk, lite);
  Object.assign(R, { kind: 'killer', killer: 'slendrina', glb: true, slendrina: true, float: true });
  return R;
}
// Slendrina floats: a slow bob, her one clip (arms drifting) looping, faster when she strikes or stares
export function animateSlendrina(R, s, dt) {
  R.t += dt;
  const a = R.acts.SlendrinaMoves || Object.values(R.acts)[0];
  if (a) { a.setEffectiveWeight(1); a.paused = false; a.timeScale = s.atk === 1 ? 3.2 : s.gaze ? 1.8 : s.speed > 0.3 ? 1.3 : 0.8; }
  R.mixer.update(dt);
  R.holder.position.y = 0.16 + Math.sin(R.t * 1.7) * 0.07;
  // she leans into a strike, and tips back when stunned
  const lean = s.atk === 1 ? 0.28 : s.stun ? -0.22 : s.speed > 2 ? 0.1 : 0;
  R.holder.rotation.x += (lean - R.holder.rotation.x) * Math.min(1, dt * 8);
}
export function makeGrannyGlb(sk = {}, lite = false) {
  if (sk.grandpa) {
    if (!M.grandpa) return null;
    const R = new AnimRig('grandpa', sk, lite);
    Object.assign(R, { kind: 'killer', killer: 'grandpa', glb: true, granny: true, grandpa: true });
    // Granny's states -> his clips
    R.clipMap = { idle: 'idle', Walk: 'walk', Hit: 'attack', Shoot: 'shootGun', arrowHit: 'arrowHit', pepperHit: 'peppered', freezeTrap: 'frozen', Look: 'search', lookBed: 'underbed' };
    R.root.traverse(o => { if (o.isMesh && /Glasses|Hat_Santa|RedEyes|Ragdoll/i.test(o.name)) o.visible = false; });
    return R;
  }
  return grannyReady() ? new GrannyRig(sk, lite) : null;
}
// Spider Mom: crawls, sniffs about, screeches
export function makeSpiderMom(lite = false) {
  if (!M.spidermom) return null;
  const R = new AnimRig('spidermom', {}, lite);
  R.kind = 'npc';
  R.play = (name, dt) => {
    const k = 1 - Math.exp(-dt * 8);
    for (const n in R.acts) { const t = n === name ? 1 : 0; R.w[n] += (t - R.w[n]) * k; R.acts[n].setEffectiveWeight(R.w[n]); R.acts[n].paused = false; }
    R.mixer.update(dt);
  };
  return R;
}

// pick Granny's clip for the game state, blend toward it, scrub one-shots
export function animateGranny(R, s, dt) {
  R.t += dt;
  if (s.atk === 1 && R.prevAtk !== 1 && !s.dash && !s.aim) R.hitT = 0; else if (R.hitT != null) R.hitT += dt * 1.85;
  if (!s.atk) R.hitT = null;
  R.prevAtk = s.atk;
  const A = R.acts, sp = s.speed || 0;
  let want = 'idle', rate = 1, scrub = null, fast = false;
  if (s.exec && s.exec.role === 'killer') {
    // Bedtime Trap: bend down and set the trap, then the shove, then stand over them
    const f = s.exec.f;
    if (f < 0.34) { want = 'lookBed'; rate = 1.2; } else if (f < 0.6) { want = 'Hit'; scrub = 0.25 + (f - 0.34) / 0.26 * 0.6; fast = true; } else want = 'Look';
  }
  else if (R.grandpa && s.shot != null) { want = 'Shoot'; scrub = 0.42 + s.shot * 0.5; fast = true; } // the blast and the pump
  else if (R.grandpa && s.aim) { want = 'Shoot'; scrub = 0.4; fast = true; }   // shotgun raised to the shoulder
  else if (s.dash) { want = 'Hit'; scrub = 0.45; fast = true; }        // Bat Rush: mid-swing, charging forward
  else if (s.aim) { want = 'Hit'; scrub = 0.18; fast = true; }         // winding up the bat
  else if (s.blind) { want = 'pepperHit'; rate = 1; fast = true; }
  else if (s.frozen) { want = 'freezeTrap'; rate = 1; fast = true; }
  else if (s.stun) { want = 'arrowHit'; rate = 0.9; fast = true; }
  // her original swing from the Granny game, played whole: from the start of the lunge, 1.85x speed so the
  // bat lands (~0.77s into the clip) as the lunge strikes, then the full follow-through
  else if ((s.atk === 1 || s.atk === 2) && R.hitT != null && R.hitT < 2.43) { want = 'Hit'; scrub = R.hitT / 2.43; fast = true; }
  else if (s.act === 'pickup' || s.act === 'cage' || s.act === 'bear' || s.act === 'break' || s.act === 'kick') { want = 'lookBed'; rate = s.act === 'break' || s.act === 'kick' ? 1.6 : 1.2; }
  else if (s.listen) { want = 'Look'; rate = 1.2; }
  else if (sp > 0.3) { want = 'Walk'; rate = Math.min(2.6, Math.max(0.7, sp / 1.7)); }
  if (R.clipMap) want = R.clipMap[want] || 'idle';
  if (!A[want]) want = A.idle ? 'idle' : Object.keys(A)[0];
  const k = 1 - Math.exp(-dt * (fast ? 20 : 9));
  for (const n in A) {
    const a = A[n], target = n === want ? 1 : 0;
    R.w[n] += (target - R.w[n]) * k;
    if (R.w[n] < 0.002 && !target) R.w[n] = 0;
    a.setEffectiveWeight(R.w[n]);
    if (n === want) { if (scrub != null) { a.paused = true; a.time = scrub * a.getClip().duration; } else { a.paused = false; a.timeScale = rate; } }
    else if (R.w[n] === 0) a.paused = true;
  }
  R.mixer.update(dt);
  if (R.follow) R.follow();
}
