// Realistic survivor outfits from rigged models with few or no usable clips (Raghuvir's "Realism":
// "Ghostbusters - Dr. Ray Stantz" by spinningblade, sketchfab.com/jakeacc, CC BY 4.0).
// The model is posed every frame by retargeting the game's own procedural survivor animation:
// an invisible procedural rig runs the usual walk / run / crouch / down / carried / caged / vault /
// repair / heal / execution poses, and its joint rotations are copied onto the Mixamo skeleton.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const models = {}, loading = {};
const HEIGHT = 1.78;
// skeletons other than Mixamo's: bone names (after the trailing _NN is dropped) and size
// freddy: "FNaF 1 Freddy Fazbear Rigged" by ShadowSupreme (sketchfab.com/ShadowSupreme), Sketchfab Standard licence:
// used inside the game only, the model file is not handed out on its own (kept out of the public repo)
const PROFILES = {
  freddy: {
    height: 1.95, splay: 0.12, top: 'j_hat', feet: ['j_l_foot_end', 'j_r_foot_end'], hips: 'j_pelvis',
    map: { hips: 'j_pelvis', spine: 'j_spine', head: 'j_head', shL: 'j_l_arm_02', elL: 'j_l_arm_01', shR: 'j_r_arm_02', elR: 'j_r_arm_01', lgL: 'j_l_leg_02', knL: 'j_l_leg_01', lgR: 'j_r_leg_02', knR: 'j_r_leg_01' },
    child: [['shL', 'j_l_arm_01'], ['shR', 'j_r_arm_01'], ['elL', 'j_l_hand'], ['elR', 'j_r_hand'], ['lgL', 'j_l_leg_01'], ['lgR', 'j_r_leg_01'], ['knL', 'j_l_foot'], ['knR', 'j_r_foot']],
    j: { handR: 'j_r_hand', handL: 'j_l_hand', head: 'j_head', spine: 'j_spine', hips: 'j_pelvis' }, jaw: 'j_jaw',
  },
};
const boneKey = n => n.replace(/^mixamorig_?|_\d+$/g, '');

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

// put every bone back in the skin's bind pose (the file stores the model mid-stride)
export function toBindPose(scene) {
  scene.updateMatrixWorld(true);
  const done = new Set();
  scene.traverse(o => {
    if (!o.isSkinnedMesh || done.has(o.skeleton)) return;
    done.add(o.skeleton);
    const sk = o.skeleton, bindW = new Map();
    sk.bones.forEach((b, i) => bindW.set(b, new THREE.Matrix4().copy(o.bindMatrix).multiply(new THREE.Matrix4().copy(sk.boneInverses[i]).invert())));
    // bones in parent-first order
    const order = []; const visit = b => { if (order.includes(b)) return; if (b.parent && bindW.has(b.parent)) visit(b.parent); order.push(b); };
    sk.bones.forEach(visit);
    for (const b of order) {
      const parentW = bindW.has(b.parent) ? bindW.get(b.parent) : (b.parent ? b.parent.matrixWorld : new THREE.Matrix4());
      // bindW is the bone's world matrix at bind time; its local matrix is relative to the parent
      const local = new THREE.Matrix4().copy(parentW).invert().multiply(bindW.get(b));
      local.decompose(b.position, b.quaternion, b.scale);
    }
  });
  scene.updateMatrixWorld(true);
}

export function loadRealism(name) {
  if (loading[name]) return loading[name];
  loading[name] = bytes(name).then(buf => new Promise((res, rej) => new GLTFLoader().parse(buf, '', res, rej))).then(g => {
    for (const a of g.animations) a.tracks.length = 0;
    // (the file stores a mid-stride pose; every limb is re-aimed straight down on use, see armFix)
    g.scene.updateMatrixWorld(true);
    // measure from the bones: head top to feet
    const bones = {}; g.scene.traverse(o => { if (o.isBone) bones[boneKey(o.name)] = o; });
    const P = PROFILES[name];
    // (profiled models are stored in their rest pose already; their size comes from the skinned vertices)
    const top = P ? bones[P.top] : bones.HeadTop_End || bones.Head, foot = P ? bones[P.feet[0]] : bones.LeftToe_End || bones.LeftFoot, foot2 = P ? bones[P.feet[1]] : bones.RightToe_End || foot;
    let yt = top.getWorldPosition(new THREE.Vector3()).y;
    let yf = Math.min(foot.getWorldPosition(new THREE.Vector3()).y, foot2.getWorldPosition(new THREE.Vector3()).y);
    if (P) { const box = new THREE.Box3().setFromObject(g.scene, true); yt = box.max.y; yf = box.min.y; }
    const s = (P ? P.height : HEIGHT) / (yt - yf) * 0.97, hips = bones[P ? P.hips : 'Hips'].getWorldPosition(new THREE.Vector3());
    models[name] = { scene: g.scene, fit: { s, x: -hips.x * s, y: -yf * s + 0.02, z: -hips.z * s } };
    return models[name];
  }).catch(e => { console.warn(name + ' model unavailable:', e); return null; });
  return loading[name];
}
export const realismReady = name => !!models[name];

