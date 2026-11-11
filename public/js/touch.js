// Touch controls for phones and tablets: a joystick on the left, drag anywhere on the right to look,
// and buttons for each action. They feed the game's own key and mouse handlers, so every rule and
// keybind behaves exactly as on a keyboard.
export const isTouch = () => typeof window !== 'undefined' && (window.__forceTouch || (matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches) || /Android|iPhone|iPad/i.test(navigator.userAgent));

// Mobile mode (phones, tablets and the Android app): every control the game names is one of these buttons,
// never a key or a mouse button.
export const MOBILE = isTouch();
if (MOBILE && typeof document !== 'undefined') document.documentElement.classList.add('mobile');
const R_BTN = { granny: 'HEAR', grandpa: 'TRAP', slendrina: 'GAZE', angeline: 'LULLABY' };
let ctxRole = 'survivor', ctxChar = 'mara';
export function setTouchCtx(role, char) { ctxRole = role || ctxRole; ctxChar = char || ctxChar; }
// an action (keybind id, or 'LMB' / 'RMB' / 'V') -> the name of the on-screen button that does it
export function touchName(id) {
  switch (id) {
    case 'forward': case 'back': case 'left': case 'right': return 'JOYSTICK';
    case 'run': return 'RUN'; case 'crouch': return 'CROUCH'; case 'interact': return 'USE'; case 'space': return 'VAULT';
    case 'item': return 'CREEP'; case 'ability2': return R_BTN[ctxChar] || 'POWER 2'; case 'drop': return 'DROP';
    case 'execute': return ctxRole === 'killer' ? 'EXECUTE' : 'NEXT'; case 'takeover': return 'TAKE OVER'; case 'status': return 'STATUS';
    case 'emotes': return 'EMOTE'; case 'shoulder': return 'CAMERA';
    case 'LMB': return 'ATTACK'; case 'RMB': return ctxRole === 'killer' ? 'POWER' : 'LIGHT'; case 'V': return 'SWAP';
  }
  return id;
}
// rewrite text written for a keyboard ("Hold G", "Press R", "click") for the touch buttons
export function mobileText(s, char) {
  if (!MOBILE || typeof s !== 'string') return s;
  const key = { G: 'CREEP', V: 'SWAP', R: R_BTN[char] || 'POWER 2', F: 'EXECUTE', Q: 'DROP', E: 'USE', T: 'TAKE OVER' };
  return s.replace(/\b(Hold|hold|Press|press|Tap|tap) ([GVRFQET])\b/g, (m, v, k) => `${/^[Pp]/.test(v) ? (v[0] === 'P' ? 'Tap' : 'tap') : v} ${key[k]}`)
    .replace(/\brelease ([GVR])\b/g, (m, k) => 'release ' + key[k])
    .replace(/\b([Cc])lick/g, (m, c) => c === 'C' ? 'Tap' : 'tap')
    .replace(/\bRMB\b/g, R_BTN[char] ? 'POWER' : 'LIGHT').replace(/\bLMB\b/g, 'ATTACK');
}

