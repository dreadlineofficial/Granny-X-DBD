# Granny x DBD — project notes for Claude

A standalone fan game: Granny as the killer in a Dead by Daylight–style 1v4. It was forked from
**Nightbound** (froodyofficial-maker/Nightbound, a separate game) and cut down to its own identity.
three.js r160, plain ES modules in `public/js/`, bundled with esbuild into single HTML files.

## Hard rules from the owner (froodyofficial-maker)
- **The code lives in the repo froodyofficial-maker/Granny-X-DBD** (public, by the owner's choice).
  Don't turn on GitHub Pages or upload it anywhere else unless the owner asks. Hand builds to the
  owner directly as files (the .exe zip, the .apk, videos). Built files (GrannyDBD.html, exe, apk)
  are not committed: rebuild them with the commands below.
- **Killers: Granny, Grandpa (his own killer since 1.1, no longer an outfit), Slendrina and Angeline (1.3).**
- **Survivors: only Mara, Eli, June and Tomás.**
- **Maps: Granny's House (`granny`), Granny's Old House (`granny1`) and Slendrina's Graveyard (`grave`, added 1.3.3 at the
  owner's request).** No other maps unless the owner asks. (The old marsh/carnival/snow themes are still in themes.js but
  not in REGULAR_MAPS.)
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
  - `loadscreen.js` the 3D loading screen (1.3: a killer reel in front of Granny's House: each killer steps out
    under a swinging bulb for 5.6 s with a name + powers card; soft light cone, dust, fog; `window.__lsSeek(t)` for shots).
    `showLoading(on, msg, isLite, rendererOf)`; it renders with the game's own renderer; the main loop
    skips the menu/game while it's up; `HostSession.start` is async with a frame yield between steps
    (this fixed the STATUS_ACCESS_VIOLATION freeze when loading into a match).
  - `touch.js` phone/tablet controls (joystick left, drag-to-look right, context buttons), `body.touch` CSS.
    Mobile mode (`MOBILE` = touch device or `window.__forceTouch`; `html.mobile`): no keyboard/mouse hint anywhere.
    `touchName(id)` maps keybind ids / 'LMB' / 'RMB' / 'V' to button names (game.js `KL()` / `B()` / `kbd()`),
    `mobileText()` rewrites "Hold G" / "Press R" / "click" in descriptions and feed lines; `.pc-only` is hidden,
    `.touch-word` only shows on mobile; the skill check dial is tappable and VAULT reads HIT! during one.
- `public/models/*.glb` (granny, grandpa, granny_anims, granny_map, granny1_map, slendrina, angeline, granny_bear_trap, spidermom, …), `public/img`, `public/fonts`.
- `tools/build.mjs` → builds **`GrannyDBD.html`** (offline single file, GLBs embedded) and **`index.html`** (web).
- `tools/electron/` Windows app (Electron 33.2.1). `tools/android/` APK build (no Gradle).
- `tools/test/` the headless checks used during development (Playwright + SwiftShader; `ROOT` is /home/user/granny-x-dbd):
  `simtest.mjs <map> <killer> <matches> <minutes>` bot-only matches, prints stall seconds (must be 0);
  `play.mjs <role> <killer> <map> <prefix>` plays a bot match and saves frames; `look.mjs <killer> <map> <prefix>` in-match shots;
  `lsshot.mjs out.png medium [menu.png]` loading screen (uses `window.__lsSeek`); `mobile.mjs` phone-emulated menu/help/HUD
  check (prints any key names left in the HUD); `lobbytest.mjs` 3 players vs a local relay (`node broker.mjs` first:
  aedes@0.51.3 + aedes-server-factory@0.2.1) for public/private lobbies; `angview.mjs` / `rigview.mjs` character poses;
  `rawglb.mjs file.glb prefix` plays a GLB's own clips with plain three.js; `render-devlog.mjs` + `devlog13-page.js` the 1.3
  devlog banner (rendered in-engine, 2560x1440).
