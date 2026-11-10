// Bot brains (host only). Bots act through the same channels as human players.
import { findPath, cellPos, cellOf, losBlocked, barBox, moveCircle, levelOf, losL, levelsMeet, heightAt } from './map.js';
import { stepMover, startVault } from './movement.js';
import { dist, fwd, angDiff, killerOf, killersOf, nearestKiller, modeOf, findSpace, findInteraction, vaultDuration, terrorRadius, playerById, canExecuteTarget, findExecute, itemCharge } from './rules.js';
import { HALF, KILLERS, SURVIVORS } from './config.js';

// Which walkable cells connect to which (per floor grid, computed once). Survivors only ever aim for
// places they can actually reach: a target in a sealed pocket used to leave them standing still.
function regions(M) {
  const g = M.grid;
  if (g._reg) return g._reg;
  const N = g.N, lab = new Int32Array(N * N).fill(-1), q = new Int32Array(N * N);
  const pass = k => g.type[k] !== 1; // exit gates count as open ground: once they open, the way out is reachable
  let id = 0;
  for (let s = 0; s < N * N; s++) {
    if (lab[s] >= 0 || !pass(s)) continue;
    let h = 0, t = 0; q[t++] = s; lab[s] = id;
    while (h < t) {
      const k = q[h++], i = k % N, j = (k / N) | 0;
      if (i > 0 && lab[k - 1] < 0 && pass(k - 1)) { lab[k - 1] = id; q[t++] = k - 1; }
      if (i < N - 1 && lab[k + 1] < 0 && pass(k + 1)) { lab[k + 1] = id; q[t++] = k + 1; }
      if (j > 0 && lab[k - N] < 0 && pass(k - N)) { lab[k - N] = id; q[t++] = k - N; }
      if (j < N - 1 && lab[k + N] < 0 && pass(k + N)) { lab[k + N] = id; q[t++] = k + N; }
    }
    id++;
  }
  return (g._reg = lab);
}
// the region a point is in (a blocked cell borrows its nearest open neighbour's)
function regionAt(M, x, z) {
  const lab = regions(M), g = M.grid, N = g.N, k0 = cellOf(M, x, z);
  if (lab[k0] >= 0) return lab[k0];
  const i0 = k0 % N, j0 = (k0 / N) | 0;
  for (let r = 1; r < 6; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    const i = i0 + di, j = j0 + dj; if (i < 0 || j < 0 || i >= N || j >= N) continue;
    if (lab[j * N + i] >= 0) return lab[j * N + i];
  }
  return -1;
}
// the nearest point to (x, z) that is in region 'r'
function nearestIn(M, r, x, z) {
  const lab = regions(M), g = M.grid, N = g.N, k0 = cellOf(M, x, z), i0 = k0 % N, j0 = (k0 / N) | 0;
  if (lab[k0] === r) return { x, z };
  for (let rad = 1; rad < 24; rad++) for (let dj = -rad; dj <= rad; dj++) for (let di = -rad; di <= rad; di++) {
    if (Math.max(Math.abs(di), Math.abs(dj)) !== rad) continue;
    const i = i0 + di, j = j0 + dj; if (i < 0 || j < 0 || i >= N || j >= N) continue;
    if (lab[j * N + i] === r) return cellPos(M, j * N + i);
  }
  return null;
}

// survivor bots are your teammates: the same steady players at every difficulty (difficulty is how good Granny is)
const SURV_SKILL = { react: 0.35, skill: 0.94, great: 0.2 };

export class Bots {
  constructor(sim) {
    this.sim = sim;
    this.brains = new Map();
    this.noises = [];
    // loop anchors: tall obstacles survivors can circle around to break line of sight
    const M = sim.M, A = [];
    for (const o of M.boxes) {
      if (o.h < 1.7 || o.kind === 'boundary' || o.kind === 'pillar') continue;
      const long = Math.max(o.hx, o.hz);
      if (long > 2.4) {
        const ax = o.hx > o.hz;
        for (const s of [-1, 1]) A.push({ x: o.x + (ax ? s * o.hx : 0), z: o.z + (ax ? 0 : s * o.hz), r: 0.9 });
        A.push({ x: o.x, z: o.z, r: Math.min(o.hx, o.hz) + 0.6 });
      } else A.push({ x: o.x, z: o.z, r: long + 0.2 });
    }
    for (const c of M.circles) if (c.h >= 1.7 && c.r >= 0.35 && c.kind !== 'cage') A.push({ x: c.x, z: c.z, r: c.r + 0.2 });
    for (const w of M.windows) A.push({ x: w.x, z: w.z, r: 0.6, win: true });
    for (const bar of M.bars) A.push({ x: bar.x, z: bar.z, r: 0.6, bar: bar.id });
    this.anchors = A;
  }
  brain(p) {
    let b = this.brains.get(p.id);
    if (!b) {
      b = { think: Math.random() * 0.3, path: null, pi: 0, goal: null, goalKey: '', repath: 0, mode: '', e: false, stuck: 0, lastX: p.x, lastZ: p.z,
        sc: 3 + Math.random() * 5, wig: 0, lastSeen: null, lostT: 0, target: null, aimT: 0, sprint: true, crouch: false, patrolGen: -1, idleT: 0, react: 0 };
      this.brains.set(p.id, b);
    }
    return b;
  }
  onEvents(evs) {
    for (const e of evs) if (e.k === 'infected') this.brains.delete(e.id); // a fresh (killer) brain
    for (const e of evs) if (e.k === 'swap') { this.brains.delete(e.from); this.brains.delete(e.to); }
    for (const e of evs) if (e.k === 'noise') this.noises.push({ x: e.x, z: e.z, t: this.sim.S.t });
    this.noises = this.noises.filter(n => this.sim.S.t - n.t < 6);
  }

  update(dt) {
    const S = this.sim.S;
    if (S.phase !== 'play') return;
    for (const K of killersOf(S)) {
    // a bot killer with a torch in his eyes turns his face away (more often on higher difficulty)
    if (K.bot && K.glare > 0.35 && !K.atk) {
      const b = this.brain(K);
      if (b.lookAway == null) b.lookAway = Math.random() < this.sim.diff.react * -0.6 + 0.75 ? (Math.random() < 0.5 ? -1 : 1) : 0;
      if (b.lookAway) K.yaw += b.lookAway * dt * 4;
    } else if (K.bot && K.glare <= 0) this.brain(K).lookAway = null;
    // Slimer: spit at whoever he can see, phase through the wall between him and his prey
    if (K.bot && K.char === 'slimer' && K.stun <= 0 && K.carry == null && !K.act) {
      const sim = this.sim, M = sim.M, p = K;
      if (p.abCd <= 0 && !p.atk) { const t = S.players.find(s => s.role === 'survivor' && s.st === 'ok' && !(s.slimed > 0) && Math.hypot(s.x - p.x, s.z - p.z) < 13 && Math.hypot(s.x - p.x, s.z - p.z) > 2 && !losBlocked(M, p.x, p.z, s.x, s.z, 1.2)); if (t) { p.yaw = Math.atan2(t.x - p.x, t.z - p.z); sim.onMsg(p.id, { t: 'act', a: 'ability' }); } }
      if (p.ab2Cd <= 0 && !(p.phase > 0)) { const t = S.players.find(s => s.role === 'survivor' && s.st === 'ok' && Math.hypot(s.x - p.x, s.z - p.z) < 9 && losBlocked(M, p.x, p.z, s.x, s.z)); if (t) sim.onMsg(p.id, { t: 'act', a: 'ability2' }); }
    }
    }
    for (const p of S.players) {
      if (!p.bot) continue;
      if (p.role === 'killer') { this.killer(p, dt); continue; }
      if (p.st === 'ghost') { this.ghost(p, dt); continue; }
      this.survivor(p, dt); this.flashBot(p, dt);
      const K = nearestKiller(S, p);
      if (false && p.traps > 0 && p.st === 'ok' && K && dist(p, K) < 7 && K.mv && Math.random() < dt * 0.35) this.sim.onMsg(p.id, { t: 'act', a: 'trap' });
      // Spider-Man: swing away from a killer who is right on him (often up onto a wall or a tree)
      if (p.char === 'spiderman' && p.st === 'ok' && !p.act && !p.swing && !(p.swingCd > 0) && !(p.perchT > 0) && K && dist(p, K) < 6 && Math.random() < dt * 0.9) {
        const away = Math.atan2(p.x - K.x, p.z - K.z) + (Math.random() - 0.5) * 1.4;
        this.sim.onMsg(p.id, { t: 'act', a: 'swing', yaw: away, pitch: Math.random() < 0.6 ? 0.5 : 0 });
      }
      // Spider-Man: web the killer off a teammate's shoulder, or slow him when he is closing in
      if (p.char === 'spiderman' && p.webs > 0 && p.st === 'ok' && !p.act && K && !(K.webK > 0) && K.stun <= 0 && !losBlocked(this.sim.M, p.x, p.z, K.x, K.z, 1.2)
        && ((K.carry != null && dist(p, K) < 16) || (dist(p, K) < 7 && K.mv)) && Math.random() < dt * (K.carry != null ? 2.5 : 0.8)) {
        const yaw = Math.atan2(K.x - p.x, K.z - p.z) + (Math.random() - 0.5) * (1 - this.sim.diff.aim) * 0.2;
        this.sim.onMsg(p.id, { t: 'act', a: 'web', yaw });
      }
      // taser: shoot the killer when he closes in (or has a teammate on his shoulder)
      if (p.item === 'taser' && p.tasers > 0 && p.st === 'ok' && !p.act && K && K.stun <= 0 && dist(p, K) < 7 && (K.carry != null || dist(p, K) < 4.5) && !losBlocked(this.sim.M, p.x, p.z, K.x, K.z, 1.2) && Math.random() < dt * 1.2) {
        const yaw = Math.atan2(K.x - p.x, K.z - p.z) + (Math.random() - 0.5) * (1 - this.sim.diff.aim) * 0.3;
        this.sim.onMsg(p.id, { t: 'act', a: 'taser', yaw });
      }
    }
  }

