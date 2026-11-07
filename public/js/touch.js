// Touch controls for phones and tablets: a joystick on the left, drag anywhere on the right to look,
// and buttons for each action. They feed the game's own key and mouse handlers, so every rule and
// keybind behaves exactly as on a keyboard.
export const isTouch = () => typeof window !== 'undefined' && (window.__forceTouch || (matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches) || /Android|iPhone|iPad/i.test(navigator.userAgent));

const $ = id => document.getElementById(id);
let ui = null, game = null, held = new Map(), stick = null, look = null, runOn = false, crouchOn = false, stickKeys = new Set();

const BTN = {
  // id: [label, kind, what] kind: key (tap) / hold (key held while pressed) / mouse (button held) / toggle
  atk: ['ATTACK', 'mouse', 0], power: ['POWER', 'mouse', 2], light: ['LIGHT', 'mouse', 2],
  use: ['USE', 'hold', 'KeyE'], jump: ['VAULT', 'hold', 'Space'], run: ['RUN', 'toggle', 'ShiftLeft'], crouch: ['CROUCH', 'toggle', 'ControlLeft'],
  hear: ['HEAR', 'key', 'KeyR'], creep: ['CREEP', 'hold', 'KeyG'], swap: ['SWAP', 'hold', 'KeyV'], exec: ['EXECUTE', 'key', 'KeyF'], drop: ['DROP', 'key', 'KeyQ'],
  take: ['TAKE OVER', 'key', 'KeyT'], next: ['NEXT', 'key', 'KeyF'], status: ['STATUS', 'hold', 'Tab'],
};
const LAYOUT = {
  killer: ['atk', 'power', 'use', 'jump', 'hear', 'creep', 'swap', 'exec', 'drop'],
  survivor: ['light', 'use', 'jump', 'run', 'crouch', 'status'],
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
  ui.innerHTML = `<div class="tc-look"></div><div class="tc-stick"><i></i></div><div class="tc-btns"></div><button class="tc-pause" aria-label="Pause">II</button>`;
  document.body.appendChild(ui);
  document.body.classList.add('touch');
  const lookEl = ui.querySelector('.tc-look'), stickEl = ui.querySelector('.tc-stick'), knob = stickEl.querySelector('i');
  // left half: a joystick that appears where the thumb lands
  lookEl.addEventListener('pointerdown', e => {
    e.preventDefault();
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
}

function layout(kind) {
  const box = ui.querySelector('.tc-btns');
  if (box.dataset.kind === kind) return;
  // let go of anything held from the old layout
  for (const [id] of held) press(id, false); held.clear();
  box.dataset.kind = kind;
  box.innerHTML = LAYOUT[kind].map(id => `<button data-b="${id}" class="tc-b tc-${id}">${BTN[id][0]}</button>`).join('');
  box.querySelectorAll('button').forEach(b => {
    const id = b.dataset.b;
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); b.setPointerCapture(e.pointerId); b.classList.add('down'); held.set(id, e.pointerId); press(id, true); });
    const up = e => { if (held.get(id) !== e.pointerId) return; b.classList.remove('down'); held.delete(id); press(id, false); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  });
  syncToggles();
}

export function initTouch() {
  if (!isTouch()) return;
  build();
  setInterval(() => {
    const s = window.__nb && window.__nb.session, g = s && s.game;
    const on = !!(g && !g.disposed && !g.paused && !g.endShown && !$('hud').classList.contains('hidden'));
    if (g !== game) { game = g || null; runOn = false; crouchOn = false; stickKeys.clear(); held.clear(); if (game) game.touch = true; }
    ui.classList.toggle('hidden', !on);
    if (!on) return;
    const me = g.mine && g.mine();
    layout(!me || me.st === 'dead' || me.st === 'out' || me.st === 'ghost' ? 'dead' : me.role === 'killer' ? 'killer' : 'survivor');
  }, 200);
}