- `server.js` optional LAN server (`node server.js 8090`), `start-*.bat/.sh/.command` launchers.
- `README.md` is still Nightbound's old README (outdated; don't trust it for this game).

## Identity / namespacing (keep separate from Nightbound)
- localStorage prefix `gdbd_` (e.g. `gdbd_settings`, `gdbd_profile`).
- Relay topics `grannydbd/v1/...`, PeerJS prefix `grannydbd-v1-`. `NET_PROTOCOL = 12`, `VERSION = '1.3.3'` (config.js).
- Public lobbies (1.3): the host publishes a retained message on `grannydbd/v1/pub/<4-char stem>` (`H.advertise(info|null)`
  in net.js, refreshed on every lobby change and each 60 s) with an MQTT last will that clears it if the host drops.
  `watchLobbies(cb)` subscribes `grannydbd/v1/pub/+` on every broker; main.js renders the list + Quick Join.
  Visibility is `lobby.vis` ('public'/'private', host toggle in the lobby). Relay-mode (node server.js) rooms are code-only.
- Official Discord: https://discord.gg/WXvAJ2sgVP (`DISCORD` in config.js): menu top-right button and pause menu.
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
- Angeline (`angeline`, third person, 1.3): Yellow Eyes (RMB hold: a 16 m beam from her eyes; 0.5 s in it = `spotted`,
  her next hit downs; `spotT`/`inBeam`), Lullaby (R: survivors within 30 m get `drowsy` 5 s: no running, x0.75 speed).
  Model angeline.glb (CC BY 4.0, "Angeline Unity" by A_Forogotten_Studio; SPEC yaw PI). Her camera sits wider and she fades
  when a wall pulls the camera close. **She is animated in code, not with the file's clips** (they twisted her and stretched
  her arm; the rest pose stood her sleeves up like wings). The file's bind matrices are ~1.8x taller than the mesh:
  `toBindPose` fits that stretch from the mesh's joints, corrects the inverse bind matrices and puts her in the T-pose;
  `animateAngeline` aims bones in parent space (`aimBone`/`turnBone`) from that rest each frame (hanging arms, glide lean,
  float bob, spread arms for Yellow Eyes, wind-up + two-handed lunge, stun flail). Her size is measured in that pose.
- Granny's House floors (1.3): `grannyfloors.js` = per-floor support maps measured from granny_map.glb; nav cells with no
  floor under them are blocked, and `dropFloor` drops anyone who walks off an edge to the floor below. Gen/teammate
  auras are hidden across floors. Bear traps use granny_bear_trap.glb (jaws close on `bearsnap`).
- Headless bot-only matches (Sim + Bots, no rendering) run ~10 game minutes per second: useful to find stalls.

## Build
```bash
cd tools && npm install && cd ..
node tools/build.mjs            # → GrannyDBD.html + index.html
```
Play/test: `python3 -m http.server 8091` in the project root, open `http://localhost:8091/index.html`.

