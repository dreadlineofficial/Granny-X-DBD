// Granny x DBD desktop app: the game runs in its own bundled engine (Electron/Chromium), fully offline.
//
// It has to start on any Windows PC, so it is defensive:
//  - a splash window appears straight away and stays up until the game has painted its first frame,
//    so there is never a moment where the player double-clicked and sees nothing
//  - one copy at a time (a second double-click focuses the open window instead of starting a second engine)
//  - if the graphics driver crashes (the GPU process dies, or the page dies), the app restarts itself in
//    Safe Graphics mode: no hardware acceleration, WebGL in software (SwiftShader). Slower, but it runs.
//    Safe mode sticks for later launches; start with --gpu to try the graphics card again.
//    In the portable .exe the restart goes through the portable launcher (PORTABLE_EXECUTABLE_FILE): the
//    launcher deletes the unpacked app as soon as the first process exits, so restarting the unpacked
//    copy directly left a half-deleted app that never opened.
//  - everything that goes wrong is written to log.txt in the app's data folder (%APPDATA%\Granny x DBD)
const { app, BrowserWindow, shell, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const dataDir = app.getPath('userData');
const logFile = path.join(dataDir, 'log.txt'), safeFlag = path.join(dataDir, 'safe-graphics');
function log(...a) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    try { if (fs.statSync(logFile).size > 512 * 1024) fs.renameSync(logFile, logFile + '.old'); } catch {}
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${a.join(' ')}\n`);
  } catch {}
}
process.on('uncaughtException', e => { log('main error:', e && e.stack || e); });

const VERSION = app.getVersion();
const portableExe = process.env.PORTABLE_EXECUTABLE_FILE || '';
const argv = process.argv.slice(1);
if (argv.includes('--gpu')) { try { fs.unlinkSync(safeFlag); } catch {} }
const safe = argv.includes('--safe-graphics') || fs.existsSync(safeFlag);
log(`start v${VERSION} electron ${process.versions.electron} windows ${os.release()} ${os.arch()}`,
  portableExe ? 'portable' : 'unpacked', safe ? 'safe-graphics' : 'gpu', 'from', process.execPath);
if (safe) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('use-angle', 'swiftshader');
} else app.commandLine.appendSwitch('ignore-gpu-blocklist'); // use the GPU even on older drivers Chromium is wary of
app.commandLine.appendSwitch('enable-unsafe-swiftshader');      // software WebGL is allowed as a fallback
app.commandLine.appendSwitch('disable-renderer-backgrounding'); // an online host keeps running when alt-tabbed
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
Menu.setApplicationMenu(null);

let splash = null;
function splashMsg(m, hint) {
  if (!splash || splash.isDestroyed()) return;
  splash.webContents.executeJavaScript(`window.setMsg && setMsg(${JSON.stringify(m || '')}, ${JSON.stringify(hint == null ? null : hint)})`).catch(() => {});
}

// restart in Safe Graphics mode (once): the graphics driver could not run the game
let restarting = false;
function toSafeMode(why) {
  if (safe || restarting) return false;
  restarting = true;
  log('switching to Safe Graphics mode:', why);
  splashMsg('Restarting in Safe Graphics mode…', 'Your graphics driver could not run the game, so it will use software graphics.');
  try { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(safeFlag, why); } catch {}
  const args = [...argv.filter(a => a !== '--gpu' && a !== '--safe-graphics'), '--safe-graphics'];
  // portable .exe: restart the launcher itself, which unpacks a fresh copy (see the note at the top)
  if (portableExe && fs.existsSync(portableExe)) app.relaunch({ execPath: portableExe, args });
  else app.relaunch({ args });
  app.exit(0);
  return true;
}

if (!app.requestSingleInstanceLock()) { log('another copy is already running: handing over to it'); app.quit(); }
else {
  let win = null;
  app.on('second-instance', () => {
    if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
    else if (splash && !splash.isDestroyed()) splash.focus();
    else if (app.isReady()) create();
  });

  const gpuCrashes = [];
  app.on('child-process-gone', (e, d) => {
    log('child process gone:', d.type, d.reason, d.exitCode);
    if (d.type === 'GPU' && d.reason !== 'clean-exit') {
      const now = Date.now(); gpuCrashes.push(now);
      while (gpuCrashes.length && now - gpuCrashes[0] > 60000) gpuCrashes.shift();
      if (gpuCrashes.length >= 2) toSafeMode('graphics process crashed ' + gpuCrashes.length + ' times');
    }
  });

  function makeSplash() {
    try {
      splash = new BrowserWindow({
        width: 720, height: 320, frame: false, resizable: false, maximizable: false, fullscreenable: false,
        show: false, center: true, backgroundColor: '#050304', title: 'Granny x DBD', icon: path.join(__dirname, 'icon.png'),
        webPreferences: { contextIsolation: true, sandbox: true, spellcheck: false },
      });
      splash.once('ready-to-show', () => { if (splash && !splash.isDestroyed()) splash.show(); });
      setTimeout(() => { if (splash && !splash.isDestroyed() && !splash.isVisible()) splash.show(); }, 1500);
      splash.on('closed', () => { splash = null; });
      splash.loadFile(path.join(__dirname, 'splash', 'splash.html'), { query: { v: VERSION, m: safe ? 'Starting in Safe Graphics mode…' : 'Waking Granny up…' } })
        .catch(e => log('splash load error:', e && e.message));
    } catch (e) { log('splash error:', e && e.message); splash = null; }
  }
  function closeSplash() {
    const s = splash; splash = null;
    if (s && !s.isDestroyed()) setTimeout(() => { if (!s.isDestroyed()) s.destroy(); }, 250);
  }

  function create() {
    const t0 = Date.now();
    win = new BrowserWindow({
      width: 1280, height: 760, minWidth: 960, minHeight: 600, show: false, backgroundColor: '#050405',
      title: 'Granny x DBD', icon: path.join(__dirname, 'icon.png'), autoHideMenuBar: true,
      webPreferences: { backgroundThrottling: false, contextIsolation: true, sandbox: true, spellcheck: false },
    });
    let shown = false;
    const show = why => {
      if (shown || !win || win.isDestroyed()) return; shown = true;
      log('game window shown after', Date.now() - t0, 'ms (' + why + ')');
      win.maximize(); win.show(); win.focus(); closeSplash();
    };
    win.once('ready-to-show', () => show('ready'));
    // slow PCs: keep the splash up and say so; show the window anyway after a while so nobody waits on nothing
    setTimeout(() => { if (!shown) splashMsg(null, 'First start on this PC can take a little longer…'); }, 12000);
    setTimeout(() => show('timeout'), 45000);
    win.webContents.on('did-start-loading', () => splashMsg('Loading the house…'));
    win.webContents.on('dom-ready', () => splashMsg('Almost there…'));
    win.loadFile(path.join(__dirname, 'app', 'index.html')).catch(e => log('load error:', e && e.message));
    win.webContents.on('did-fail-load', (e, code, desc, url) => {
      log('did-fail-load', code, desc, url);
      if (code === -3 || restarting) return; // aborted (a reload / restart): harmless
      show('failed');
      dialog.showErrorBox('Granny x DBD', `The game could not load (${desc}).\n\nTry extracting the whole download to a folder (for example your Desktop) and run it from there.\n\nDetails were saved to:\n${logFile}`);
    });
    // F11 / Alt+Enter: fullscreen
    win.webContents.on('before-input-event', (e, i) => {
      if (i.type === 'keyDown' && (i.key === 'F11' || (i.alt && i.key === 'Enter'))) { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    });
    // links leave the game for the real browser; the game never navigates away
    win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
    win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
    win.webContents.on('console-message', (e, level, msg, line, src) => { if (level >= 3) log('page error:', msg, src ? `(${src}:${line})` : ''); });
    // if the graphics driver takes the page down, come straight back; if it keeps happening, go to Safe Graphics
    const pageCrashes = [];
    win.webContents.on('render-process-gone', (e, d) => {
      log('page gone:', d.reason, d.exitCode);
      if (d.reason === 'clean-exit' || restarting) return;
      const now = Date.now(); pageCrashes.push(now);
      while (pageCrashes.length && now - pageCrashes[0] > 90000) pageCrashes.shift();
      if (pageCrashes.length >= 2 && toSafeMode('the game page crashed ' + pageCrashes.length + ' times (' + d.reason + ')')) return;
      setTimeout(() => { if (win && !win.isDestroyed()) win.reload(); }, 400);
    });
    win.webContents.on('unresponsive', () => log('page unresponsive'));
    win.on('closed', () => { win = null; closeSplash(); });
  }
  app.whenReady().then(() => { makeSplash(); create(); });
  app.on('window-all-closed', () => { if (!restarting) app.quit(); });
}
