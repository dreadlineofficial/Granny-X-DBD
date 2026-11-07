// Granny x DBD desktop app: the game runs in its own bundled engine (Electron/Chromium), fully offline.
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('ignore-gpu-blocklist');          // use the GPU even on older drivers Chromium is wary of
app.commandLine.appendSwitch('disable-renderer-backgrounding'); // an online host keeps running when alt-tabbed
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
Menu.setApplicationMenu(null);

function create() {
  const win = new BrowserWindow({
    width: 1280, height: 760, minWidth: 960, minHeight: 600, show: false, backgroundColor: '#050405',
    title: 'Granny x DBD', icon: path.join(__dirname, 'icon.png'), autoHideMenuBar: true,
    webPreferences: { backgroundThrottling: false, contextIsolation: true, sandbox: true, spellcheck: false },
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  // F11 / Alt+Enter: fullscreen
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type === 'keyDown' && (i.key === 'F11' || (i.alt && i.key === 'Enter'))) { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  // links leave the game for the real browser; the game never navigates away
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  // if the graphics driver ever takes the page down, come straight back instead of showing an error page
  win.webContents.on('render-process-gone', (e, d) => { if (d.reason !== 'clean-exit') setTimeout(() => { if (!win.isDestroyed()) win.reload(); }, 400); });
}
app.whenReady().then(create);
app.on('window-all-closed', () => app.quit());
