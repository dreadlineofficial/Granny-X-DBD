# Granny x DBD — project notes for Claude

A standalone fan game: Granny as the killer in a Dead by Daylight–style 1v4. It was forked from
**Nightbound** (froodyofficial-maker/Nightbound, a separate game) and cut down to its own identity.
three.js r160, plain ES modules in `public/js/`, bundled with esbuild into single HTML files.

## Hard rules from the owner (froodyofficial-maker)
- **The code lives in the repo froodyofficial-maker/Granny-X-DBD** (public, by the owner's choice).
  Don't turn on GitHub Pages or upload it anywhere else unless the owner asks. Hand builds to the
  owner directly as files (the .exe zip, the .apk, videos). Built files (GrannyDBD.html, exe, apk)
  are not committed: rebuild them with the commands below.
- **Granny is the only killer.** Grandpa is an *outfit* of Granny (keep it).
- **Survivors: only Mara, Eli, June and Tomás.**
- **Granny's House is the only map. Don't even mention any other maps** anywhere in the game.
- Removed for good (don't bring back): sidekicks and their store section, ghost traps, all lore,
  Progress screen, Testing Area, ranks and levelling, the old intro banner / trailer gate.
- Bots must never stall. **Falling off the roof of the house is fine: don't add barriers.**
- Don't put the owner's real photo/face on any model.
- Never paste API keys or secrets into chat.

## Layout
- `public/index.html`, `public/css/style.css`, `public/js/*.js` — the game source.
  - `main.js` menus, sessions (HostSession / ClientSession), lobby, store, settings.
  - `sim.js` host-authoritative simulation; `bots.js` bot AI; `rules.js`, `movement.js`.
  - `map.js` + `grannyhouse.js` / `grannygrid.js` the house map (multi-floor levels + stairs, `heightAt`, `levelOf`).
  - `game.js` rendering/input/HUD per frame; `models.js` + `*Glb.js` character models; `world.js` scene.
  - `net.js` online (MQTT relay + self-signalled WebRTC), `snap.js` snapshots, `friends.js`, `awards.js`.
  - `loadscreen.js` the 3D loading screen (Granny walking a 22 s loop, Spider Mom, flickering lamps, tips).
    `showLoading(on, msg, isLite, rendererOf)`; it renders with the game's own renderer; the main loop
    skips the menu/game while it's up; `HostSession.start` is async with a frame yield between steps
    (this fixed the STATUS_ACCESS_VIOLATION freeze when loading into a match).
  - `touch.js` phone/tablet controls (joystick left, drag-to-look right, context buttons), `body.touch` CSS.
- `public/models/*.glb` (granny, grandpa, granny_anims, granny_map, spidermom, …), `public/img`, `public/fonts`.
- `tools/build.mjs` → builds **`GrannyDBD.html`** (offline single file, GLBs embedded) and **`index.html`** (web).
- `tools/electron/` Windows app (Electron 33.2.1). `tools/android/` APK build (no Gradle).
- `server.js` optional LAN server (`node server.js 8090`), `start-*.bat/.sh/.command` launchers.
- `README.md` is still Nightbound's old README (outdated; don't trust it for this game).

## Identity / namespacing (keep separate from Nightbound)
- localStorage prefix `gdbd_` (e.g. `gdbd_settings`, `gdbd_profile`).
- Relay topics `grannydbd/v1/...`, PeerJS prefix `grannydbd-v1-`. `NET_PROTOCOL = 11`, `VERSION = '1.0.0'` (config.js).
- Electron appId `io.github.froodyofficial.grannyxdbd`. The APK signing keystore (`release.jks`,
  alias `grannyxdbd`) is NOT in the repo: the owner keeps it. Put it in `tools/android/` and set
  `KS_PASS` before building; always sign with the same key so updates install over old versions.

## Gameplay details worth knowing
- Difficulty (`config.js` DIFFICULTY): easy {aim .3, killerSpeed .84, sight 18, reach 2.1},
  normal {react .55, aim .42, killerSpeed .87, sight 22, reach 2.2}, hard unchanged.
- Bot survivors use `SURV_SKILL = { react: .35, skill: .94, great: .2 }` (bots.js).
- Bots: `regions()/regionAt()/nearestIn()` reachability (grid type 1 = blocked, gates passable);
  `goTo` falls back to a direct move when there's no path; flee only to reachable spots, on the
  right floor. Bat Rush gated by `willing(b, D, dt)`; I Hear You rates scaled by difficulty aim.
- Skins: price-0 skins count as owned. `window.__THREE`, `window.__killerSkin`, `window.__cine`
  (film-camera hook called in game.js after updateCamera) exist for trailer capture.
- `game.touch` bypasses pointer lock (touch devices).

## Build
```bash
cd tools && npm install && cd ..
node tools/build.mjs            # → GrannyDBD.html + index.html
```
Play/test: `python3 -m http.server 8091` in the project root, open `http://localhost:8091/index.html`.

### Windows .exe (Electron)
```bash
cp GrannyDBD.html tools/electron/app/index.html
cd tools/electron && npm install
npx @electron/packager . GrannyxDBD --platform=win32 --arch=x64 --out=out --overwrite --icon=icon.ico
(cd out && zip -qr ../GrannyxDBD-Windows.zip GrannyxDBD-win32-x64)   # what the owner gets (zip with the folder + .exe)
# single portable exe instead: npx electron-builder --win portable --config builder.json  (→ dist/GrannyxDBD.exe)
```
`main.js` opens `app/index.html`, maximised, no menu bar, F11/Alt+Enter fullscreen, reloads itself
if the GPU process dies, external links go to the real browser.

### Android .apk
Needs an Android SDK (build-tools 34, platform 34) and a JDK; the script expects `SDK=/home/user/android-sdk`.
```bash
tools/android/build-apk.sh /path/to/GrannyDBD.html     # → tools/android/GrannyxDBD.apk
```
It sets the page viewport to 1280 CSS px (menus fit phones), compiles `src/` (MainActivity.java,
GameClient.java — a WebView; javac -source 8 against android.jar; d8; zipalign; apksigner).
Bump `VC`/`VN` env vars for a new version.

## Testing in a headless browser (what worked)
- Playwright + Chromium with `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`.
- Seed localStorage (`gdbd_settings`, `gdbd_profile` with `seen` flags) in an init script.
- `window.__nbMqtt = ['ws://localhost:8883']` points online play at a local MQTT-over-WebSocket broker
  (e.g. aedes + aedes-server-factory) for multiplayer tests; `window.__nbNoRTC = true` forces relay-only.
- `window.__nb` exposes `session`, `lobby`, `settings`, `profile`.
- Software rendering is slow: grab frames with `renderer.domElement.toDataURL()` right after
  `game.frame()` instead of page screenshots at high quality.

## Done so far (history)
Granny-only roster and house map; Grandpa outfit; 3D loading screen; load freeze fix; Electron app;
APK with touch controls; smarter bots (no stalls); Game Jolt header/thumbnail/page text using the
owner's GRANNY and DBD logos (no line under them); a 57 s YouTube trailer (v2: tense synthesized
score, re-shot scenes) and a 17 s vertical YouTube Short with a "SHE HEARD YOU." thumbnail.