import { icon } from './icons.js';
const $ = id => document.getElementById(id);
// 1.3.3: every touch button shows a picture as well as its name (64x64 line art like icons.js)
const SV = body => `<svg class="ico" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const TC_ICONS = {
  use: SV('<path d="M24 34V14a4 4 0 0 1 8 0v16M32 28V10a4 4 0 0 1 8 0v18M40 28V14a4 4 0 0 1 8 0v20c0 12-7 20-17 20-7 0-11-4-15-10l-6-10a4 4 0 0 1 7-4l5 6"/>'),
  jump: SV('<path d="M6 52h52"/><path d="M22 52V40h20v12"/><circle cx="16" cy="14" r="5"/><path d="M12 30c6-10 18-14 30-10l8 6M18 22l-6 12 8 4M42 20l4 12"/>'),
  run: SV('<circle cx="38" cy="10" r="5"/><path d="M30 20l-10 6-6 10M30 20l8 10 10 2M30 20l-4 14 10 8-2 14M26 34l-10 8-8 0"/>'),
  crouch: SV('<circle cx="30" cy="18" r="5"/><path d="M28 26l-8 12 12 4 6 14M28 26l10 8 10-2M20 38l-8 12"/>'),
  status: SV('<path d="M14 14h36M14 26h36M14 38h24M14 50h18"/><circle cx="48" cy="46" r="7"/>'),
  emote: SV('<circle cx="32" cy="32" r="22"/><circle cx="24" cy="27" r="2.6"/><circle cx="40" cy="27" r="2.6"/><path d="M22 38c6 8 14 8 20 0"/>'),
  hear: SV('<path d="M22 44c0 6 4 10 9 10 6 0 8-6 10-10 3-6 9-8 9-18a18 18 0 0 0-36 0"/><path d="M26 28a6 6 0 0 1 12 0c0 6-6 6-6 12"/><path d="M52 14l6-4M54 26h6"/>'),
  lull: SV('<path d="M24 46V14l26-6v32"/><ellipse cx="18" cy="46" rx="7" ry="5"/><ellipse cx="44" cy="40" rx="7" ry="5"/><path d="M24 24l26-6"/>'),
  creep: SV('<ellipse cx="20" cy="40" rx="6" ry="9"/><ellipse cx="44" cy="22" rx="6" ry="9"/><circle cx="16" cy="27" r="2"/><circle cx="21" cy="26" r="2"/><circle cx="26" cy="27" r="2"/><circle cx="40" cy="9" r="2"/><circle cx="45" cy="8" r="2"/><circle cx="50" cy="9" r="2"/>'),
  swap: SV('<path d="M12 22h36l-8-8M52 42H16l8 8"/>'),
  drop: SV('<path d="M32 10v32M20 32l12 12 12-12M14 54h36"/>'),
  take: SV('<circle cx="32" cy="16" r="6"/><path d="M22 54l4-20h12l4 20M10 28a24 24 0 0 1 8-12M54 28a24 24 0 0 0-8-12"/>'),
  next: SV('<path d="M14 32h34M36 18l14 14-14 14"/>'),
  bat: SV('<path d="M14 52l6 6 30-34a9 9 0 0 0-12-12z"/><path d="M14 52l-4 4"/><path d="M40 16l8 8" stroke-dasharray="3 4"/>'),
  ghost: SV('<path d="M16 54V28a16 16 0 0 1 32 0v26l-6-5-5 5-5-5-5 5-5-5z"/><circle cx="26" cy="28" r="3"/><circle cx="38" cy="28" r="3"/>'),
};
const POWER_PIC = { granny: 'bat', grandpa: 'shotgun', slendrina: 'ghost', angeline: 'eyes' };
function picOf(id, kind) {
  if (id === 'power') { const c = (kind || '').split('-')[1] || ctxChar; const k = POWER_PIC[c] || 'bat'; return TC_ICONS[k] || icon(k); }
  const lib = { atk: 'claws', light: 'flashlight', trap: 'beartrap', gaze: 'gaze', exec: 'exec' };
  return lib[id] ? icon(lib[id]) : TC_ICONS[id] || '';
}
const btnHTML = (id, label, kind) => `<span class="tc-ic">${picOf(id, kind)}</span><span class="tc-lb">${label}</span>`;
let ui = null, game = null, held = new Map(), stick = null, look = null, runOn = false, crouchOn = false, stickKeys = new Set();
// 1.3.3: USE latches during a repair / heal (both thumbs free for skill checks); skill checks take a tap anywhere
let useLatched = false, scSeen = 0;
try { scSeen = +localStorage.getItem('gdbd_sc_seen') || 0; } catch {}
const skillUp = () => !!(game && game.skill && game.skill.phase === 'active');
function hitSkill() { if (!skillUp()) return false; try { game.resolveSkill(); } catch (e) { console.warn(e); } flashHint(); return true; }
const working = () => { const me = game && game.mine && game.mine(); return !!(me && me.act && (me.act.k === 'repair' || me.act.k === 'heal' || me.act.k === 'self')); };
function unlatch() { if (!useLatched) return; useLatched = false; key('KeyE', false); ui && ui.querySelector('[data-b=use]')?.classList.remove('on'); }

const BTN = {
  // id: [label, kind, what] kind: key (tap) / hold (key held while pressed) / mouse (button held) / toggle
  atk: ['ATTACK', 'mouse', 0], power: ['POWER', 'mouse', 2], light: ['LIGHT', 'mouse', 2],
  use: ['USE', 'hold', 'KeyE'], jump: ['VAULT', 'hold', 'Space'], run: ['RUN', 'toggle', 'ShiftLeft'], crouch: ['CROUCH', 'toggle', 'ControlLeft'],
  hear: ['HEAR', 'key', 'KeyR'], trap: ['TRAP', 'key', 'KeyR'], gaze: ['GAZE', 'key', 'KeyR'], lull: ['LULLABY', 'key', 'KeyR'], creep: ['CREEP', 'hold', 'KeyG'], swap: ['SWAP', 'hold', 'KeyV'], exec: ['EXECUTE', 'key', 'KeyF'], drop: ['DROP', 'key', 'KeyQ'],
  take: ['TAKE OVER', 'key', 'KeyT'], next: ['NEXT', 'key', 'KeyF'], status: ['STATUS', 'hold', 'Tab'], emote: ['EMOTE', 'key', 'KeyB'],
};
// 1.3.3: players can move / resize the buttons (Settings > Edit touch controls). Saved per device:
// pos['survivor:use'] = { x, y, s } (button centre as a fraction of the screen, its own size), scale = all buttons, op = opacity
const TL_KEY = 'gdbd_touchlayout';
let TL = { pos: {}, scale: 1, op: 1 };
try { const t = JSON.parse(localStorage.getItem(TL_KEY) || 'null'); if (t && typeof t === 'object') TL = { pos: t.pos || {}, scale: +t.scale || 1, op: +t.op || 1 }; } catch {}
const saveTL = () => { try { localStorage.setItem(TL_KEY, JSON.stringify(TL)); } catch {} };
const groupOf = kind => kind.startsWith('killer') ? 'killer' : kind;
const slotOf = id => ['hear', 'trap', 'gaze', 'lull'].includes(id) ? 'rpower' : id; // the four killers' R buttons share one spot
function applyLayout(box, kind) {
  if (ui) ui.style.setProperty('--tc-op', TL.op);
  const g = groupOf(kind);
  box.querySelectorAll('.tc-b').forEach(b => {
    const p = TL.pos[g + ':' + slotOf(b.dataset.b)];
    if (p) { b.classList.add('placed'); b.style.left = (p.x * 100) + '%'; b.style.top = (p.y * 100) + '%'; b.style.zoom = ''; b.style.transform = `translate(-50%, -50%) scale(${(p.s || 1) * TL.scale})`; }
    else { b.classList.remove('placed'); b.style.left = b.style.top = b.style.transform = ''; b.style.zoom = TL.scale !== 1 ? TL.scale : ''; }
  });
}
const LAYOUT = {
  killer: ['atk', 'power', 'use', 'jump', 'hear', 'creep', 'swap', 'exec', 'drop'],
  'killer-grandpa': ['atk', 'power', 'use', 'jump', 'trap', 'exec', 'drop'],
  'killer-slendrina': ['atk', 'power', 'use', 'jump', 'gaze', 'exec', 'drop'],
  'killer-angeline': ['atk', 'power', 'use', 'jump', 'lull', 'exec', 'drop'],
  survivor: ['light', 'use', 'jump', 'run', 'crouch', 'status', 'emote'],
  dead: ['take', 'next', 'status'],
};

function key(code, down) {
  if (!game) return;
  try { game.onKeyCode({ code, repeat: false, target: document.body, preventDefault() {} }, down); } catch (e) { console.warn(e); }
}
function mouse(button, down) { if (game) try { game.onMouse({ button, preventDefault() {} }, down); } catch (e) { console.warn(e); } }

function press(id, down) {
  const [, kind, what] = BTN[id];
  if (kind === 'mouse') mouse(what, down);
  else if (kind === 'hold') key(what, down);
  else if (kind === 'key') { if (down) { key(what, true); setTimeout(() => key(what, false), 60); } }
  else if (kind === 'toggle' && down) {
    if (id === 'run') { runOn = !runOn; key(what, runOn); }
    else { crouchOn = !crouchOn; key(what, crouchOn); }
    syncToggles();
  }
}
function syncToggles() {
  if (!ui) return;
  ui.querySelector('[data-b=run]')?.classList.toggle('on', runOn);
  ui.querySelector('[data-b=crouch]')?.classList.toggle('on', crouchOn);
}

function build() {
  ui = document.createElement('div'); ui.id = 'touch'; ui.className = 'hidden';
  ui.innerHTML = `<div class="tc-look"></div><div class="tc-stick"><i></i></div><div class="tc-btns"></div><button class="tc-pause" aria-label="Pause">II</button><div class="tc-sc hidden"><b>TAP ANYWHERE</b><span>when the needle hits the white zone</span></div>`;
  document.body.appendChild(ui);
  document.body.classList.add('touch');
  const lookEl = ui.querySelector('.tc-look'), stickEl = ui.querySelector('.tc-stick'), knob = stickEl.querySelector('i');
  // left half: a joystick that appears where the thumb lands
  lookEl.addEventListener('pointerdown', e => {
    e.preventDefault();
    // a skill check is up: this tap is the hit (left thumb while the right holds USE, or anywhere)
    if (hitSkill()) return;
    if (e.clientX < innerWidth * 0.42 && !stick) {
      stick = { id: e.pointerId, x: e.clientX, y: e.clientY };
      stickEl.style.left = e.clientX + 'px'; stickEl.style.top = e.clientY + 'px'; stickEl.classList.add('on'); knob.style.transform = '';
    } else if (!look) look = { id: e.pointerId, x: e.clientX, y: e.clientY };
    lookEl.setPointerCapture(e.pointerId);
  });
  lookEl.addEventListener('pointermove', e => {
    if (stick && e.pointerId === stick.id) {
      const R = 64, dx = e.clientX - stick.x, dy = e.clientY - stick.y, m = Math.hypot(dx, dy), k = Math.min(1, m / R);
      const nx = m ? dx / m * k : 0, ny = m ? dy / m * k : 0;
      knob.style.transform = `translate(${nx * R}px, ${ny * R}px)`;
      const want = new Set();
      if (k > 0.55 && useLatched) unlatch(); // walking away from the generator stops the repair
      if (k > 0.3) { if (ny < -0.38) want.add('KeyW'); if (ny > 0.38) want.add('KeyS'); if (nx < -0.38) want.add('KeyA'); if (nx > 0.38) want.add('KeyD'); }
      // pushing the stick all the way runs (survivors), unless RUN is already on
      if (!runOn) { const full = k > 0.95; if (full !== stickKeys.has('ShiftLeft')) key('ShiftLeft', full); if (full) want.add('ShiftLeft'); }
      for (const c of stickKeys) if (!want.has(c) && c !== 'ShiftLeft') key(c, false);
      for (const c of want) if (!stickKeys.has(c) && c !== 'ShiftLeft') key(c, true);
      stickKeys = want;
    } else if (look && e.pointerId === look.id && game) {
      const s = 1.9;
      game.mdx += (e.clientX - look.x) * s; game.mdy += (e.clientY - look.y) * s;
      look.x = e.clientX; look.y = e.clientY;
    }
  });
  const end = e => {
    if (stick && e.pointerId === stick.id) { for (const c of stickKeys) key(c, false); stickKeys.clear(); stick = null; stickEl.classList.remove('on'); }
    if (look && e.pointerId === look.id) look = null;
  };
  lookEl.addEventListener('pointerup', end); lookEl.addEventListener('pointercancel', end);
  ui.querySelector('.tc-pause').addEventListener('click', () => key('Escape', true));
  // skill checks: tap the dial itself (or the VAULT button, which reads HIT! while one is up)
  const sk = $('skill');
  if (sk) sk.addEventListener('pointerdown', e => { e.preventDefault(); key('Space', true); setTimeout(() => key('Space', false), 60); });
}

function layout(kind) {
  const box = ui.querySelector('.tc-btns');
  if (box.dataset.kind === kind) return;
  // let go of anything held from the old layout
  for (const [id] of held) press(id, false); held.clear();
  box.dataset.kind = kind;
  box.innerHTML = LAYOUT[kind].map(id => `<button data-b="${id}" class="tc-b tc-${id}">${btnHTML(id, BTN[id][0], kind)}</button>`).join('');
  box.querySelectorAll('button').forEach(b => {
    const id = b.dataset.b;
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      // a skill check is up: any button is the hit (and USE stays held / latched)
      if (skillUp() && (id !== 'use' || useLatched || held.has('use'))) { hitSkill(); return; }
      if (id === 'use' && useLatched) { unlatch(); return; } // tap USE again to stop
      b.setPointerCapture(e.pointerId); b.classList.add('down'); held.set(id, e.pointerId); press(id, true);
    });
    const up = e => {
      if (held.get(id) !== e.pointerId) return; b.classList.remove('down'); held.delete(id);
      // let go of USE in the middle of a repair / heal: it keeps going (latched) until you move or tap USE
      if (id === 'use' && (working() || (game && game.skill))) { useLatched = true; b.classList.add('on'); return; }
      press(id, false);
    };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  });
  applyLayout(box, kind);
  syncToggles();
}

// ---------- the layout editor ----------
const EDIT_SETS = { survivor: LAYOUT.survivor, killer: ['atk', 'power', 'use', 'jump', 'hear', 'creep', 'swap', 'exec', 'drop'] };
export function openTouchEditor(onClose) {
  const W = { pos: JSON.parse(JSON.stringify(TL.pos)), scale: TL.scale, op: TL.op };
  let group = 'survivor', sel = null;
  const ed = document.createElement('div'); ed.id = 'tc-editor';
  ed.innerHTML = `<div class="te-bar"><b>Touch controls</b><div class="te-tabs"><button data-g="survivor">Survivor</button><button data-g="killer">Killer</button></div>
      <label>All buttons <input type="range" class="te-all" min="0.7" max="1.5" step="0.05"></label>
      <label>Selected <input type="range" class="te-one" min="0.6" max="1.8" step="0.05" disabled></label>
      <label>Opacity <input type="range" class="te-op" min="0.25" max="1" step="0.05"></label>
      <button class="te-reset">Reset</button><button class="te-done">Done</button></div>
    <p class="te-tip">Drag a button to move it. Tap a button, then use “Selected” to resize it.</p>
    <div class="te-area"><div class="te-measure"></div></div>`;
  document.body.appendChild(ed);
  const area = ed.querySelector('.te-area'), meas = ed.querySelector('.te-measure');
  const all = ed.querySelector('.te-all'), one = ed.querySelector('.te-one'), op = ed.querySelector('.te-op');
  all.value = W.scale; op.value = W.op;
  function render() {
    ed.querySelectorAll('.te-tabs button').forEach(b => b.classList.toggle('on', b.dataset.g === group));
    area.querySelectorAll('.tc-b').forEach(b => b.remove());
    // where the buttons sit by default: lay them out like the game does and measure
    meas.innerHTML = EDIT_SETS[group].map(id => `<button data-b="${id}" class="tc-b tc-${id}">${btnHTML(id, BTN[id][0], group === 'killer' ? 'killer-granny' : group)}</button>`).join('');
    const def = {}; meas.querySelectorAll('.tc-b').forEach(b => { const r = b.getBoundingClientRect(); def[b.dataset.b] = { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight }; });
    area.style.setProperty('--tc-op', W.op);
    for (const id of EDIT_SETS[group]) {
      const k = group + ':' + slotOf(id), p = W.pos[k] || { ...def[id], s: 1 };
      const b = document.createElement('button'); b.className = `tc-b tc-${id} placed` + (sel === k ? ' sel' : ''); b.dataset.b = id; b.innerHTML = btnHTML(id, id === 'hear' ? 'POWER 2' : BTN[id][0], group === 'killer' ? 'killer-granny' : group);
      const place = () => { b.style.left = (p.x * 100) + '%'; b.style.top = (p.y * 100) + '%'; b.style.transform = `translate(-50%, -50%) scale(${(p.s || 1) * W.scale})`; };
      place();
      let drag = null;
      b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); drag = { x0: e.clientX, y0: e.clientY, px: p.x, py: p.y, moved: false }; sel = k; one.disabled = false; one.value = p.s || 1; area.querySelectorAll('.tc-b').forEach(o => o.classList.toggle('sel', o === b)); });
      b.addEventListener('pointermove', e => { if (!drag) return; const dx = (e.clientX - drag.x0) / innerWidth, dy = (e.clientY - drag.y0) / innerHeight; if (Math.abs(dx) + Math.abs(dy) > 0.004) drag.moved = true;
        p.x = Math.min(0.97, Math.max(0.03, drag.px + dx)); p.y = Math.min(0.96, Math.max(0.1, drag.py + dy)); W.pos[k] = p; place(); });
      const end = () => { if (drag) { W.pos[k] = p; drag = null; } };
      b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
      b._p = p; b._place = place; b._k = k;
      area.appendChild(b);
    }
  }
  ed.querySelectorAll('.te-tabs button').forEach(b => b.onclick = () => { group = b.dataset.g; sel = null; one.disabled = true; render(); });
  all.oninput = () => { W.scale = +all.value; area.querySelectorAll('.tc-b.placed').forEach(b => b._place && b._place()); };
  op.oninput = () => { W.op = +op.value; area.style.setProperty('--tc-op', W.op); };
  one.oninput = () => { const b = [...area.querySelectorAll('.tc-b')].find(o => o._k === sel); if (!b) return; b._p.s = +one.value; W.pos[sel] = b._p; b._place(); };
  ed.querySelector('.te-reset').onclick = () => { for (const k of Object.keys(W.pos)) if (k.startsWith(group + ':')) delete W.pos[k]; W.scale = 1; W.op = 1; all.value = 1; op.value = 1; sel = null; one.disabled = true; render(); };
  ed.querySelector('.te-done').onclick = () => {
    // a layout that was touched is saved whole (every button of that group gets its spot), so nothing overlaps later
    for (const g of Object.keys(EDIT_SETS)) if (Object.keys(W.pos).some(k => k.startsWith(g + ':'))) {
      group = g; render(); area.querySelectorAll('.tc-b').forEach(b => { W.pos[b._k] = b._p; });
    }
    TL = { pos: W.pos, scale: W.scale, op: W.op }; saveTL();
    ed.remove();
    if (ui) { const box = ui.querySelector('.tc-btns'); box.dataset.kind = ''; }
    onClose && onClose();
  };
  render();
}

export function initTouch() {
  if (!isTouch()) return;
  build();
  setInterval(() => {
    const s = window.__nb && window.__nb.session, g = s && s.game;
    const on = !!(g && !g.disposed && !g.paused && !g.endShown && !$('hud').classList.contains('hidden'));
    if (g !== game) { game = g || null; runOn = false; crouchOn = false; useLatched = false; stickKeys.clear(); held.clear(); if (game) game.touch = true; }
    ui.classList.toggle('hidden', !on);
    if (!on) return;
    const me = g.mine && g.mine();
    if (me) setTouchCtx(me.st === 'dead' || me.st === 'out' ? 'spectator' : me.role, me.char);
    layout(!me || me.st === 'dead' || me.st === 'out' || me.st === 'ghost' ? 'dead' : me.role === 'killer' ? (LAYOUT['killer-' + me.char] ? 'killer-' + me.char : 'killer') : 'survivor');
    const jb = ui.querySelector('[data-b=jump]'), skill = $('skill') && !$('skill').classList.contains('hidden');
    const jl = jb && jb.querySelector('.tc-lb'); if (jl) jl.textContent = skill ? 'HIT!' : 'VAULT';
    if (useLatched && !working() && !(g.skill)) unlatch();
    scHint(g);
  }, 200);
}

// the skill-check prompt: what to do, said plainly (players didn't know); shorter once they've done a few
let lastSc = null;
function scHint(g) {
  const el = ui && ui.querySelector('.tc-sc'); if (!el) return;
  const s = g && g.skill, show = !!(s && (s.phase === 'warn' || s.phase === 'active'));
  el.classList.toggle('hidden', !show);
  if (!show) { lastSc = null; return; }
  if (s !== lastSc) { lastSc = s; scSeen++; try { localStorage.setItem('gdbd_sc_seen', scSeen); } catch {} }
  const brief = scSeen > 6;
  el.classList.toggle('warn', s.phase === 'warn'); el.classList.toggle('brief', brief);
  el.querySelector('b').textContent = s.phase === 'warn' ? 'GET READY…' : brief ? 'TAP!' : 'TAP ANYWHERE';
  el.querySelector('span').textContent = s.phase === 'warn' ? 'a skill check is coming' : brief ? '' : 'when the needle hits the white zone';
}
function flashHint() { const el = ui && ui.querySelector('.tc-sc'); if (el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); } }