### Windows .exe (Electron)
The single portable `dist/GrannyxDBD.exe` (with `splash.bmp`) is what the owner uploads: people ran the old .exe
from inside the zip. `dist/GrannyxDBD-Setup.exe` (one-click installer: %LOCALAPPDATA%\Programs\grannyxdbd, desktop + Start
menu shortcut) is the sturdier option. Exact commands (cloud session, no `--icon` on the packager):
```bash
cp GrannyDBD.html tools/electron/app/index.html && cd tools/electron && npm install
npx @electron/packager . GrannyxDBD --platform=win32 --arch=x64 --out=out --overwrite --app-version=1.3.0 \
  --ignore='^/out' --ignore='^/dist' --ignore='^/node_modules' --ignore='^/seticon\.mjs' --ignore='^/builder\.json' \
  --ignore='^/splash\.bmp' --ignore='^/icon\.ico' --ignore='^/package-lock\.json'
node seticon.mjs out/GrannyxDBD-win32-x64/GrannyxDBD.exe icon.ico 1.3.0     # icon + version (resedit + pe-library)
npx electron-builder --win portable --x64 --prepackaged out/GrannyxDBD-win32-x64 --config builder.json  # dist/GrannyxDBD.exe
npx electron-builder --win nsis --x64 --prepackaged out/GrannyxDBD-win32-x64 --config builder.json      # dist/GrannyxDBD-Setup.exe
```
**`builder.json` must keep `"executableName": "GrannyxDBD"`** (= the packager's exe name). Without it the portable launcher and
the installer look for `Granny x DBD.exe` (from productName), fail to start it and quit with code 1: that was the
"EXE doesn't launch" bug fixed in the 1.3.0 rebuild (Nov 2026). The NSIS installer target needs 32-bit Wine
(`dpkg --add-architecture i386 && apt-get install wine32:i386`, slow download); with it the exe can also be tested here:
`WINEPREFIX=... DISPLAY=:77 wine dist/GrannyxDBD.exe --no-sandbox` under Xvfb (Wine's GPU process crashes, so the app goes
to Safe Graphics and then runs; that exercises the restart path too). Send exes zipped
(`zip -9 GrannyxDBD-<ver>-Windows.zip GrannyxDBD.exe`): the owner can't download a bare .exe from the chat.

`main.js` shows a splash window (`splash/splash.html` + `art.jpg`, 720x320, status line + running red bar) straight away and
keeps it up until the game window's ready-to-show (fallback 45 s), so there is no blank gap after the portable launcher's
`splash.bmp` (same art, "Unpacking the house…"; regenerate both from one HTML render if the art changes). Then: maximised,
no menu bar, F11/Alt+Enter fullscreen, single instance, logs to `%APPDATA%\Granny x DBD\log.txt` (first line per start:
version, Windows build, portable/unpacked, gpu/safe); repeated GPU/page crashes relaunch it in Safe Graphics mode
(software WebGL, sticky; `--gpu` resets it). In the portable exe the relaunch goes through `PORTABLE_EXECUTABLE_FILE`
(the launcher deletes its unpacked copy when the first process exits). External links go to the real browser.

### Android .apk
Uses an Android SDK at `SDK=/home/user/android-sdk` (build-tools 34, platform 34) if present; otherwise Ubuntu's packaged
tools (`apt install aapt dalvik-exchange zipalign apksigner android-sdk-platform-23`: aapt2 + dx + android-23.jar, with
compile-only stubs in `tools/android/stubs/`). dl.google.com is blocked in the cloud sessions, so the apt route is the one
that works there. `KS=/path/to/release.jks` picks the keystore.
```bash
tools/android/build-apk.sh /path/to/GrannyDBD.html     # → tools/android/GrannyxDBD.apk
```
It sets the page viewport to 1280 CSS px (menus fit phones), forces mobile mode (`__forceTouch` + `html.mobile`), compiles `src/` (MainActivity.java,
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
1.3: Angeline, real Granny bear trap model, Granny's House floating-floor fixes, killer-reel loading screen, sharper
graphics (anisotropy, PCF soft shadows on medium, unsharp mask in PostShader), public/private lobbies + lobby browser,
Discord link, mobile-only controls + APK 1.3.0 (versionCode 13). The 1.3.0 APK was signed with a NEW key (the owner's
release.jks wasn't available), so players uninstall older APKs first; re-sign with release.jks for later updates.
Devlog banner "ANGELINE · SLENDRINA'S MOTHER IS HERE" rendered in-engine.
1.3.1 build: Angeline animated in code (see Angeline above); APK versionCode 14.
(The owner called the Nov 2026 fix builds 1.3.0; the next release was 1.3.2.)
Nov 2026 rebuild (1.3.0): Windows exe launch fix (`executableName`), new startup splash (NSIS splash.bmp + in-app splash
window), installer build, APK versionCode 15 / versionName 1.3.0 signed with grannyxdbd-1.3.jks (installs over 1.3.x).

Nov 2026 fixes (APK versionCode 16): loading screen no longer shows the menu through it (`html.ls-up` hides every body
child but #game/#loading/#toast); `Game.warmUp()` runs behind the loading screen before the first match frame (characters
created with drawing off, textures via `initTexture`, shaders via `compileAsync` when KHR_parallel_shader_compile exists,
then one real frame): the first frame used to compile ~85 shaders + upload ~120 textures at once (37 s in SwiftShader);
the loading screen renders with its own `shadowMap.enabled` (= !lite) so menu/match switches don't recompile its shaders;
WebGL context lost/restored handler in main.js (`watchContext`): rebuilds the PMREM night-sky env maps (`refreshEnvs` in
gfx.js) and reloads the page if the context isn't back in 12 s; KTX2 scans with sizes not a multiple of 4 (hessian_230,
rough_linen) are dropped (black on BC GPUs); `closePanel(byPlayer)`: only the player closing the lobby panel leaves the
room (the weekly-awards popup used to kick people out of a lobby they joined during startup, e.g. invite links).
granny_map.glb has 7 zero-length images (Button, ShotgunAmmo, Slingshot, Teddy, Coconut, GoldCoin, GateControlFuse_1): those
props render untextured (white). New checks in tools/test: `diag.mjs <killer> <map> <quality>` (load time, longest frame
stalls, texture/program counts), `ctxloss.mjs` (lose + restore the context mid-match), `lsover.mjs` (loading screen over
the menu), `onlinestart.mjs` (host + client start a match through the local broker; run `node broker.mjs` first).

1.3.2 (Nov 2026, current; APK versionCode 19, NET_PROTOCOL still 12 so it plays with 1.3.0):
- Profile cards: `profile.card {av, avs, bn, tt, mo}` (avatar char + outfit, banner, title, motto), `PROFILE_BANNERS` /
  `PROFILE_TITLES` (titles with `need(stats, profile)`) in config.js; panel `p-profile` opens from the top-right chip
  (`renderProfileEditor`, `myCard`, `cleanCard`); the card rides on `hello` / `card` messages and lobby players (`p.card`).
- Store > Codes (`codes.js`, own sync SHA-256): 10 secret codes (only salted hashes in `SECRET_CODES`; the codes were handed to
  the owner as freddy-codes.txt, never put them in the repo) unlock **Granny's legendary Freddy Fazbear skin** (`granny:freddy`,
  secret: true; the owner gives them to the first 10 Discord members); gift codes (`makeGift` / `readCode`, 12 chars, checksum 'gdbd-gift-v1', char/outfit by index in
  `GIFT_CHARS` / `SKINS[char]`: only ever append to those lists). `profile.redeemed` = one use per device; `profile.gifts`.
  Secret outfits are hidden in the Store until owned, never in collections, never picked by bots (`botSurvivor`/`botKiller`).
- Freddy on Granny: `freddyOver(R)` (realism.js) on a GrannyRig: her rig keeps running hidden, Freddy's spine/neck/limbs/hands are
  aimed along her bones each frame (`GR_AIM`), her bat is carried in his right hand, pelvis follows her crouch; her first-person
  arms turn brown fur (`makeViewModel`, vsk.glb). (It was briefly a survivor outfit; the owner wanted it on Granny.)
- Freddy model: the owner's GLB ("FNaF 1 Freddy Fazbear Rigged" by ShadowSupreme, Sketchfab Standard licence: used in builds, not
  redistributed on its own) at public/models/freddy.glb (textures recompressed to JPEG, 5.1 MB) is **gitignored**: ask the owner
  for the file if it's missing (build.mjs skips missing GLBs). realism.js `PROFILES.freddy`: no toBindPose (the file is at 1/100
  scale), size from the skinned vertices, limbs aimed at the procedural rig's limb directions (`aimLimbs`, rotation copying
  folded the arms), hands follow the forearms, the microphone is hidden, jaw twitches. Loaded only when owned or worn in a match.