  // flashlight saves: blind the killer when he carries or picks up a teammate (sometimes mid-chase)
  flashBot(p, dt) {
    const sim = this.sim, S = sim.S, K = nearestKiller(S, p), b = this.brain(p);
    let want = false;
    if (K && p.st === 'ok' && !p.act && !p.vault && p.flash > 0 && K.blindImm <= 0 && K.stun <= 0) {
      const d = dist(p, K), kf = fwd(K.yaw);
      const facing = d > 0.01 ? -((K.x - p.x) * kf.x + (K.z - p.z) * kf.z) / d : 0;
      const save = K.carry != null || (K.act && K.act.k === 'pickup');
      if (d > 12) b.flashRoll = undefined;
      b.flashRoll ??= Math.random(); // one decision per encounter: does this bot try to blind him head-on?
      const bold = b.flashRoll < sim.diff.skill - 0.86 && d < 5 && facing > 0.75;
      want = d > 1.2 && d < 7.5 && facing > 0.3 && (save || bold) && !losBlocked(sim.M, p.x, p.z, K.x, K.z, 1.2);
      if (want) p.yaw = Math.atan2(K.x - p.x, K.z - p.z) + (Math.random() - 0.5) * (1 - sim.diff.aim) * 0.25;
    }
    if (want !== !!p.flashOn) sim.onMsg(p.id, { t: 'in', e: !!b.e, aim: false, flash: want });
  }

  setE(p, b, on) {
    const inp = this.sim.inputs.get(p.id);
    if (on && b.e && inp && inp.latch) { this.sim.onMsg(p.id, { t: 'in', e: false, aim: b.aim }); b.e = false; }
    if (b.e === on) return;
    b.e = on;
    this.sim.onMsg(p.id, { t: 'in', e: on, aim: b.aim });
  }