// procedural joint -> Mixamo bone
const MAP = { hips: 'Hips', spine: 'Spine1', head: 'Head', shL: 'LeftArm', elL: 'LeftForeArm', handL: 'LeftHand', shR: 'RightArm', elR: 'RightForeArm', handR: 'RightHand', lgL: 'LeftUpLeg', knL: 'LeftLeg', lgR: 'RightUpLeg', knR: 'RightLeg' };

const SPLAY_L = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.08, 0, 0.24));
const SPLAY_R = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.08, 0, -0.24));

class RealismRig {
  constructor(name, proc) {
    const M = models[name];
    this.kind = 'survivor'; this.retarget = true; this.proc = proc;
    this.root = new THREE.Group(); this.aura = []; this.meshes = []; this.t = 0;
    this.body = new THREE.Group(); this.root.add(this.body);
    const model = cloneSkinned(M.scene);
    model.scale.setScalar(M.fit.s); model.position.set(M.fit.x, M.fit.y, M.fit.z);
    this.body.add(model);
    const bones = {}, PR = this.prof = PROFILES[name] || null;
    model.traverse(o => {
      if (o.isBone) bones[boneKey(o.name)] = o;
      if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; this.meshes.push(o); }
    });
    this.bones = bones;
    this.root.updateMatrixWorld(true);
    // per bone: rest local rotation and its rest world rotation (to express procedural rotations)
    this.drv = {};
    for (const [j, b] of Object.entries(PR ? PR.map : MAP)) {
      const bone = bones[b]; if (!bone) continue;
      const rest = bone.quaternion.clone(), wr = bone.getWorldQuaternion(new THREE.Quaternion()), wri = wr.clone().invert();
      this.drv[j] = { bone, rest, wr, wri };
    }
    // the bind pose holds the arms out a little: measure how far from straight down they are
    const down = new THREE.Vector3(0, -1, 0);
    this.armFix = {};
    for (const [j, child] of PR ? PR.child : [['shL', 'LeftForeArm'], ['shR', 'RightForeArm'], ['elL', 'LeftHand'], ['elR', 'RightHand'], ['lgL', 'LeftLeg'], ['lgR', 'RightLeg'], ['knL', 'LeftFoot'], ['knR', 'RightFoot']]) {
      const d = this.drv[j]; if (!d || !bones[child]) continue;
      const a = d.bone.getWorldPosition(new THREE.Vector3()), b = bones[child].getWorldPosition(new THREE.Vector3());
      const dir = b.sub(a).normalize();
      this.armFix[j] = new THREE.Quaternion().setFromUnitVectors(dir, down); // rest direction -> straight down
    }
    // the flashlight and effects look for these
    this.j = PR ? Object.fromEntries(Object.entries(PR.j).map(([k, v]) => [k, bones[v]])) : { handR: bones.RightHand, handL: bones.LeftHand, head: bones.Head, spine: bones.Spine2, hips: bones.Hips };
    if (PR && PR.jaw && bones[PR.jaw]) { this.jaw = bones[PR.jaw]; this.jawRest = this.jaw.quaternion.clone(); }
    const hipsBone = PR ? bones[PR.hips] : bones.Hips;
    this.hipsBone = hipsBone;
    this.hipsRest = hipsBone.position.clone();
    this.hipsY0 = proc.j.hips ? proc.j.hips.position.y : 0; // the procedural rig's standing hip height
    if (PR) {
      // limbs are aimed (each bone points where the procedural limb points): this skeleton's bone axes
      // don't line up with the procedural joints, so copying rotations folded the arms across the belly
      this.aims = PR.child.map(([j, c]) => ({ j, bone: this.drv[j] && this.drv[j].bone, child: bones[c] })).filter(a => a.bone && a.child);
      // hands carry on along the forearm (the rest pose holds them turned out); the middle finger is the pointer
      for (const [j, hn] of [['handL', PR.j.handL], ['handR', PR.j.handR]]) { const h = bones[hn], f = h && h.children.find(c => /middle/i.test(c.name)); if (h && f) this.aims.push({ j, bone: h, child: f, along: j === 'handL' ? 'elL' : 'elR' }); }
      // a prop held in the rest pose (Freddy's microphone) goes into the nearest hand
      model.updateMatrixWorld(true);
      model.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && /mic/i.test(o.name)) {
        const p = o.getWorldPosition(new THREE.Vector3()); let best = null, bd = Infinity;
        for (const h of [this.j.handR, this.j.handL]) { if (!h) continue; const d = h.getWorldPosition(new THREE.Vector3()).distanceTo(p); if (d < bd) { bd = d; best = h; } }
        if (best) this.heldProp = { o, hand: best };
      } });
      // the file's microphone isn't actually in the hand in the rest pose: leave it out
      if (this.heldProp) this.heldProp.o.visible = false;
    }
    // hip height changes are in metres; the Hips bone moves in its parent's (armature) units
    this.hipScale = 1 / (hipsBone.parent ? hipsBone.parent.getWorldScale(new THREE.Vector3()).y : M.fit.s);
    for (const m of this.meshes) if (m.isSkinnedMesh) {
      const a = new THREE.SkinnedMesh(m.geometry, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthTest: false, blending: THREE.AdditiveBlending }));
      a.bind(m.skeleton, m.bindMatrix); a.position.copy(m.position); a.quaternion.copy(m.quaternion); a.scale.copy(m.scale);
      a.visible = false; a.renderOrder = 10; a.frustumCulled = false; m.parent.add(a); this.aura.push(a);
    }
  }
  // copy the procedural rig's pose onto the skeleton
  copy() {
    const P = this.proc.j, q = new THREE.Quaternion(), R = new THREE.Quaternion();
    for (const [j, d] of Object.entries(this.drv)) {
      const pj = P[j]; if (!pj) continue;
      R.copy(pj.quaternion);
      if (this.armFix[j]) R.multiply(this.armFix[j]);
      // the jumpsuit and pack are much bulkier than the procedural body: hold the upper arms a
      // little out from the sides (and a touch forward) so the hands clear the hips and thighs
      if (j === 'shL') R.premultiply(this.prof ? this.splayL || (this.splayL = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.08, 0, this.prof.splay))) : SPLAY_L);
      else if (j === 'shR') R.premultiply(this.prof ? this.splayR || (this.splayR = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.08, 0, -this.prof.splay))) : SPLAY_R);
      q.copy(d.wri).multiply(R).multiply(d.wr);
      d.bone.quaternion.copy(d.rest).multiply(q);
    }
    // whole-body tilt (down, carried) and hip height from the procedural rig
    const tilt = P.tilt;
    if (tilt) { this.body.quaternion.copy(tilt.quaternion); this.body.position.copy(tilt.position); }
    if (P.hips && this.drv.hips) { const dy = P.hips.position.y - this.hipsY0; this.drv.hips.bone.position.copy(this.hipsRest); this.drv.hips.bone.position.y += dy * this.hipScale; }
    if (this.aims) this.aimLimbs();
    // the animatronic's jaw hangs and twitches
    if (this.jaw) { this.t += 1 / 60; const a = 0.1 + Math.max(0, Math.sin(this.t * 0.7)) * 0.12 + (Math.sin(this.t * 23) > 0.96 ? 0.15 : 0); this.jaw.quaternion.copy(this.jawRest).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), a)); }
  }
  aimLimbs() {
    const P = this.proc.j, v = this._v || (this._v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]), q = this._q || (this._q = [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()]);
    this.proc.root.updateMatrixWorld(true); this.root.updateMatrixWorld(true);
    const rootQ = this.root.getWorldQuaternion(q[0]);
    const next = { shL: 'elL', shR: 'elR', elL: 'handL', elR: 'handR', lgL: 'knL', lgR: 'knR' };
    for (const a of this.aims) {
      const pj = P[a.j]; if (!pj) continue;
      // where the procedural limb points (in its own root's space), turned into the world
      const from = pj.getWorldPosition(v[0]);
      if (a.along) { const e = P[a.along]; if (!e) continue; v[1].copy(from).sub(e.getWorldPosition(v[2])); }
      else if (next[a.j] && P[next[a.j]]) v[1].copy(P[next[a.j]].getWorldPosition(v[2])).sub(from);
      else v[1].set(0, -1, 0).transformDirection(pj.matrixWorld); // shin: along the joint's own -Y
      const proot = this.proc.root.getWorldQuaternion(q[1]).invert();
      v[1].applyQuaternion(proot).applyQuaternion(rootQ).normalize();
      // where the bone points now
      const bp = a.bone.getWorldPosition(v[0]), cur = a.child.getWorldPosition(v[3]).sub(bp).normalize();
      if (cur.lengthSq() < 1e-8) continue;
      q[1].setFromUnitVectors(cur, v[1]);
      // world rotation -> the bone's local rotation
      const pw = a.bone.parent.getWorldQuaternion(q[2]), bw = a.bone.getWorldQuaternion(new THREE.Quaternion());
      a.bone.quaternion.copy(pw.clone().invert().multiply(q[1]).multiply(bw));
      a.bone.updateMatrixWorld(true);
    }
  }
  setAura(color) { for (const a of this.aura) { if (color == null) a.visible = false; else { a.visible = true; a.material.color.setHex(color); } } }
  setOpacity(o) {
    for (const m of this.meshes) {
      if (!m.userData.baseMat) m.userData.baseMat = m.material;
      if (o >= 0.999) { m.material = m.userData.baseMat; continue; }
      if (!m.userData.fadeMat) { m.userData.fadeMat = m.userData.baseMat.clone(); m.userData.fadeMat.transparent = true; m.userData.fadeMat.depthWrite = false; }
      m.userData.fadeMat.opacity = o; m.material = m.userData.fadeMat;
    }
  }
}