- Ground Slam: `damage(s, K, instantDown, injureOnly)`: the slam injures healthy survivors only, never downs.
- Bots: team intel (`this.intel` = last seen/heard killer, who she's chasing), generator claims + spreading out, heal / get
  healed (a repairing bot pauses for an injured teammate within 3 m), `leadPenalty` (don't flee towards teammates on gens),
  `b.brave` (after 2.5 s stuck, squeeze past known bear traps at 1 m). Escape rates vs Grandpa/Angeline stay near zero
  (killer bots dominate survivor bots); `tools/test/botstats.sh <map> <n> <min>` aggregates simtest runs.
- Trailer: tools/trailer (`rig.mjs` frame-by-frame match capture via `window.__cine` with `__orbit`/`__clear` camera
  placement, `shoot132.mjs`, `uishots132.mjs`, `uiseg132.py`, `overlays132.cjs`, `score132.py` numpy score, `cut132.sh`
  ffmpeg edit). Use quality 'low' (0.5 s/frame vs 10 s at medium/high in SwiftShader); the game drops its pixel ratio when
  slow, so footage came out 960x540 (upscaled): shoot132 now pins it to 1. Key art: tools/test/devlog132-page.js via
  `render-devlog.mjs devlog132-page.js out.png devlog|thumb`. Trailer v2 (what shipped): Freddy first + 'free for the first 10
  Discord members', then 'play as' each killer (killer-role matches, our player bot-driven, game camera: shoot132b.mjs), profile
  cards, gifting, '+ smarter bots' as a small mention (owner: don't centre it on the bots); cut132b.sh + score132b.py +
  overlays132b.cjs. Devlog thumbnail = devlog132b-page.js (Freddy + outline); trailer thumbnail = trailerthumb132-page.js (owner: not
  about the skin, and it should look like a proper trailer: Granny big in front with the bat, the other three backlit in fog,
  logo + red OFFICIAL TRAILER bar, teal/red grade, grain). Angeline faces the camera at yaw ~ -0.3 (not PI).

1.3.3 (Nov 2026, current; APK versionCode 21, first 1.3.3 APK was 20): phone fixes from Discord feedback + Angeline's arms,
then in the same version: new map, button icons, optimization mode, smoother loading, Freddy taller without the bat.
- Emotes on mobile: the bar listened for mousedown and sat inside the HUD, under the touch layer (#touch z 25): on phones it's
  appended to body (`.touch-emotes`, z 28, big buttons) and uses pointerdown.
- Skill checks on mobile (touch.js): while one is active a tap anywhere hits it (look/joystick area, any button incl. USE);
  `.tc-sc` prompt under the dial ("GET READY…" in the warn beep, then "TAP ANYWHERE / when the needle hits the white zone",
  just "TAP!" after 6, count in localStorage gdbd_sc_seen); the dial is 1.4x on mobile. USE latches: let go mid repair /
  heal and E stays held (button `.on`) until the joystick moves, USE is tapped or the action ends (players let go of USE to
  reach the dial, which cancelled the repair and the check).
- Custom touch layout: Settings > Edit touch controls (`openTouchEditor`, mobile-only field). localStorage gdbd_touchlayout =
  { pos: { 'survivor:use': {x, y, s} (centre as a screen fraction, own size), 'killer:rpower' ... }, scale, op }. Groups
  survivor / killer (killer variants share slots; the R powers HEAR/TRAP/GAZE/LULLABY share 'rpower'). A touched group is
  saved whole (`applyLayout` places `.placed` buttons fixed; the rest stay in the flex flow, zoomed by `scale`).
- Angeline: hanging arms held out from her sides and a bit forward (`animateAngeline`, up/fo dirs); held close they sank
  into her bell-shaped dress.
- Test: tools/test/mobile133.mjs (phone emulation: editor drag, emote tap, skill check by a left tap, USE latch at a gen).
- New map **Slendrina's Graveyard** (`grave`): a theme in themes.js on the 5x5 arena (`buildMap` sends any THEMES id to
  buildArena). Centre `church` (ruined nave, pallet doors, pews, altar, bell tower box kind 'tower' 8.5m), templates crypt
  (roofed mausoleum, walls flagged `noRuin` so the roof sits), rows (headstones + wall/pallet/window), plot (iron fence ring
  round an angel, pallet + gap), graves (open-grave boxes kind 'pit' h0.4 + 'mound'), shed, tombs (two 'monument' blocks +
  pallet), open. Iron fences are walls with style 'iron', h1.6: under bots' 1.7m sight cut, so they block feet not eyes;
  world.js skips drawing them (and pit/mound), themeworld.js draws bars/tips (instanced), graves, crosses, angels, coffins,
  lanterns (flickering `W.fx.flames`), roofs (`visual: roof`), rafters (`visual: nave`), tower roof; LOOK.grave (cold mist,
  dead trees, ruins, `particles: 'wisps'`). Vote card img/maps/grave.jpg. simtest grave x4 killers: 0 stall seconds.
- Mobile buttons have pictures: TC_ICONS in touch.js (+ icons.js for items/powers), `.tc-ic` + small `.tc-lb` label.
- Optimization mode (Settings, `settings.perf`): `applyPerf` in world.js lowers QUALITY (no shadows/post/bloom, 1/4 grass,
  pixel ratio <= 0.75, fewer outer trees, shorter far plane) and `PERF.on` (gfx.js) makes every lite check true; the loading
  screen goes static. Applied before the renderer is made; toggling rebuilds the menu renderer.
- Loading: GLB base64 decode + parse run through heavy.js (`b64buf` via fetch(data:), `heavy()` serial queue, a frame gap
  between jobs); the menu scene is compileAsync'd before it is revealed (`warmMenu`), match shaders before the reveal
  (`warmUp`), the loading reel's house before it shows. Measure with tools/test/loadtest.mjs (PROF=1 for a profile).
- Freddy outfit: `freddyOver(R, 2.3)` (taller than Granny), bat hidden; the first-person view shows his brown paw, no bat.
- 1.3.3 devlog banner: tools/test/devlog133-page.js (render-devlog.mjs devlog133-page.js out.png), the real graveyard world
  built with buildMap(7,'grave') + buildWorld.

## Where things stand / next steps
- The "textures go missing / very dark" report (EXE + APK) is not reproduced in SwiftShader; fixes above cover the likely
  causes (GPU reset after the long first frame, context loss on phones). Ask the owner for a screenshot + quality setting
  if it still happens.
- The 1.3.x APKs are signed with a key made in the 1.3 session (`grannyxdbd-1.3.jks`, alias `grannyxdbd`), which was handed
  to the owner as a file together with its password file. For the next APK the owner puts that .jks in `tools/android/` (or
  passes `KS=/path`) and sets `KS_PASS` from the password file, so the update installs over 1.3.x. Never ask for the password
  in chat; if the owner doesn't have the key, a new key means players uninstall first.
- Not yet tested on a real phone (only Chromium phone emulation) and the public lobby list was tested against a local relay,
  not the public brokers.
- Ideas not done: a 1.3 YouTube Short / trailer with Angeline. The exe/installer are unsigned: SmartScreen shows
  "Windows protected your PC" (More info -> Run anyway) until they're code-signed.
- The Windows exe was tested under Wine only, not on a real Windows PC.
1.2: Granny's Old House enterable, stronger shotgun, taller Slendrina (1.95m), smarter bots, YouTube Short #2
("SHE'S NOT ALONE ANYMORE.", rendered in-engine, synthesized score).
1.1: Grandpa as his own killer, Slendrina, Granny's Old House, bot stall fixes, portable Windows exe,
devlog thumbnail (rendered in-engine: the three killers at the Granny 1 house's front door).
