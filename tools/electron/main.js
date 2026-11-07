// Granny x DBD desktop app: the game runs in its own bundled engine (Electron/Chromium), fully offline.
//
// It has to start on any Windows PC, so it is defensive:
//  - one copy at a time (a second double-click focuses the open window instead of starting a second engine)
//  - the window always appears, even if the first paint is slow (the game file is ~25 MB)
//  - if the graphics driver crashes (the GPU process dies, or the page dies), the app restarts itself in
//    Safe Graphics mode: no hardware acceleration, WebGL in software (SwiftShader). Slower, but it runs.
//    Safe mode sticks for later launches; start with --gpu to try the graphics card again.
//  - everything that goes wrong is written to log.txt in the app's data folder (%APPDATA%\Granny x DBD)
const { app, BrowserWindow, shell, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const dataDir = app.getPath('userData');
const logFile = path.join(dataDir, 'log.txt'), safeFlag = path.join(dataDir, 'safe-graphics');
function log(...a) {
  try { fs.mkdirSync(dataDir, { recursive: true }); fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${a.join(' ')}\n`); } catch {}
}
process.on('uncaughtException', e => { log('main error:', e && e.stack || e); });

const argv = process.argv.slice(1);
if (argv.includes('--gpu')) { try { fs.unlinkSync(safeFlag); } catch {} }
const safe = argv.includes('--safe-graphics') || fs.existsSync(safeFlag);
if (safe) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('use-angle', 'swiftshader');
  log('starting in Safe Graphics mode');
} else app.commandLine.appendSwitch('ignore-gpu-blocklist'); // use the GPU even on older drivers Chromium is wary of
app.commandLine.appendSwitch('enable-unsafe-swiftshader');      // software WebGL is allowed as a fallback
app.commandLine.appendSwitch('disable-renderer-backgrounding'); // an online host keeps running when alt-tabbed
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
Menu.setApplicationMenu(null);

// restart in Safe Graphics mode (once): the graphics driver could not run the game
let restarting = false;
function toSafeMode(why) {
  if (safe || restarting) return false;
  restarting = true;
  log('switching to Safe Graphics mode:', why);
  try { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(safeFlag, why); } catch {}
  app.relaunch({ args: [...argv.filter(a => a !== '--gpu'), '--safe-graphics'] });
  app.exit(0);
  return true;
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  let win = null;
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });

  const gpuCrashes = [];
  app.on('child-process-gone', (e, d) => {
    log('child process gone:', d.type, d.reason, d.exitCode);
    if (d.type === 'GPU' && d.reason !== 'clean-exit') {
      const now = Date.now(); gpuCrashes.push(now);
      while (gpuCrashes.length && now - gpuCrashes[0] > 60000) gpuCrashes.shift();
      if (gpuCrashes.length >= 2) toSafeMode('graphics process crashed ' + gpuCrashes.length + ' times');
    }
  });

  function create() {
    win = new BrowserWindow({
      width: 1280, height: 760, minWidth: 960, minHeight: 600, show: false, backgroundColor: '#050405',
      title: 'Granny x DBD', icon: path.join(__dirname, 'icon.png'), autoHideMenuBar: true,
      webPreferences: { backgroundThrottling: false, contextIsolation: true, sandbox: true, spellcheck: false },
    });
    let shown = false;
    const show = () => { if (shown || win.isDestroyed()) return; shown = true; win.maximize(); win.show(); };
    win.once('ready-to-show', show);
    setTimeout(show, 6000); // never leave the player looking at nothing
    win.loadFile(path.join(__dirname, 'app', 'index.html')).catch(e => log('load error:', e && e.message));
    win.webContents.on('did-fail-load', (e, code, desc, url) => {
      log('did-fail-load', code, desc, url);
      if (code === -3) return; // aborted (a reload): harmless
      show();
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
      if (d.reason === 'clean-exit') return;
      const now = Date.now(); pageCrashes.push(now);
      while (pageCrashes.length && now - pageCrashes[0] > 90000) pageCrashes.shift();
      if (pageCrashes.length >= 2 && toSafeMode('the game page crashed ' + pageCrashes.length + ' times (' + d.reason + ')')) return;
      setTimeout(() => { if (!win.isDestroyed()) win.reload(); }, 400);
    });
    win.webContents.on('unresponsive', () => log('page unresponsive'));
    win.on('closed', () => { win = null; });
  }
  app.whenReady().then(create);
  app.on('window-all-closed', () => app.quit());
}