export function makeRealism(name, proc) {
  if (!models[name]) return null;
  return new RealismRig(name, proc);
}

// 1.3.2: Freddy Fazbear worn by GRANNY (a legendary killer outfit). Granny's own rig keeps running (her puppet plays
// her clips, her model follows it) but is not drawn; Freddy's limbs are aimed the way hers point every frame, and
// her bat moves from her hand to his.
const GR_AIM = [
  ['j_spine', 'j_neck', 'Bip01 Spine', 'Bip01 Neck'], ['j_neck', 'j_head', 'Bip01 Neck', 'Bip01 Head'],
  ['j_l_arm_02', 'j_l_arm_01', 'Bip01 L UpperArm', 'Bip01 L Forearm'], ['j_l_arm_01', 'j_l_hand', 'Bip01 L Forearm', 'Bip01 L Hand'],
  ['j_r_arm_02', 'j_r_arm_01', 'Bip01 R UpperArm', 'Bip01 R Forearm'], ['j_r_arm_01', 'j_r_hand', 'Bip01 R Forearm', 'Bip01 R Hand'],
  ['j_l_leg_02', 'j_l_leg_01', 'Bip01 L Thigh', 'Bip01 L Calf'], ['j_l_leg_01', 'j_l_foot', 'Bip01 L Calf', 'Bip01 L Foot'],
  ['j_r_leg_02', 'j_r_leg_01', 'Bip01 R Thigh', 'Bip01 R Calf'], ['j_r_leg_01', 'j_r_foot', 'Bip01 R Calf', 'Bip01 R Foot'],
];
export function freddyOver(R, height = 2.05) {
  const M = models.freddy; if (!M) return false;
  const base = n => n.replace(/_\d+$/, '').replace(/_/g, ' ').trim();
  const src = {}; R.holder.traverse(o => { if (o.isBone) src[base(o.name)] = o; });
  // Granny's body goes; her bat stays (it moves to Freddy's hand)
  let bat = null; R.holder.traverse(o => { if (/BatBloody/i.test(o.name)) bat = o; });
  const keep = new Set(); if (bat) bat.traverse(o => keep.add(o));
  for (const m of R.meshes) if (!keep.has(m)) m.visible = false;
  for (const a of R.aura) a.parent && a.parent.remove(a);
  const model = cloneSkinned(M.scene), s = height / 1.95 * M.fit.s;
  model.scale.setScalar(s); model.position.set(M.fit.x * s / M.fit.s, M.fit.y * s / M.fit.s, M.fit.z * s / M.fit.s);
  const body = new THREE.Group(); body.add(model); R.root.add(body);
  const fb = {}, meshes = [], aura = [];
  model.traverse(o => {
    if (o.isBone) fb[boneKey(o.name)] = o;
    if (o.isMesh) { if (!o.isSkinnedMesh && /mic/i.test(o.name)) { o.visible = false; return; } o.castShadow = true; o.frustumCulled = false; meshes.push(o); }
  });
  for (const m of meshes) if (m.isSkinnedMesh) {
    const a = new THREE.SkinnedMesh(m.geometry, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthTest: false, blending: THREE.AdditiveBlending }));
    a.bind(m.skeleton, m.bindMatrix); a.position.copy(m.position); a.quaternion.copy(m.quaternion); a.scale.copy(m.scale);
    a.visible = false; a.renderOrder = 10; a.frustumCulled = false; m.parent.add(a); aura.push(a);
  }
  const jaw = fb.j_jaw, jawRest = jaw && jaw.quaternion.clone();
  const aims = GR_AIM.map(([b, c, s0, s1]) => ({ b: fb[b], c: fb[c], s0: src[s0], s1: src[s1] })).filter(a => a.b && a.c && a.s0 && a.s1);
  for (const side of ['l', 'r']) { const h = fb['j_' + side + '_hand'], f = h && h.children.find(c => /middle/i.test(c.name)); const S = side.toUpperCase();
    if (h && f && src[`Bip01 ${S} Forearm`] && src[`Bip01 ${S} Hand`]) aims.push({ b: h, c: f, s0: src[`Bip01 ${S} Forearm`], s1: src[`Bip01 ${S} Hand`] }); }
  const pelvis = fb.j_pelvis, pelvisRest = pelvis && pelvis.position.clone();
  R.root.updateMatrixWorld(true);
  const spine0 = R.spine ? R.spine.t.getWorldPosition(new THREE.Vector3()).y - R.root.getWorldPosition(new THREE.Vector3()).y : 1;
  const pelvisScale = pelvis && pelvis.parent ? 1 / pelvis.parent.getWorldScale(new THREE.Vector3()).y : 1;
  const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion();
  let batOff = null, t = 0;
  const follow0 = R.follow.bind(R);
  R.follow = () => {
    follow0();
    R.root.updateMatrixWorld(true);
    // crouching / bending: the hips go down as far as hers do (scaled to his height)
    if (pelvis && R.spine) { const y = R.spine.t.getWorldPosition(v0).y - R.root.getWorldPosition(v1).y; pelvis.position.copy(pelvisRest); pelvis.position.y += (y - spine0) * (height / 1.8) * pelvisScale; pelvis.updateMatrixWorld(true); }
    for (const a of aims) {
      const want = a.s1.getWorldPosition(v0).sub(a.s0.getWorldPosition(v1)).normalize();
      const cur = a.c.getWorldPosition(v2).sub(a.b.getWorldPosition(v1)).normalize();
      if (cur.lengthSq() < 1e-8 || want.lengthSq() < 1e-8) continue;
      q0.setFromUnitVectors(cur, want);
      const pw = a.b.parent.getWorldQuaternion(q1), bw = a.b.getWorldQuaternion(q2);
      a.b.quaternion.copy(pw.invert().multiply(q0).multiply(bw)); a.b.updateMatrixWorld(true);
    }
    if (jaw) { t += 1 / 60; jaw.quaternion.copy(jawRest).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.08 + Math.max(0, Math.sin(t * 0.8)) * 0.12)); }
    // her bat, in his right hand: the same hold relative to the hand as it had in hers (taken once, on the first frame)
    if (bat && fb.j_r_hand && src['Bip01 R Hand']) {
      const fh = fb.j_r_hand.matrixWorld, gh = src['Bip01 R Hand'].matrixWorld;
      if (!batOff) batOff = new THREE.Matrix4().copy(fh).invert().multiply(gh).multiply(new THREE.Matrix4().copy(gh).invert().multiply(bat.matrixWorld));
      const w = new THREE.Matrix4().copy(fh).multiply(batOff), local = new THREE.Matrix4().copy(bat.parent.matrixWorld).invert().multiply(w);
      local.decompose(bat.position, bat.quaternion, bat.scale); bat.updateMatrixWorld(true);
    }
  };
  R.meshes = meshes.concat(bat ? R.meshes.filter(m => keep.has(m)) : []); R.aura = aura;
  R.freddy = true;
  return true;
}