  // ---------- path following ----------
  costFn(p) {
    const S = this.sim.S;
    if (p.role === 'killer' && p.char === 'chucky') return (t, r) => t === 1 ? Infinity : t === 2 ? 1.5 : t === 3 ? (S.bars[r] === 1 ? 1.5 : 1) : t === 4 ? Infinity : 1; // jumps them
    // (carrying someone, a killer can't break a dropped pallet: go round it)
    // (one-cell gaps: a survivor squeezes through, the killer is too wide: avoid them when there's another way)
    if (p.role === 'killer') return (t, r, nw) => (t === 1 ? Infinity : t === 2 ? 5 : t === 3 ? (S.bars[r] === 1 ? (p.carry != null ? Infinity : 8) : 1) : t === 4 ? Infinity : 1) + (nw ? 20 : 0);
    return (t, r) => t === 1 ? Infinity : t === 2 ? 3 : t === 3 ? (S.bars[r] === 1 ? 3.5 : 1) : t === 4 ? (S.gates[r].open ? 1 : Infinity) : 1;
  }
  goTo(p, b, x, z, key, dt, sprint = true, every = 1.2) {
    const M0 = this.sim.M;
    // floors: b.goalFl is the level the goal is on (set just before the call; the ground otherwise)
    const tfl = b.goalFl || 0; b.goalFl = 0;
    if (M0.stairs && ((p.fl || 0) >= 10 || (p.fl || 0) !== tfl)) {
      const w = this.stairWay(p, tfl, x, z);
      // on the stairs, or right at the foot / top of them: walk straight on
      if ((p.fl || 0) >= 10 || Math.hypot(w.x - p.x, w.z - p.z) < 1.8) { b.path = null; this.move(p, b, w.x - p.x, w.z - p.z, dt, sprint); return; }
      x = w.x; z = w.z; key = 'stairs' + (p.fl || 0);
    }
    const M = levelOf(M0, p.fl);
    b.repath -= dt;
    if (key !== b.goalKey || b.repath <= 0 || !b.path) {
      b.goalKey = key; b.repath = every + Math.random() * 0.3;
      let path = null;
      const rp = regionAt(M, p.x, p.z), rt = regionAt(M, x, z);
      if (rp >= 0 && rt !== rp) { const n = nearestIn(M, rp, x, z); if (n) { x = n.x; z = n.z; } }
      path = findPath(M, p.x, p.z, x, z, this.costFn(p), 40000);
      b.path = path; b.pi = 0;
      b.goal = { x, z };
    }
    // no route at all (a moving barricade, a closed gate): head straight there and let the unstick logic slide us along walls
    if (!b.path && b.goal && Math.hypot(b.goal.x - p.x, b.goal.z - p.z) > 0.8) { this.move(p, b, b.goal.x - p.x, b.goal.z - p.z, dt, sprint); return false; }
    return this.follow(p, b, dt, sprint);
  }
  follow(p, b, dt, sprint) {
    const sim = this.sim, M = levelOf(sim.M, p.fl), S = sim.S, g = M.grid;
    if (b.side > 0) {
      // unstick: step toward whichever nearby direction is actually open
      if (b.sideDir == null) {
        let bestA = 0, bestD = -1;
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const r = moveCircle(M, p.fl ? null : this.sim.S, p.x, p.z, Math.sin(a) * 0.8, Math.cos(a) * 0.8, 0.38); const d = Math.hypot(r.x - p.x, r.z - p.z); if (d > bestD) { bestD = d; bestA = a; } }
        b.sideDir = bestA;
      }
      b.side -= dt; if (b.side <= 0) b.sideDir = null;
      this.move(p, b, Math.sin(b.sideDir), Math.cos(b.sideDir), dt, sprint); return false;
    }
    if (!b.path || b.pi >= b.path.length) { this.move(p, b, 0, 0, dt, sprint); return true; }
    // skip waypoints we've reached
    while (b.pi < b.path.length) {
      const c = cellPos(M, b.path[b.pi]);
      if (Math.hypot(c.x - p.x, c.z - p.z) < 0.45) b.pi++; else break;
    }
    if (b.pi >= b.path.length) { this.move(p, b, 0, 0, dt, sprint); return true; }
    // look ahead for a straight line, but stop at vault/barricade cells
    let ti = b.pi;
    for (let k = b.pi; k < Math.min(b.path.length, b.pi + 10); k++) {
      const t = g.type[b.path[k]];
      if (t === 2 || (t === 3 && S.bars[g.ref[b.path[k]]] === 1)) { ti = k; break; }
      const c = cellPos(M, b.path[k]);
      if (this.clearLine(p.x, p.z, c.x, c.z, p.fl)) ti = k; else break;
    }
    const tk = b.path[ti], tc = cellPos(M, tk), tt = g.type[tk];
    // special cells: windows / dropped barricades
    if ((tt === 2 || (tt === 3 && S.bars[g.ref[tk]] === 1)) && Math.hypot(tc.x - p.x, tc.z - p.z) < 1.6) {
      if (p.role === 'killer' && tt === 3 && p.char !== 'chucky') {
        // face it and break it
        const bar = M.bars[g.ref[tk]];
        p.yaw = Math.atan2(bar.x - p.x, bar.z - p.z);
        const it = findInteraction(M, S, p);
        if (it && it.k === 'break') { this.setE(p, b, true); return false; }
      } else {
        const o = tt === 2 ? M.windows[g.ref[tk]] : M.bars[g.ref[tk]];
        if (o) {
          const ax = o.axis === 'x';
          const cross = ax ? p.x - o.x : p.z - o.z;
          p.yaw = ax ? (cross > 0 ? -Math.PI / 2 : Math.PI / 2) : (cross > 0 ? Math.PI : 0);
          const v = findSpace(M, S, p);
          if (v && v.k === 'vault') {
            const running = sprint && p.role === 'survivor';
            startVault(p, v, vaultDuration(p, v.kind, running));
            sim.onMsg(p.id, { t: 'act', a: 'vault', kind: v.kind, id: v.id, fast: running });
            // skip past the obstacle in the path
            while (b.pi < b.path.length && (g.type[b.path[b.pi]] === 2 || g.type[b.path[b.pi]] === 3 || Math.hypot(cellPos(M, b.path[b.pi]).x - p.x, cellPos(M, b.path[b.pi]).z - p.z) < 1.2)) b.pi++;
            return false;
          }
          // line up perpendicular to it
          const lx = ax ? o.x + Math.sign(cross || 1) * 0.8 : Math.max(o.x - o.half + 0.4, Math.min(o.x + o.half - 0.4, p.x));
          const lz = ax ? Math.max(o.z - o.half + 0.4, Math.min(o.z + o.half - 0.4, p.z)) : o.z + Math.sign(cross || 1) * 0.8;
          this.move(p, b, lx - p.x, lz - p.z, dt, false);
          return false;
        }
      }
    }
    const dx = tc.x - p.x, dz = tc.z - p.z, d = Math.hypot(dx, dz) || 1;
    this.move(p, b, dx / d, dz / d, dt, sprint);
    return false;
  }
  clearLine(x0, z0, x1, z1, fl) {
    const M = levelOf(this.sim.M, fl), g = M.grid, S = this.sim.S;
    const d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / 0.25);
    for (let i = 1; i <= n; i++) {
      const k = cellOf(M, x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n), t = g.type[k];
      if (t === 1 || t === 2) return false;
      if (t === 3 && S.bars[g.ref[k]] === 1) return false;
      if (t === 4 && !S.gates[g.ref[k]].open) return false;
    }
    return true;
  }
  // the next point on the way to another floor: the foot or the top of the stairs, then up or down them
  stairWay(p, tfl, tx, tz) {
    const M = this.sim.M, fl = p.fl || 0;
    const foot = k => { const S = M.stairs[k]; if (S.kind === 'lane') return { x: -0.35, z: -4.7 }; const t = (S.a0 + 4) * Math.PI / 180; return { x: S.cx + Math.cos(t) * 0.95, z: S.cz + Math.sin(t) * 0.95 }; };
    const top = k => { const S = M.stairs[k]; if (S.kind === 'lane') return { x: 2.9, z: -8.75 }; const t = (S.a1 - 4) * Math.PI / 180; return { x: S.cx + Math.cos(t) * 0.95, z: S.cz + Math.sin(t) * 0.95 }; };
    if (fl < 10) {
      if (tfl >= 10) { const k = tfl - 10; if (k === fl) return foot(k); if (k + 1 === fl) return top(k); return k > fl ? foot(fl) : top(fl - 1); }
      return tfl > fl ? foot(fl) : top(fl - 1);
    }
    if (tfl === fl) return { x: tx, z: tz };
    const k = fl - 10, S = M.stairs[k], up = tfl >= 10 ? tfl > fl : tfl > k;
    if (S.kind === 'lane') {
      if (up) return p.x < 0.6 && p.z > -8.2 ? { x: -0.35, z: -8.75 } : { x: 3.95, z: -8.75 };
      return p.x > 0.1 && p.z < -7.0 ? { x: -0.4, z: -8.6 } : { x: -0.35, z: -3.55 };
    }
    // spiral: keep walking round, then step off at the end
    const sp = p.sp ?? S.a0;
    const a = up ? (sp > S.a1 - 15 ? S.a1 : sp + 40) : (sp < S.a0 + 15 ? S.a0 : sp - 40);
    const r = (up ? sp > S.a1 - 15 : sp < S.a0 + 15) ? 1.8 : 0.8, t = a * Math.PI / 180;
    return { x: S.cx + Math.cos(t) * r, z: S.cz + Math.sin(t) * r };
  }
  move(p, b, mx, mz, dt, sprint) {
    const S = this.sim.S, M = this.sim.M;
    const m = Math.hypot(mx, mz);
    if (m > 1) { mx /= m; mz /= m; }
    if (p.role === 'killer' && m > 0.05 && !p.vault && !(p.char === 'butcher' && p.ab === 1)) {
      const target = Math.atan2(mx, mz);
      p.yaw += angDiff(p.yaw, target) * Math.min(1, dt * 7);
    }
    if (p.role === 'killer' && p.char === 'butcher' && p.ab === 1 && b.target != null) {
      const t = playerById(S, b.target);
      if (t) p.yaw += Math.max(-1.1 * dt, Math.min(1.1 * dt, angDiff(p.yaw, Math.atan2(t.x - p.x, t.z - p.z))));
    }
    if (p.role === 'survivor' && b.juke && m > 0.05) { const a = Math.sin(S.t * 4.2 + p.id.length) * 0.75, c = Math.cos(a), sn = Math.sin(a); [mx, mz] = [mx * c - mz * sn, mx * sn + mz * c]; }
    if (p.role === 'survivor' && S.bears && S.bears.length && m > 0.05) {
      // (running for their life, they often don't look down)
      // a trap we have spotted gets a wide berth; one we haven't, we may not see in time when running
      for (const t of S.bears) {
        const known = b.traps && b.traps.has(t.id), R0 = known ? (b.brave > S.t ? 1.0 : 2.1) : 1.5;
        if (!known && sprint && ((t.id * 7 + p.id.charCodeAt(p.id.length - 1)) % 10) < 6) continue;
        const dx = p.x - t.x, dz = p.z - t.z, d = Math.hypot(dx, dz);
        if (d < R0 && d > 0.01 && (t.fl || 0) === (p.fl || 0)) { const k = (R0 - d) / R0 * (known ? 2.4 : 1.8); mx += dx / d * k; mz += dz / d * k; }
      }
      const m2 = Math.hypot(mx, mz); if (m2 > 1) { mx /= m2; mz /= m2; }
    }
    stepMover(M, S, p, { mx, mz, sprint, crouch: b.crouch }, dt);
    if (p.bump && p.char === 'butcher' && p.ab === 1) this.sim.onMsg(p.id, { t: 'act', a: 'bump' });
    // stuck detection
    const moved = Math.hypot(p.x - b.lastX, p.z - b.lastZ);
    b.lastX = p.x; b.lastZ = p.z;
    if (m > 0.3 && !p.act && !p.vault && p.stun <= 0 && moved < 0.2 * dt) { b.stuck += dt; if (b.stuck > 0.6) { b.stuck = 0; b.path = null; b.repath = 0; b.stuckCount = (b.stuckCount || 0) + 1; b.side = 0.5; } }
    else b.stuck = Math.max(0, b.stuck - dt);
  }

  // ---------- survivor ----------
  survivor(p, dt) {
    const sim = this.sim, S = sim.S, M = sim.M, b = this.brain(p), D = SURV_SKILL;
    const K = nearestKiller(S, p);
    if (p.st === 'carried') {
      this.setE(p, b, false);
      b.wig -= dt;
      if (b.wig <= 0) { b.wig = 0.12 + Math.random() * 0.12; sim.onMsg(p.id, { t: 'act', a: 'wig' }); }
      return;
    }
    if (p.st === 'caged') {
      this.setE(p, b, false);
      if (p.stage === 1 && p.esc < ((SURVIVORS[p.char] && SURVIVORS[p.char].hookEscapes) || 3) && p.cageT < p.cageMax - 8 && Math.random() < dt * 0.05) sim.onMsg(p.id, { t: 'act', a: 'esc' });
      return;
    }
    if (p.st === 'down') {
      this.setE(p, b, false);
      if (K) {
        const dx = p.x - K.x, dz = p.z - K.z, d = Math.hypot(dx, dz) || 1;
        if (d < 18) this.move(p, b, dx / d, dz / d, dt, false); else this.move(p, b, 0, 0, dt, false);
      }
      return;
    }
    if (p.st !== 'ok') { this.setE(p, b, false); b.wd = null; return; }
    // watchdog: a survivor that has not moved or done anything for a while gives up on what it was
    // trying to reach (that generator / chest / teammate) for a bit, steps aside and picks something else
    {
      const wd = b.wd ||= { x: p.x, z: p.z, t: 0 };
      if (p.act || p.vault || p.swing || p.perchT > 0 || p.snare > 0 || p.stun > 0 || Math.hypot(p.x - wd.x, p.z - wd.z) > 0.5) { wd.x = p.x; wd.z = p.z; wd.t = 0; }
      else wd.t += dt;
      if (wd.t > 2.5) {
        wd.t = 0;
        if (b.mode && b.mode !== 'rescue' && b.mode !== 'exit') (b.avoid ||= {})[b.mode + ':' + b.modeId] = S.t + 15;
        b.path = null; b.repath = 0; b.side = 0.7; b.sideDir = null; b.goalKey = '';
        // (a known bear trap beside the only way in, e.g. at a hook, held us back: squeeze past it for a bit,
        // still well clear of its jaws)
        b.brave = S.t + 6;
      }
    }
    const avoid = (mode, id) => !!(b.avoid && b.avoid[mode + ':' + id] > S.t);
    if (S.bears && S.bears.length) { const seen = KILLERS.grandpa.ability2.seen; b.traps ||= new Set(); for (const t of S.bears) if (!b.traps.has(t.id) && ((t.id * 13 + p.id.charCodeAt(p.id.length - 1)) % 10) < 6 && Math.hypot(t.x - p.x, t.z - p.z) < seen && !losBlocked(M, p.x, p.z, t.x, t.z, 0.5)) b.traps.add(t.id); } // (they don't spot every one)

    // awareness of the killer
    let threat = false, kd = 99;
    if (K) {
      kd = dist(p, K);
      const vis = kd < 26 && !losBlocked(M, p.x, p.z, K.x, K.z);
      const faded = K.char === 'wisp' && K.ab === 1;
      const tr = terrorRadius(K);
      if (faded) threat = kd < 4.5;
      // only run when actually hunted: she is close, or in sight and coming this way, or swinging / rushing
      const closing = b.kPrevD != null && b.kPrevD - kd > 0.01;
      if (faded) {} else threat = kd < 7 || (vis && kd < 12 && closing) || (vis && kd < 15 && (K.atk || K.dash || K.aim)) || (kd < Math.min(tr, 12) && (K.atk || K.ab));
      // Grandpa's shotgun reaches far: him raising it at us, in sight, is a threat from 32m
      b.juke = false;
      if (K.char === 'grandpa' && K.aim && vis && kd < 32) { const kf = fwd(K.yaw), toMe = ((p.x - K.x) * kf.x + (p.z - K.z) * kf.z) / (kd || 1); if (toMe > 0.93) { threat = true; b.juke = true; } }
      // Angeline's yellow eyes are on us: get out of the beam (it's narrow: a sideways dash does it)
      if (K.char === 'angeline' && K.aim && vis && kd < 18) { const kf = fwd(K.yaw), toMe = ((p.x - K.x) * kf.x + (p.z - K.z) * kf.z) / (kd || 1); if (toMe > 0.9) { threat = true; b.juke = true; } }
      // Slendrina's eyes are open: don't stand there looking at her
      if (K.char === 'slendrina' && K.gaze > 0 && vis && kd < 26) threat = true;
      // she just appeared next to us
      if (K.char === 'slendrina' && b.kPrevPos && Math.hypot(K.x - b.kPrevPos.x, K.z - b.kPrevPos.z) > 4 && kd < 10) { threat = true; b.react = D.react; }
      b.kPrevPos = { x: K.x, z: K.z };
      if (K.carry != null && kd > 6) threat = false;
    }
    if (threat) { b.react += dt; b.alert = 5; b.kLast = { x: K.x, z: K.z, t: S.t }; } else { b.react = 0; b.alert = Math.max(0, (b.alert || 0) - dt); }
    // 1.3.2: the team shares what it knows. Whoever sees the killer (or hears the heartbeat close by) "calls it out":
    // every survivor bot then knows roughly where she is, and whether she is busy chasing someone
    if (K && (kd < 26 && !losBlocked(M, p.x, p.z, K.x, K.z) || kd < Math.min(terrorRadius(K), 16))) {
      const I = this.intel ||= {};
      if (threat || !I.t || S.t - I.t > 1 || I.by === p.id) Object.assign(I, { x: K.x, z: K.z, t: S.t, by: p.id, chase: threat ? p.id : (I.chase === p.id ? null : I.chase), ct: threat ? S.t : I.ct });
    }
    // the terror radius: leave a generator early if the killer is closing in
    const I = this.intel && S.t - this.intel.t < 20 ? this.intel : null;
    const busyElsewhere = !!(I && I.chase && I.chase !== p.id && S.t - (I.ct || 0) < 4 && kd > 20);
    if (!threat && !busyElsewhere && K && p.act && p.act.k === 'repair' && kd < Math.min(terrorRadius(K), 18) && K.carry == null && !(K.char === 'wisp' && K.ab === 1)) {
      const kv = b.kPrevD != null ? b.kPrevD - kd : 0;
      if (kv > 0.02 && kd < 14) { b.react = D.react; b.alert = 4; b.kLast = { x: K.x, z: K.z, t: S.t }; }
    }
    b.kPrevD = kd;
    // once she has lost sight of us and is not right behind, stop running and get back to work
    const lostUs = K && kd > 8 && losBlocked(M, p.x, p.z, K.x, K.z);
    const fleeing = (threat && b.react >= D.react * 0.6) || (b.alert > 0 && kd < 10 && !p.act && !lostUs);

    // skill checks
    if (p.act && (p.act.k === 'repair' || p.act.k === 'heal' || p.act.k === 'self')) {
      b.sc -= dt;
      if (b.sc <= 0) {
        b.sc = 3 + Math.random() * 6;
        const r = Math.random();
        sim.skillResult(p, r < D.great ? 'great' : r < D.skill ? 'good' : 'miss');
      }
    }

    if (fleeing) {
      this.setE(p, b, false);
      b.crouch = false;
      this.flee(p, b, K, kd, dt);
      return;
    }
    // just broke the chase: sneak away crouched before going back to work
    if (b.alert > 2.5 && K && kd < 16 && !p.act) {
      this.setE(p, b, false);
      b.crouch = losBlocked(M, p.x, p.z, K.x, K.z);
      const ax = p.x - K.x, az = p.z - K.z, al = Math.hypot(ax, az) || 1;
      this.goTo(p, b, p.x + ax / al * 10, p.z + az / al * 10, 'sneak' + Math.round(p.x / 4) + Math.round(p.z / 4), dt, !b.crouch, 1.2);
      return;
    }
    b.fleeT = 0;

    // pick a goal
    let goal = null;
    // keep doing the current action (a repair pauses for an injured teammate standing right here, when it's safe)
    if (p.act && p.act.k === 'repair' && (!K || kd > 20 || busyElsewhere) && S.players.some(o => o !== p && o.role === 'survivor' && o.st === 'ok' && o.hp === 1 && !o.act && dist(p, o) < 3 && !avoid('heal', o.id))) this.setE(p, b, false);
    else if (p.act) { this.setE(p, b, true); this.move(p, b, 0, 0, dt, false); return; }

    const others = S.players.filter(o => o.role === 'survivor' && o !== p);
    // rescue caged teammates when the killer is away from the cage
    for (const o of others) if (o.st === 'caged') {
      const c = M.cages[o.cage];
      const kFar = !K || dist(K, c) > 11 || K.carry != null;
      const someoneElse = others.some(x => x.bot && x !== o && x.st === 'ok' && this.brain(x).mode === 'rescue' && this.brain(x).modeId === o.id && dist(x, c) < dist(p, c));
      const urgent = o.cageT < 28 || o.stage === 2;
      if ((kFar || (urgent && dist(K, c) > 5)) && !someoneElse) { goal = { mode: 'rescue', modeId: o.id, x: c.x, z: c.z, kind: 'rescue', id: o.cage }; break; }
    }
    // help downed teammates
    if (!goal) for (const o of others) if (o.st === 'down' && (!K || dist(K, o) > 12) && dist(p, o) < 40 && !avoid('help', o.id)) { goal = { mode: 'help', modeId: o.id, x: o.x, z: o.z, kind: 'heal', id: o.id }; break; }
    // snuff cursed lanterns near us when the killer is far
    if (!goal && K && kd > 22) for (const L of S.lanterns || []) {
      if (Math.hypot(L.x - p.x, L.z - p.z) < 9 && Math.random() < 0.7) { goal = { mode: 'snuff', modeId: L.id, x: L.x, z: L.z, kind: 'snuff', id: L.id }; break; }
    }
    // exit gates
    if (!goal && S.gatesPowered) {
      const open = M.gates.find(g => S.gates[g.id].open);
      if (open) goal = { mode: 'exit', x: open.x, z: open.z + open.dir * 6, kind: 'exit' };
      else {
        let best = null, bd = 1e9;
        for (const g of M.gates) { const d = Math.hypot(g.sx - p.x, g.sz - p.z) + (K ? Math.max(0, 15 - Math.hypot(K.x - g.sx, K.z - g.sz)) * 4 : 0); if (d < bd) { bd = d; best = g; } }
        goal = { mode: 'gate', x: best.sx - 0.0, z: best.sz - best.dir * 0.85, kind: 'gate', id: best.id };
      }
    }
    // heal injured teammates nearby (or get healed)
    // 1.3.2: they used to heal about once a match, so every injured bot went down on the next hit
    const safeish = !K || kd > 20 || (busyElsewhere && kd > 14);
    if (p.hp !== 1) b.waitT = 0;
    if (!goal && safeish) {
      let bestO = null, bd = 25;
      for (const o of others) if (o.st === 'ok' && o.hp === 1 && dist(p, o) < bd && (!o.act || o.act.k === 'repair') && !avoid('heal', o.id) && !(K && dist(K, o) < 14)) { bd = dist(p, o); bestO = o; }
      if (bestO) goal = { mode: 'heal', modeId: bestO.id, x: bestO.x, z: bestO.z, kind: 'heal', id: bestO.id };
    }
    // injured: go to the nearest healthy teammate (who then heals us), unless a generator is nearly done
    if (!goal && p.hp === 1 && safeish && !avoid('gethealed', 0)) {
      let mate = null, md = 45;
      for (const o of others) if (o.st === 'ok' && o.hp >= 2 && dist(p, o) < md && !(K && dist(K, o) < 16)) { md = dist(p, o); mate = o; }
      if (mate && md > 2.2) goal = { mode: 'gethealed', modeId: 0, x: mate.x, z: mate.z, kind: 'meet' };
      else if (mate) { // wait beside them a moment
        b.mode = 'gethealed'; b.modeId = 0; b.waitT = (b.waitT || 0) + dt;
        if (b.waitT > 3) { (b.avoid ||= {})['gethealed:0'] = S.t + 20; b.waitT = 0; }
        this.setE(p, b, false); this.move(p, b, 0, 0, dt, false); return;
      }
    }
    // a chest nearby: search it, and take what's in it if it beats what we're holding
    if (!goal && !threat && M.chests && S.chests) {
      const charge = itemCharge(p);
      for (const c of M.chests) {
        const cs = S.chests[c.id], d = Math.hypot(c.x - p.x, c.z - p.z);
        if (!cs || d > (charge <= 0.3 ? 12 : 6) || (K && Math.hypot(K.x - c.x, K.z - c.z) < 12) || avoid('chest', c.id)) continue; // a quick detour only
        const better = cs.open && cs.it && cs.it.n > 0.05 && ((cs.it.k === 'taser' && p.item !== 'taser') || charge <= 0.05);
        if (!cs.open || better) { goal = { mode: 'chest', modeId: c.id, x: c.x, z: c.z, kind: cs.open ? 'swap' : 'chest', id: c.id }; break; }
      }
    }
    // repair the best generator
    if (!goal) {
      let best = -1, bs = -1e9;
      for (const g of M.gens) {
        const gs = S.gens[g.id];
        if (gs.done || avoid('repair', g.id)) continue;
        const mates = S.players.filter(o => o !== p && o.role === 'survivor' && o.st === 'ok' && Math.hypot(o.x - g.x, o.z - g.z) < 3).length;
        let score = -Math.hypot(g.x - p.x, g.z - p.z) + gs.p * 30 + (mates === 1 && gs.p > 0.5 ? 6 : 0) - mates * 12 - (gs.reg ? 0 : 0);
        if (K) { const kd2 = Math.hypot(K.x - g.x, K.z - g.z); if (kd2 < 16) score -= (16 - kd2) * 3; }
        if (b.kLast && S.t - b.kLast.t < 25) { const kd3 = Math.hypot(b.kLast.x - g.x, b.kLast.z - g.z); if (kd3 < 18) score -= (18 - kd3) * 2; }
        // 1.3.2: where the team last saw her (older news counts for less)
        if (I) { const ki = Math.hypot(I.x - g.x, I.z - g.z), fresh = 1 - (S.t - I.t) / 20; if (ki < 20) score -= (20 - ki) * 1.6 * fresh; }
        // split up: a generator another bot is already walking to is taken (unless it's nearly done),
        // and generators right next to teammates count for less: four survivors on four generators
        let claims = 0, near = 99;
        for (const o of S.players) {
          if (o === p || o.role !== 'survivor' || o.st !== 'ok') continue;
          const ob = o.bot && this.brains.get(o.id);
          if (ob && ob.mode === 'repair' && ob.modeId === g.id && Math.hypot(o.x - g.x, o.z - g.z) >= 3) claims++;
          near = Math.min(near, Math.hypot(o.x - g.x, o.z - g.z));
        }
        score -= claims * (gs.p > 0.75 ? 4 : 11);
        if (near >= 3 && near < 12) score -= (12 - near) * 0.7;
        if (b.modeId === g.id && b.mode === 'repair') score += 8;
        if (score > bs) { bs = score; best = g.id; }
      }
      if (best >= 0) {
        const g = M.gens[best];
        // choose a side of the generator to work from
        const slotN = (p.id.charCodeAt(p.id.length - 1) + best) % 4;
        const offs = [[1.05, 0], [-1.05, 0], [0, 1.05], [0, -1.05]];
        let sx = g.x + offs[slotN][0], sz = g.z + offs[slotN][1];
        for (let k = 0; k < 4; k++) {
          const o = offs[(slotN + k) % 4];
          const tx = g.x + o[0], tz = g.z + o[1];
          const t = M.grid.type[cellOf(M, tx, tz)];
          if (t === 0 && !S.players.some(q => q !== p && q.role === 'survivor' && Math.hypot(q.x - tx, q.z - tz) < 0.6)) { sx = tx; sz = tz; break; }
        }
        goal = { mode: 'repair', modeId: best, x: sx, z: sz, kind: 'repair', id: best };
      }
    }
    if (!goal) { this.setE(p, b, false); this.move(p, b, 0, 0, dt, false); return; }
    b.mode = goal.mode; b.modeId = goal.modeId;
    // sneak when the killer is near-ish
    b.crouch = K && kd < 18 && !threat && goal.mode === 'repair' && Math.random() < 0.002 ? !b.crouch : (K && kd < 14 ? b.crouch : false);
    const gd = Math.hypot(goal.x - p.x, goal.z - p.z);
    const closeEnough = goal.kind === 'exit' ? false : gd < (goal.kind === 'repair' ? 1.6 : 2.2);
    if (closeEnough || (goal.kind !== 'repair' && goal.kind !== 'exit')) {
      const it = findInteraction(M, S, p);
      if (it && it.k === goal.kind && (goal.id === undefined || it.id === goal.id)) {
        // face the target before starting
        this.setE(p, b, true);
        this.move(p, b, 0, 0, dt, false);
        return;
      }
      if (closeEnough && goal.kind !== 'gate') {
        // (a generator / chest / hook: its centre; the slot beside a generator may be taken)
        const o = goal.kind === 'rescue' ? M.cages[goal.id] : goal.kind === 'repair' ? M.gens[goal.id] : (goal.kind === 'chest' || goal.kind === 'swap') ? M.chests[goal.id] : goal;
        const tx = o.x - p.x, tz = o.z - p.z;
        if (Math.hypot(tx, tz) > 0.3) { p.yaw = Math.atan2(tx, tz); this.move(p, b, tx, tz, dt, false); return; }
      }
    }
    this.setE(p, b, false);
    const sprint = goal.mode === 'rescue' || goal.mode === 'help' || goal.mode === 'exit' || goal.mode === 'gate' || !K || kd > 22 || Math.random() < 0.5;
    this.goTo(p, b, goal.x, goal.z, goal.mode + ':' + (goal.modeId ?? '') + ':' + Math.round(goal.x) + ',' + Math.round(goal.z), dt, sprint && !b.crouch, goal.mode === 'help' || goal.mode === 'heal' ? 0.5 : 1.5);
  }

  flee(p, b, K, kd, dt) {
    const sim = this.sim, S = sim.S, M = sim.M;
    // drop a barricade on the killer
    const sp = findSpace(M, S, p);
    if (sp && sp.k === 'drop' && kd < 6) {
      const bar = M.bars[sp.id];
      const myS = Math.sign(bar.axis === 'x' ? p.x - bar.x : p.z - bar.z), kS = Math.sign(bar.axis === 'x' ? K.x - bar.x : K.z - bar.z);
      const along = bar.axis === 'x' ? K.z - bar.z : K.x - bar.x, cross = bar.axis === 'x' ? K.x - bar.x : K.z - bar.z;
      const inStunZone = Math.abs(along) < bar.half + 0.4 && Math.abs(cross) < 1.25;
      if (inStunZone || (myS !== kS && kd < 5.5) || kd < 2.4) { sim.onMsg(p.id, { t: 'act', a: 'drop', id: sp.id }); b.path = null; }
    }
    b.fleeT = (b.fleeT || 0) - dt;
    // cornered (not getting anywhere): break sideways past the killer instead of pressing into the wall
    if (b.wd && b.wd.t > 1.2 && !b.cornerT) {
      const a = Math.atan2(p.x - K.x, p.z - K.z) + (Math.random() < 0.5 ? 1 : -1) * 1.7;
      b.flee = { x: p.x + Math.sin(a) * 6, z: p.z + Math.cos(a) * 6, A: null }; b.path = null; b.fleeT = 0.9; b.cornerT = 0.9;
    }
    if (b.cornerT) { b.cornerT = Math.max(0, b.cornerT - dt); this.move(p, b, b.flee.x - p.x, b.flee.z - p.z, dt, true); return; }
    const M0 = M;
    if (!b.path || b.fleeT <= 0 || b.pi >= (b.path ? b.path.length : 0)) {
      b.fleeT = kd < 9 ? 0.35 : 0.8;
      const ML = levelOf(M0, p.fl), g = ML.grid, myR = regionAt(ML, p.x, p.z);
      const free = (x, z) => { const k = cellOf(ML, x, z), t = g.type[k]; return (t === 0 || (t === 3 && S.bars[g.ref[k]] !== 1)) && (myR < 0 || regions(ML)[k] === myR); };
      let best = null, bs = -1e9;
      // 1) loop: the far side of a nearby obstacle, relative to the killer
      for (const A of (p.fl ? [] : this.anchors)) {
        const dm0 = Math.hypot(A.x - p.x, A.z - p.z);
        if (dm0 > 16) continue;
        if (A.bar != null && S.bars[A.bar] === 2) continue;
        let ux = A.x - K.x, uz = A.z - K.z; const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
        for (const rot of [0, 0.7, -0.7]) {
          const c = Math.cos(rot), sn = Math.sin(rot);
          const vx = ux * c - uz * sn, vz = ux * sn + uz * c;
          const tx = A.x + vx * (A.r + 1.3), tz = A.z + vz * (A.r + 1.3);
          if (Math.abs(tx) > (M.half || HALF) - 1.5 || Math.abs(tz) > (M.half || HALF) - 1.5 || !free(tx, tz)) continue;
          const dm = Math.hypot(tx - p.x, tz - p.z), dk = Math.hypot(tx - K.x, tz - K.z);
          if (dk < dm + 0.5) continue; // never run toward the killer
          let sc = dk - dm * 0.6 + (losBlocked(M, K.x, K.z, tx, tz) ? 7 : 0) + (A.win ? 3 : 0) + (A.bar != null ? (S.bars[A.bar] === 0 ? 9 : 4) : 0) + Math.random() * 1.5 - this.leadPenalty(p, tx, tz);
          if (b.anchor === A) sc += losBlocked(M, K.x, K.z, p.x, p.z) ? 7 : 4; // keep looping the same structure (more so while it hides us)
          if (dm < 1.6) continue;      // already here: pick the next side
          if (sc > bs) { bs = sc; best = { x: tx, z: tz, A }; }
        }
      }
      // 2) nothing to loop: run for open ground away from the killer
      if (!best || kd > 14) {
        const away = { x: p.x - K.x, z: p.z - K.z }; const al = Math.hypot(away.x, away.z) || 1; away.x /= al; away.z /= al;
        for (let i = 0; i < 14; i++) {
          const a = Math.atan2(away.x, away.z) + (Math.random() - 0.5) * 2.2, r = 9 + Math.random() * 14;
          const cx = p.x + Math.sin(a) * r, cz = p.z + Math.cos(a) * r;
          if (Math.abs(cx) > (M.half || HALF) - 2 || Math.abs(cz) > (M.half || HALF) - 2 || !free(cx, cz)) continue;
          const dk = Math.hypot(cx - K.x, cz - K.z);
          const sc = dk - r * 0.4 + (losBlocked(M, K.x, K.z, cx, cz) ? 5 : 0) + Math.random() * 2 - (best && kd <= 14 ? 6 : 0) - this.leadPenalty(p, cx, cz);
          if (sc > bs) { bs = sc; best = { x: cx, z: cz, A: null }; }
        }
      }
      if (!best) best = { x: p.x + (p.x - K.x), z: p.z + (p.z - K.z), A: null };
      b.anchor = best.A;
      b.flee = best;
      b.path = findPath(ML, p.x, p.z, best.x, best.z, this.costFn(p), 30000); b.pi = 0;
      b.goalKey = 'flee';
    }
    // no route: run straight away from the killer (sliding along walls) rather than freeze
    if (!b.path || !b.path.length) {
      const ax = p.x - K.x, az = p.z - K.z, al = Math.hypot(ax, az) || 1;
      const tx = b.flee ? b.flee.x - p.x : ax / al, tz = b.flee ? b.flee.z - p.z : az / al;
      this.move(p, b, tx, tz, dt, true); return;
    }
    // when we reach a barricade with the killer far behind, wait on the far side
    this.follow(p, b, dt, true);
  }

  // a chased survivor keeps away from teammates working on generators (it would bring the killer to them)
  leadPenalty(p, x, z) {
    let pen = 0;
    for (const o of this.sim.S.players) if (o !== p && o.role === 'survivor' && o.st === 'ok' && o.act && o.act.k === 'repair') { const d = Math.hypot(x - o.x, z - o.z); if (d < 12) pen += (12 - d) * 0.9; }
    return pen;
  }
  // easier bot killers don't take every opening: a fresh yes/no every 1.5s, likelier the harder the bot
  willing(b, D, dt) {
    b.willT = (b.willT || 0) - dt;
    if (b.willT <= 0) { b.willT = 1.5; b.will = Math.random() < D.aim; }
    return b.will;
  }
  // ---------- killer ----------
  // a possessed survivor's ghost: nobody can see or touch it, so it just keeps the generators going
  ghost(p, dt) {
    // a possessed survivor's ghost is frozen until Chucky lets go
    const b = this.brain(p); this.setE(p, b, false); this.move(p, b, 0, 0, dt, false); return;
    // eslint-disable-next-line no-unreachable
    const sim = this.sim, S = sim.S, M = sim.M;
    const it = findInteraction(M, S, p);
    if (it && it.k === 'repair') { const g = M.gens[it.id]; p.yaw = Math.atan2(g.x - p.x, g.z - p.z); this.setE(p, b, true); this.move(p, b, 0, 0, dt, false); return; }
    this.setE(p, b, false);
    let best = null, bd = 1e9;
    for (const g of M.gens) { if (S.gens[g.id].done || S.gatesPowered) continue; const d = Math.hypot(g.x - p.x, g.z - p.z); if (d < bd) { bd = d; best = g; } }
    if (best) this.goTo(p, b, best.x, best.z, 'ggen' + best.id, dt, false, 2);
    else this.move(p, b, 0, 0, dt, false);
  }

  killer(p, dt) {
    const sim = this.sim, S = sim.S, M = sim.M, b = this.brain(p), D = sim.diff;
    if (p.stun > 0) { this.setE(p, b, false); return; }
    // Chucky: split his soul into a spare doll when one generator is left
    if (p.char === 'chucky' && !p.split && !p.disguise && !p.harmless && !sim.possession && !S.gatesPowered && S.gensNeeded - S.gensDone === 1 && S.dolls.length && p.carry == null && !p.act && Math.random() < dt * 0.4) { sim.onMsg(p.id, { t: 'act', a: 'split' }); return; }
    // Chucky in a survivor's body: let them go once someone has been downed and caged
    if (p.disguise && p.pdowns >= 1 && p.pcages >= 1 && p.carry == null && !p.act) { sim.onMsg(p.id, { t: 'act', a: 'possess' }); return; }
    if (p.act) {
      // keep holding while the action continues
      this.move(p, b, 0, 0, dt, false); b.wd = null;
      return;
    }
    {
      const wd = b.wd ||= { x: p.x, z: p.z, t: 0 };
      if (b.aim || p.aim || p.tele || p.dash || p.atk || p.ab === 1 || Math.hypot(p.x - wd.x, p.z - wd.z) > 0.5) { wd.x = p.x; wd.z = p.z; wd.t = 0; }
      else wd.t += dt;
      if (wd.t > 3) {
        // stuck chasing someone it can't reach, or patrolling a spot it can't get to: let it go
        const kav = b.kAvoid ||= {};
        if (p.carry != null && b.hookGoal != null) kav['hook:' + b.hookGoal] = S.t + 20;
        if (b.downGoal != null) kav['down:' + b.downGoal] = S.t + 12;
        wd.t = 0; b.target = null; b.lastSeen = null; b.search = null; b.patrolGen = -1; b.genIdle = 0; b.hookGoal = null; b.downGoal = null;
        if (b.leaveCage) b.leaveCage.t = 0;
        b.path = null; b.repath = 0; b.side = 0.8; b.sideDir = null; b.goalKey = '';
        if (p.carry != null && (b.carryStuck = (b.carryStuck || 0) + 1) >= 3) { b.carryStuck = 0; sim.onMsg(p.id, { t: 'act', a: 'drop-carry' }); }
      }
    }
    // carrying: go to the nearest free cage
    if (p.carry != null) {
      this.setE(p, b, false);
      b.target = null;
      let best = null, bd = 1e9;
      // (stick with the hook already chosen unless another is clearly closer: no flip-flopping on ties)
      const kav = b.kAvoid || {};
      for (const c of M.cages) if (S.cages[c.id] == null && !S.cageBroken[c.id] && !(kav['hook:' + c.id] > S.t)) { const d = Math.hypot(c.x - p.x, c.z - p.z) - (c.id === b.hookGoal ? 4 : 0); if (d < bd) { bd = d; best = c; } }
      if (best) b.hookGoal = best.id;
      if (!best) { sim.onMsg(p.id, { t: 'act', a: 'drop-carry' }); return; }
      const it = findInteraction(M, S, p);
      if (it && it.k === 'cage') { p.yaw = Math.atan2(best.x - p.x, best.z - p.z); this.setE(p, b, true); this.move(p, b, 0, 0, dt, false); b.leaveCage = { x: best.x, z: best.z, t: 14 }; b.target = null; b.search = null; b.trapHook = p.char === 'grandpa' && Math.random() < 0.6; return; }
      this.goTo(p, b, best.x, best.z, 'cage' + best.id, dt, true, 2);
      return;
    }

    // perceive survivors (sight, hearing) and remember how they move
    b.vel ||= {}; b.pp ||= {};
    for (const s of S.players) {
      const pp = b.pp[s.id];
      if (pp) { const vx = (s.x - pp.x) / dt, vz = (s.z - pp.z) / dt; if (Math.hypot(vx, vz) < 12) { const v = b.vel[s.id] || { x: 0, z: 0 }; v.x += (vx - v.x) * Math.min(1, dt * 6); v.z += (vz - v.z) * Math.min(1, dt * 6); b.vel[s.id] = v; } }
      b.pp[s.id] = { x: s.x, z: s.z };
    }
    let target = null, td = 1e9;
    for (const s of S.players) {
      if (s.role !== 'survivor' || s.st !== 'ok') continue;
      const d = dist(p, s);
      const sight = s.cr && !s.mv ? D.sight * 0.45 : s.cr ? D.sight * 0.7 : D.sight;
      const vis = d < sight && !losL(M, p, s);
      const facingOk = d < 7 || Math.abs(angDiff(p.yaw, Math.atan2(s.x - p.x, s.z - p.z))) < 1.4 || b.target === s.id;
      const scent = s.hp === 1 && p.perks.includes('scent') && d < 24;
      const heard = (s.mv === 2 && !s.cr && d < 16 && !s.perks.includes('hushed')) || (s.hp === 1 && d < 9 && !s.perks.includes('hushed'));
      if ((vis && facingOk) || (d < 5 && s.mv && !s.cr) || (scent && d < 14) || s.reveal > 0 || (heard && b.target === s.id)) {
        // (caught in a trap: a free hit; fully Cursed / Heard: one hit downs; low on Grandpa's shotgun bar)
        const score = d - (b.target === s.id ? 8 : 0) - (s.hp === 1 ? 3 : 0) - (s.snare > 0 ? 10 : 0) - (p.char === 'slendrina' && s.doomed > 0 ? 7 : 0) - (p.char === 'angeline' && s.spotted > 0 ? 7 : 0) - (p.char === 'granny' && s.heard > 0 ? 5 : 0) - (p.char === 'grandpa' && (s.shp ?? 100) < 60 ? 5 : 0);
        if (score < td) { td = score; target = s; }
      }
    }
    if (b.leaveCage && b.leaveCage.t > 0) b.leaveCage.t -= dt;
    // Grandpa: a trap on the way to the hook he just used, for whoever comes to the rescue
    if (b.trapHook && b.leaveCage && p.ab2Cd <= 0 && p.carry == null && !p.act) { const dh = Math.hypot(b.leaveCage.x - p.x, b.leaveCage.z - p.z); if (dh > 2.6 && dh < 6) { b.trapHook = false; sim.onMsg(p.id, { t: 'act', a: 'ability2' }); } else if (dh >= 6) b.trapHook = false; }
    // ignore survivors around the cage we just used (no camping)
    if (target && b.leaveCage && b.leaveCage.t > 0 && Math.hypot(target.x - b.leaveCage.x, target.z - b.leaveCage.z) < 12 && dist(p, target) > 4) target = null;
    // drop a chase that has gone on too long without a hit
    if (target && b.target === target.id) { b.chaseT = (b.chaseT || 0) + dt; if (b.chaseT > 25 + D.react * 10 && target.hp === 2) { b.ignore = { id: target.id, t: 12 }; b.chaseT = 0; } } else if (target) b.chaseT = 0;
    if (b.ignore) { b.ignore.t -= dt; if (b.ignore.t <= 0) b.ignore = null; else if (target && target.id === b.ignore.id && dist(p, target) > 3) target = null; }
    if (target) { b.target = target.id; b.lastSeen = { x: target.x, z: target.z, fl: target.fl || 0 }; b.lastVel = { ...(b.vel[target.id] || { x: 0, z: 0 }) }; b.lostT = 0; }
    else if (b.target != null) {
      b.lostT += dt;
      // follow where they were heading
      if (b.lostT < 2.5 && b.lastVel) { b.lastSeen.x += b.lastVel.x * dt * 0.8; b.lastSeen.z += b.lastVel.z * dt * 0.8; }
      if (b.lostT > 7) { b.target = null; b.search = { x: b.lastSeen.x, z: b.lastSeen.z, fl: b.lastSeen.fl || 0, t: 6 }; }
    }

    // pick up downed survivors (if not mid-chase with someone close)
    let downed = null, dd = 1e9;
    if (modeOf(S) !== 'infection' && !p.harmless && !p.noCage) for (const s of S.players) if (s.role === 'survivor' && s.st === 'down' && !((b.kAvoid || {})['down:' + s.id] > S.t)) { const d = dist(p, s); if (d < dd) { dd = d; downed = s; } }
    b.downGoal = downed ? downed.id : null;
    // Chucky: sometimes possess the survivor he just put down instead of carrying them
    if (downed && sim.possessionOn && p.char === 'chucky' && !p.disguise && p.possCd <= 0 && dd < 2 && !sim.possession) {
      b.possPlan ||= {}; const key = downed.id + ':' + downed.stage;
      b.possPlan[key] ??= Math.random() < 0.6;
      if (b.possPlan[key] && !(downed.perks || []).includes('exorcist') && S.players.filter(o => o.role === 'survivor' && o.st === 'ok').length >= 2) { sim.onMsg(p.id, { t: 'act', a: 'possess' }); return; }
    }
    if (downed && (!target || dd < 18 || dist(p, target) > 6)) {
      b.target = null;
      if (p.char === 'wisp' && p.ab === 1) sim.onMsg(p.id, { t: 'act', a: 'ability' });
      // decide (once per downing) whether this one gets executed
      b.execPlan ||= {};
      const key = downed.id + ':' + downed.stage;
      if (b.execPlan[key] === undefined) {
        const alive = S.players.filter(o => o.role === 'survivor' && ['ok', 'down', 'carried', 'caged', 'exec'].includes(o.st)).length;
        b.execPlan[key] = canExecuteTarget(S, p, downed) && (alive === 1 || Math.random() < 0.55);
      }
      if (b.execPlan[key] && canExecuteTarget(S, p, downed)) {
        const ex = findExecute(M, S, p);
        if (ex && ex.id === downed.id) { this.setE(p, b, false); sim.onMsg(p.id, { t: 'act', a: 'execute', id: downed.id }); return; }
      }
      const it = findInteraction(M, S, p);
      if (it && it.k === 'pickup') { p.yaw = Math.atan2(downed.x - p.x, downed.z - p.z); this.setE(p, b, true); this.move(p, b, 0, 0, dt, false); return; }
      this.setE(p, b, false);
      b.goalFl = downed.fl || 0;
      this.goTo(p, b, downed.x, downed.z, 'down' + downed.id, dt, true, 0.5);
      return;
    }
    this.setE(p, b, false);

    // Patrick Bateman: go back for the chainsaw unless someone is right in front of him
    if (p.char === 'bateman' && p.ammo === 0 && !b.aim) {
      const sw = S.saws.find(x => x.by === p.id && x.st === 'ground');
      if (sw && !(target && dist(p, target) < 5)) { this.goTo(p, b, sw.x, sw.z, 'saw' + sw.id, dt, true, 0.5); return; }
    }

    // chase
    const chaseT = target || (b.target != null ? playerById(S, b.target) : null);
    if (chaseT && chaseT.st === 'ok') {
      let tx = target ? target.x : b.lastSeen.x, tz = target ? target.z : b.lastSeen.z;
      const d = Math.hypot(tx - p.x, tz - p.z);
      // another floor (or well above / below on the stairs): take the stairs first
      if (M.stairs) {
        const T = target || b.lastSeen, tfl = T.fl || 0;
        if (!levelsMeet(p, T) || Math.abs(heightAt(M, p) - heightAt(M, T)) > 1.7 || ((p.fl || 0) >= 10 && tfl !== p.fl && d > 2.2)) { b.goalFl = tfl; this.goTo(p, b, tx, tz, 'climb' + tfl + ':' + Math.round(tx) + ',' + Math.round(tz), dt, true, 0.6); return; }
      }
      // intercept: aim ahead of a running survivor
      const tv = target ? (b.vel[target.id] || { x: 0, z: 0 }) : { x: 0, z: 0 };
      const lead = Math.min(1.1, d / 5) * D.aim;
      let px = tx + tv.x * lead, pz = tz + tv.z * lead;
      if (levelOf(M, chaseT.fl).grid.type[cellOf(M, px, pz)] === 1) { px = tx; pz = tz; }
      // mind games: if they keep looping the same obstacle, double back to cut them off
      if (target && d < 10 && losBlocked(M, p.x, p.z, tx, tz)) b.loopT = (b.loopT || 0) + dt; else b.loopT = Math.max(0, (b.loopT || 0) - dt * 2);
      if (b.loopT > 4.5 && target) { const vl = Math.hypot(tv.x, tv.z) || 1; px = tx + tv.x / vl * 4; pz = tz + tv.z / vl * 4; if (levelOf(M, chaseT.fl).grid.type[cellOf(M, px, pz)] === 1) { px = tx; pz = tz; } if (b.loopT > 8) b.loopT = 0; }
      const ang = Math.atan2(tx - p.x, tz - p.z);
      const los = target && !losBlocked(M, p.x, p.z, tx, tz, 1.0);
      // abilities
      if (p.char === 'wisp' && p.ab === 1 && d < 6) sim.onMsg(p.id, { t: 'act', a: 'ability' });
      if (p.char === 'foreman' && !p.ab && p.ab2Cd <= 0 && target && d < 16 && d > 3) sim.onMsg(p.id, { t: 'act', a: 'ability2' });
      if (p.char === 'foreman' && p.abCd <= 0 && !p.pull && target && los && d > 6 && d < 16 && !p.atk && this.clearLine(p.x, p.z, tx, tz) && Math.random() < dt * 1.2) {
        const tv2 = b.vel[target.id] || { x: 0, z: 0 }, lead = d / 34 * D.aim;
        sim.onMsg(p.id, { t: 'act', a: 'chain', yaw: Math.atan2(tx + tv2.x * lead - p.x, tz + tv2.z * lead - p.z) + (Math.random() - 0.5) * (1.15 - D.aim) * 0.5 });
      }
      if (p.char === 'butcher' && p.ab === 0 && p.abCd <= 0 && p.charges > 0 && !p.atk && target && d > 5 && d < 15 && this.clearLine(p.x, p.z, tx, tz) && Math.abs(angDiff(p.yaw, ang)) < 0.35) sim.onMsg(p.id, { t: 'act', a: 'ability' });
      if (p.char === 'harrower' && target && los && p.abCd <= 0 && p.ammo > 0 && d > 4.5 && d < 22 && !p.atk) {
        if (!b.aim) { b.aim = true; b.aimT = 0.35 + D.react * 0.4; sim.onMsg(p.id, { t: 'in', e: false, aim: true }); }
      }
      if (p.char === 'chucky' && !p.harmless && target && los && p.abCd <= 0 && !p.leap && d > 3 && d < 7.5 && !p.atk && this.clearLine(p.x, p.z, tx, tz)) {
        // coil just long enough to reach where they will be
        const A = KILLERS.chucky.ability, AM = p.reach || A.max, lead = Math.min(d + 2.4, AM);
        if (!b.aim) { b.aim = true; b.aimT = 0.1 + Math.max(0, (lead - A.min) / (AM - A.min)) * A.coil + D.react * 0.2; sim.onMsg(p.id, { t: 'in', e: false, aim: true }); }
      }
      if (p.char === 'chucky' && !p.harmless && !target && p.ab2Cd <= 0 && Math.random() < dt * 0.15) sim.onMsg(p.id, { t: 'act', a: 'ability2' });
      if (p.char === 'granny' && !p.tele) {
        // Bat Rush: wind up just long enough to reach them, then charge
        const RB = KILLERS.granny.ability;
        if (target && los && !b.aim && !p.dash && p.abCd <= 0 && !p.ab && !p.atk && d > 3.2 && d < RB.maxDist + 0.5 && this.clearLine(p.x, p.z, tx, tz, p.fl) && this.willing(b, D, dt)) {
          const k = Math.max(0, Math.min(1, (d + 0.8 - RB.minDist) / (RB.maxDist - RB.minDist)));
          b.aim = true; b.aimT = RB.minCharge + k * (RB.maxCharge - RB.minCharge) + 0.05 + D.react * 0.15; sim.onMsg(p.id, { t: 'in', e: false, aim: true });
        }
        // a long chase: listen, so the next hit downs
        if (target && !target.heard && d > 7 && p.ab2Cd <= 0 && !p.ab && !b.aim && target.mv === 2 && Math.random() < dt * 0.5 * D.aim * D.aim) sim.onMsg(p.id, { t: 'act', a: 'ability2' });
        // Spider Mom found someone: switch bodies with her
        if (!target && sim.S.spider && sim.S.spider.st === 2 && !(p.swapCd > 0) && !p.ab && !b.aim && p.carry == null && Math.hypot(sim.S.spider.x - p.x, sim.S.spider.z - p.z) > 12) sim.onMsg(p.id, { t: 'act', a: 'bodyswap' });
        // nobody around: listen for them...
        if (!target && p.ab2Cd <= 0 && !p.ab && Math.random() < dt * 0.12 * D.aim) sim.onMsg(p.id, { t: 'act', a: 'ability2' });
        // ...and creep to a generator someone is working on, far away
        if (!target && p.teleCd <= 0 && !p.ab && p.carry == null && Math.random() < dt * 0.08) {
          const busy = sim.M.gens.filter((g, i) => sim.S.gens[i].n > 0 && !sim.S.gens[i].done && Math.hypot(g.x - p.x, g.z - p.z) > 22);
          const g = busy[Math.floor(Math.random() * busy.length)];
          if (g) sim.onMsg(p.id, { t: 'act', a: 'creep', kind: 'gen', id: g.id });
        }
      }
      if (p.char === 'grandpa' && !p.tele) {
        // raise the shotgun at range (it hits hardest from a distance), then fire
        const GS = KILLERS.grandpa.shotgun;
        if (target && los && !b.aim && p.abCd <= 0 && !p.atk && d > 5 && d < 30 && this.clearLine(p.x, p.z, tx, tz, p.fl) && this.willing(b, D, dt)) {
          b.aim = true; b.aimT = GS.raise + 0.15 + D.react * 0.35; sim.onMsg(p.id, { t: 'in', e: false, aim: true });
        }
      }
      if (p.char === 'slendrina' && !p.tele && !b.aim) {
        // Cursed Gaze when someone is close and can see her
        if (target && los && d < 18 && p.ab2Cd <= 0 && !(p.gaze > 0) && Math.random() < dt * 1.5) sim.onMsg(p.id, { t: 'act', a: 'ability2' });
        // Haunt: appear right beside them, even through a wall (only if she knows where they are)
        if (target && p.abCd <= 0 && !p.atk && d > 6 && d < KILLERS.slendrina.ability.range && (p.fl || 0) < 10 && (!los || d > 9) && this.willing(b, D, dt)) {
          b.aim = true; b.aimT = 0.2 + D.react * 0.3; sim.onMsg(p.id, { t: 'in', e: false, aim: true });
        }
      }
      if (p.char === 'angeline' && !p.tele) {
        // Yellow Eyes on whoever she can see (long enough to Spot them), then close in for the one-hit down
        if (target && los && !b.aim && p.abCd <= 0 && !p.atk && d > 2.5 && d < 14 && !(target.spotted > 0) && this.willing(b, D, dt)) {
          b.aim = true; b.aimT = 0.75 + D.react * 0.5; sim.onMsg(p.id, { t: 'in', e: false, aim: true });
        }
        // Lullaby when someone is near (they can't run from her), or now and then to slow the generators down
        if (p.ab2Cd <= 0 && ((target && d < 20) || (!target && Math.random() < dt * 0.05))) sim.onMsg(p.id, { t: 'act', a: 'ability2' });
      }
      if (p.char === 'bateman' && target && los && p.abCd <= 0 && p.ammo > 0 && d > 5 && d < 17 && !p.atk && this.clearLine(p.x, p.z, tx, tz)) {
        if (!b.aim) { b.aim = true; b.aimT = 0.45 + D.react * 0.4; sim.onMsg(p.id, { t: 'in', e: false, aim: true }); }
      }
      if (p.char === 'bateman' && target && los && p.ab2Cd <= 0 && d < 11 && Math.abs(angDiff(p.yaw, ang)) < 0.5 && Math.random() < dt * 0.8) sim.onMsg(p.id, { t: 'act', a: 'ability2' });
      if (b.aim) {
        b.aimT -= dt;
        // lead the target
        const lead = p.char === 'grandpa' || p.char === 'slendrina' || p.char === 'angeline' ? 0 : d / (p.char === 'bateman' ? 26 : p.char === 'chucky' ? 14 : p.char === 'granny' ? 13 : 32);
        const vx = target ? (target.x - (b.prevTX ?? target.x)) / Math.max(dt, 1e-3) : 0, vz = target ? (target.z - (b.prevTZ ?? target.z)) / Math.max(dt, 1e-3) : 0;
        const ax = tx + vx * lead * D.aim, az = tz + vz * lead * D.aim;
        p.yaw = Math.atan2(ax - p.x, az - p.z) + (Math.random() - 0.5) * (1 - D.aim) * 0.25;
        if (b.aimT <= 0 || !target) {
          b.aim = false;
          if (target && p.char === 'chucky') {
            sim.onMsg(p.id, { t: 'act', a: 'pounce', yaw: p.yaw });
          } else if (p.char === 'granny' || p.char === 'grandpa') {
            sim.onMsg(p.id, { t: 'act', a: 'rush', yaw: p.yaw });
          } else if (p.char === 'slendrina') {
            // just ahead of where they are running
            const tv3 = target ? (b.vel[target.id] || { x: 0, z: 0 }) : { x: 0, z: 0 };
            sim.onMsg(p.id, { t: 'act', a: 'haunt', x: tx + tv3.x * 0.6, z: tz + tv3.z * 0.6 });
          } else if (target && p.char === 'bateman') {
            // flat, fast throw: aim low enough that the arc still crosses chest height at the target
            const ft = Math.hypot(ax - p.x, az - p.z) / 26, vy = (1.1 - 1.3 + 4.5 * ft * ft) / Math.max(0.05, ft) - 2.2;
            sim.onMsg(p.id, { t: 'act', a: 'sawthrow', yaw: p.yaw, pitch: Math.asin(Math.max(-0.4, Math.min(0.4, vy / 26))) });
          } else if (target) {
            const ft = Math.hypot(ax - p.x, az - p.z) / 32, vy = (1.1 - 1.75 + 3.5 * ft * ft) / Math.max(0.05, ft);
            sim.onMsg(p.id, { t: 'act', a: 'throw', yaw: p.yaw, pitch: Math.asin(Math.max(-0.5, Math.min(0.5, vy / 32))) });
          }
          sim.onMsg(p.id, { t: 'in', e: false, aim: false });
        }
        this.move(p, b, Math.sin(ang) * (p.char === 'angeline' ? 1 : 0.4), Math.cos(ang) * (p.char === 'angeline' ? 1 : 0.4), dt, true);
        b.prevTX = target ? target.x : undefined; b.prevTZ = target ? target.z : undefined;
        return;
      }
      if (target) { b.prevTX = target.x; b.prevTZ = target.z; }
      // Grandpa: his shots hit hardest from range, so while the gun cycles he holds mid range and strafes
      if (p.char === 'grandpa' && target && los && d > 7 && d < 22 && p.abCd > 0 && !(target.snare > 0) && (target.shp ?? 100) > 0) {
        const side = Math.sin(S.t * 0.9 + p.id.length) > 0 ? 1 : -1, ax = (tx - p.x) / d, az = (tz - p.z) / d;
        const back = d < 10 ? -0.6 : d > 16 ? 0.6 : 0;
        p.yaw = Math.atan2(tx - p.x, tz - p.z);
        this.move(p, b, -az * side + ax * back, ax * side + az * back, dt, false);
        p.yaw = Math.atan2(tx - p.x, tz - p.z);
        return;
      }
      // melee
      const reach = (D.reach || 2.6) + (p.perks.includes('stalker') ? 0.4 : 0) + (p.ambush > 0 ? 1.2 : 0);
      const lungeAng = Math.atan2(tx + tv.x * 0.3 - p.x, tz + tv.z * 0.3 - p.z);
      if (target && d < reach && !p.atk && los && Math.abs(angDiff(p.yaw, lungeAng)) < 0.6) {
        p.yaw = lungeAng;
        if (!(p.char === 'wisp' && p.ab !== 0) && Math.random() < dt * (1 / Math.max(0.05, D.react * 0.25))) sim.onMsg(p.id, { t: 'act', a: 'attack' });
      }
      if (p.atk === 1 && target) { p.yaw += angDiff(p.yaw, Math.atan2(px - p.x, pz - p.z)) * Math.min(1, dt * 10); this.move(p, b, Math.sin(p.yaw), Math.cos(p.yaw), dt, true); return; }
      if (target && los && d < 4.5 && this.clearLine(p.x, p.z, px, pz)) { const pd = Math.hypot(px - p.x, pz - p.z) || 1; this.move(p, b, (px - p.x) / pd, (pz - p.z) / pd, dt, true); p.yaw += angDiff(p.yaw, Math.atan2(px - p.x, pz - p.z)) * Math.min(1, dt * 9); return; }
      // drop barricade nearby? break if it blocks the way
      const it = findInteraction(M, S, p);
      if (it && it.k === 'break') {
        const bar = M.bars[it.id];
        const myS = Math.sign(bar.axis === 'x' ? p.x - bar.x : p.z - bar.z), tS = Math.sign(bar.axis === 'x' ? tx - bar.x : tz - bar.z);
        if (myS !== tS && d < 10) { p.yaw = Math.atan2(bar.x - p.x, bar.z - p.z); this.setE(p, b, true); return; }
      }
      b.goalFl = target ? (target.fl || 0) : (b.lastSeen.fl || 0);
      this.goTo(p, b, px, pz, 'chase' + chaseT.id + ':' + Math.round(px / 2) + ',' + Math.round(pz / 2), dt, true, 0.3);
      if (!target && Math.hypot(b.lastSeen.x - p.x, b.lastSeen.z - p.z) < 1.5 && (p.fl || 0) === (b.lastSeen.fl || 0)) { b.target = null; }
      return;
    }

    // Lamplighter: shadow-step to a lantern that has revealed someone far away
    if (p.char === 'lamplighter' && p.teleCd <= 0 && !p.tele) {
      for (const L of S.lanterns) {
        const dl = Math.hypot(L.x - p.x, L.z - p.z);
        if (dl < 20) continue;
        const busyGen = M.gens.some(g => S.gens[g.id].n > 0 && Math.hypot(g.x - L.x, g.z - L.z) < 10);
        if (busyGen || S.players.some(s => s.role === 'survivor' && s.st === 'ok' && Math.hypot(s.x - L.x, s.z - L.z) < 9)) {
          sim.onMsg(p.id, { t: 'act', a: 'teleport', id: L.id, yaw: Math.atan2(L.x - p.x, L.z - p.z) });
          b.path = null; return;
        }
      }
    }
    if (p.tele) { this.move(p, b, 0, 0, dt, false); return; }
    // search where we lost them
    if (b.search && b.search.t > 0) {
      b.search.t -= dt;
      if (!b.search.pt || Math.hypot(b.search.pt.x - p.x, b.search.pt.z - p.z) < 1.5) {
        const a = Math.random() * 6.28, r = 3 + Math.random() * 7;
        b.search.pt = { x: b.search.x + Math.cos(a) * r, z: b.search.z + Math.sin(a) * r };
      }
      b.goalFl = b.search.fl || 0;
      this.goTo(p, b, b.search.pt.x, b.search.pt.z, 'search' + Math.round(b.search.pt.x) + Math.round(b.search.pt.z), dt, true, 1);
      return;
    }
    // investigate noises
    const n = this.noises.length ? this.noises[this.noises.length - 1] : null;
    if (n && Math.hypot(n.x - p.x, n.z - p.z) > 2 && S.t - n.t < 6) {
      this.goTo(p, b, n.x, n.z, 'noise' + Math.round(n.x) + ',' + Math.round(n.z), dt, true, 1.5);
      return;
    }

    // patrol generators: the one with most progress (killer hears active repairs within 40m)
    if (p.char === 'wisp' && p.ab === 0 && p.abCd <= 0) sim.onMsg(p.id, { t: 'act', a: 'ability' });
    let gi = b.patrolGen;
    if (b.leaveCage && b.leaveCage.t > 0 && gi >= 0 && Math.hypot(M.gens[gi].x - b.leaveCage.x, M.gens[gi].z - b.leaveCage.z) < 20) gi = -1;
    if (gi >= 0 && Math.hypot(M.gens[gi].x - p.x, M.gens[gi].z - p.z) < 3.2) b.genIdle = (b.genIdle || 0) + dt; else b.genIdle = 0;
    if (gi < 0 || S.gens[gi].done || b.genIdle > 2.5 || (Math.hypot(M.gens[gi].x - p.x, M.gens[gi].z - p.z) < 2.5 && (S.gens[gi].reg || S.gens[gi].p < 0.2))) {
      b.genIdle = 0;
      let bs = -1e9; gi = -1;
      for (const g of M.gens) {
        const gs = S.gens[g.id];
        if (gs.done || g.id === b.patrolGen) continue;
        if (b.leaveCage && b.leaveCage.t > 0 && Math.hypot(g.x - b.leaveCage.x, g.z - b.leaveCage.z) < 20) continue;
        const d = Math.hypot(g.x - p.x, g.z - p.z);
        const heard = gs.n > 0; // killers always know which generators are being repaired
        const s = gs.p * 25 + (heard ? 30 : 0) - d * 0.5 + Math.random() * 12;
        if (s > bs) { bs = s; gi = g.id; }
      }
      b.patrolGen = gi;
    }
    if (gi >= 0) {
      const g = M.gens[gi];
      const gdist = Math.hypot(g.x - p.x, g.z - p.z);
      if (p.char === 'grandpa' && p.ab2Cd <= 0 && gdist < 4.5 && gdist > 2 && S.gens[gi].p > 0.1 && !S.bears.some(t => Math.hypot(t.x - g.x, t.z - g.z) < 7) && Math.random() < dt * 1.2) sim.onMsg(p.id, { t: 'act', a: 'ability2' });
      if (p.char === 'slendrina' && p.abCd <= 0 && !p.tele && gdist > 22 && (p.fl || 0) < 10 && Math.random() < dt * 0.6) {
        const k = KILLERS.slendrina.ability.range / gdist;
        sim.onMsg(p.id, { t: 'in', e: false, aim: true }); sim.onMsg(p.id, { t: 'act', a: 'haunt', x: p.x + (g.x - p.x) * k, z: p.z + (g.z - p.z) * k }); sim.onMsg(p.id, { t: 'in', e: false, aim: false });
      }
      if (p.char === 'lamplighter' && p.teleCd <= 0 && !p.tele) {
        const L = S.lanterns.find(L => Math.hypot(L.x - g.x, L.z - g.z) < 10 && Math.hypot(L.x - p.x, L.z - p.z) > 22);
        if (L) { sim.onMsg(p.id, { t: 'act', a: 'teleport', id: L.id, yaw: Math.atan2(L.x - p.x, L.z - p.z) }); b.path = null; return; }
      }
      if (p.char === 'lamplighter' && p.abCd <= 0) for (const g2 of M.gens) if (!S.gens[g2.id].done && Math.hypot(g2.x - p.x, g2.z - p.z) < 6 && !S.lanterns.some(L => Math.hypot(L.x - g2.x, L.z - g2.z) < 10)) { sim.onMsg(p.id, { t: 'act', a: 'ability' }); break; }
      const it = findInteraction(M, S, p);
      if (it && it.k === 'kick' && S.gens[gi].p > 0.2) { p.yaw = Math.atan2(g.x - p.x, g.z - p.z); this.setE(p, b, true); return; }
      this.goTo(p, b, g.x, g.z, 'gen' + gi, dt, true, 2);
    } else {
      // all gens done: guard the gates
      const gt = M.gates[Math.floor(S.t / 25) % M.gates.length];
      this.goTo(p, b, gt.sx, gt.sz - gt.dir * 3, 'gate' + gt.id, dt, true, 2);
    }
  }
}
