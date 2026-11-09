# Granny x DBD — project notes for Claude

A standalone fan game: Granny as the killer in a Dead by Daylight–style 1v4. It was forked from
**Nightbound** (froodyofficial-maker/Nightbound, a separate game) and cut down to its own identity.
three.js r160, plain ES modules in `public/js/`, bundled with esbuild into single HTML files.

## Hard rules from the owner (froodyofficial-maker)
- **The code lives in the repo froodyofficial-maker/Granny-X-DBD** (public, by the owner's choice).
  Don't turn on GitHub Pages or upload it anywhere else unless the owner asks. Hand builds to the
  owner directly as files (the .exe zip, the .apk, videos). Built files (GrannyDBD.html, exe, apk)
  are not committed: rebuild them with the commands below.
- **Killers: Granny, Grandpa (his own killer since 1.1, no longer an outfit) and Slendrina.**
- **Survivors: only Mara, Eli, June and Tomás.**
- **Maps: Granny's House (`granny`) and Granny's Old House (`granny1`).** No other maps.
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
    `buildMap(seed, map)`: `granny1` = Granny's Old House: `buildArena` (5x5 woods cells, ring pushed out by
    `HOUSE1.xs/zs`) with the Granny 1 house (`granny1_map.glb`, converted from the owner's USDZ, underground
    parts dropped). Since 1.2 its ground floor (hall, kitchen, living room, ~150 m2) is walkable through the front
    door (door + locks removed from the model and collision); the rest of the plot stays solid. Collision is
    `granny1grid.js` (measured from the model, no wall thickening so inside doorways stay open; navR 0.24 on this
    map). One generator is placed inside at build time by `placeHouseGen` (deepest spot reachable from the door).
  - `game.js` rendering/input/HUD per frame; `models.js` + `*Glb.js` character models; `world.js` scene.
  - `net.js` online (MQTT relay + self-signalled WebRTC), `snap.js` snapshots, `friends.js`, `awards.js`.
  - `loadscreen.js` the 3D loading screen (Granny walking a 22 s loop, Spider Mom, flickering lamps, tips).
    `showLoading(on, msg, isLite, rendererOf)`; it renders with the game's own renderer; the main loop
    skips the menu/game while it's up; `HostSession.start` is async with a frame yield between steps
    (this fixed the STATUS_ACCESS_VIOLATION freeze when loading into a match).
  - `touch.js` phone/tablet controls (joystick left, drag-to-look right, context buttons), `body.touch` CSS.
- `public/models/*.glb` (granny, grandpa, granny_anims, granny_map, granny1_map, slendrina, spidermom, …), `public/img`, `public/fonts`.
- `tools/build.mjs` → builds **`GrannyDBD.html`** (offline single file, GLBs embedded) and **`index.html`** (web).
- `tools/electron/` Windows app (Electron 33.2.1). `tools/android/` APK build (no Gradle).
- `server.js` optional LAN server (`node server.js 8090`), `start-*.bat/.sh/.command` launchers.
- `README.md` is still Nightbound's old README (outdated; don't trust it for this game).

## Identity / namespacing (keep separate from Nightbound)
- localStorage prefix `gdbd_` (e.g. `gdbd_settings`, `gdbd_profile`).
- Relay topics `grannydbd/v1/...`, PeerJS prefix `grannydbd-v1-`. `NET_PROTOCOL = 11`, `VERSION = '1.2.0'` (config.js).
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
- Grandpa (`grandpa`): shotgun (RMB hold/release, act `rush` -> `sim.shotgun`, survivors' `shp` bar: 34 dmg at <=2m
  to 75 at >=14m, so 2 shots down from mid range, 3 point-blank; each hit staggers (boost 0.9s at x0.6 speed)), Bear Trap (R, `S.bears`, `snare`). Model = grandpa.glb via `makeGrannyGlb({grandpa:true})`; his body/gun
  materials are brightened in `AnimRig.material` (the file darkens them to 30%).
- Slendrina (`slendrina`, third person): Haunt (RMB hold shows a ground marker, act `haunt` with x/z ->
  `reachableSpot`, `tele.h`), Cursed Gaze (R, `gaze` timer; survivors looking at her get `cursed`/`curse`,
  `doomed` = next hit downs). Model slendrina.glb (DVUnit, spec-gloss converted to metal-rough).
- Bot watchdogs (bots.js): a survivor still for 2.5s avoids that goal 15s (`b.avoid`), a killer still for 3s
  drops its target/patrol and avoids unreachable hooks/downed (`b.kAvoid`). Carrying killers path round
  dropped pallets; killers avoid one-cell gaps (`grid.narrow`).
- Smarter bots (1.2): survivors treat Grandpa aiming at them (32m, in sight) as a threat and zig-zag (`b.juke`),
  flee Slendrina's gaze and her haunt arrivals, remember ~60% of the traps they see (`b.traps`), and break sideways
  when cornered (`b.cornerT`). Killers weight targets (snared, doomed, heard, low shp); Grandpa strafes at mid range
  while the gun cycles.
- Headless bot-only matches (Sim + Bots, no rendering) run ~10 game minutes per second: useful to find stalls.

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
(cd out && zip -qr ../GrannyxDBD-Windows.zip GrannyxDBD-win32-x64)   # backup: the folder, must be extracted
npx electron-builder --win portable --x64 --prepackaged out/GrannyxDBD-win32-x64 --config builder.json  # → dist/GrannyxDBD.exe
```
The single portable `dist/GrannyxDBD.exe` (with `splash.bmp`) is what the owner uploads: people ran the old .exe
from inside the zip. Without Wine, `--icon` can't be applied by the packager: set icon + version on
`out/.../GrannyxDBD.exe` with the `resedit` npm package before the electron-builder step. The NSIS installer
target needs Wine.

`main.js` opens `app/index.html`, maximised, no menu bar, F11/Alt+Enter fullscreen, single instance, logs to
`%APPDATA%\Granny x DBD\log.txt`; repeated GPU/page crashes relaunch it in Safe Graphics mode (software WebGL,
sticky; `--gpu` resets it). External links go to the real browser.

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
1.2: Granny's Old House enterable, stronger shotgun, taller Slendrina (1.95m), smarter bots, YouTube Short #2
("SHE'S NOT ALONE ANYMORE.", rendered in-engine, synthesized score).
1.1: Grandpa as his own killer, Slendrina, Granny's Old House, bot stall fixes, portable Windows exe,
devlog thumbnail (rendered in-engine: the three killers at the Granny 1 house's front door).
