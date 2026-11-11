// Game tuning + content definitions (shared by host, clients and bots)

export const HALF = 56;                 // map spans -HALF..HALF on x and z
export const TICK = 1 / 60;
// bump when host and clients can no longer understand each other's network messages
export const NET_PROTOCOL = 12;
export const SNAP_RATE = 30;            // snapshots per second sent to clients (relay players get ~15)

export const SPEED = {
  walk: 2.3, run: 4.0, crouch: 1.15, crawl: 0.75,
  hitBoost: 1.5, hitBoostTime: 1.8,
  killer: 4.6, carry: 4.2, aimSlow: 0.55,
};

// Survivor items. Flashlight and Ghost Trap can be brought in; everything can turn up in a chest.
// The Taser only comes out of chests (20% of them): 3 shots, each one locks the killer up for 3s.
export const ITEMS = {
  flashlight: { name: 'Flashlight', desc: 'Hold RMB to shine it in the killer\'s eyes.' },
  taser: { name: 'Taser', shots: 3, stun: 3, range: 9, chance: 0.2, desc: 'Click RMB to fire: a killer you hit is electrocuted and frozen for 3s. 3 shots. Only found in chests.' },
};
export const RULES = {
  genCharges: 66,          // seconds of solo repair per generator
  gensTotal: 7,
  healTime: 14,            // seconds to heal a teammate one health state
  pickupTime: 1.4,         // killer picks up a downed survivor
  cageTime: 1.1,           // killer hangs a survivor on a hook
  rescueTime: 1.2,
  gateTime: 18,
  kickTime: 1.8,
  breakTime: 2.4,
  bleedout: 200,
  cageStage: [60, 60],     // hook phases: 60s hanging, then 60s struggling against the Entity; hooked in the struggle phase = sacrificed
  selfUnhook: 0.04,        // chance per self-unhook attempt (3 attempts, first phase only)
  selfUnhookCost: 8,       // hook seconds lost per failed attempt
  struggleMiss: 9,         // hook seconds lost per missed struggle skill check
  wiggleNeed: 1,           // wiggle progress needed to escape the killer's grip
  wiggleRate: 0.006,       // progress per alternating keypress (~30s of struggling)
  collapse: 140,           // seconds after the gates are powered before the night claims everyone left
  hitCooldown: 2.7,
  missCooldown: 1.5,
  lungeTime: 0.42,
  lungeMul: 1.45,
  hitRange: 2.0,
  terror: 32,
  stunBarricade: 2.0,
  execTime: 4.2,
  flashBattery: 12, flashRange: 9, flashTime: 1.0, flashStun: 1.6, blindTime: 2.4, blindImmune: 12, // survivor flashlights
  chestTime: 2.2, swapTime: 0.4,                                          // searching a chest, swapping items with it
  teleTime: 1.2, teleCd: 18, lanternRadius: 9, snuffTime: 2.5,           // length of a killer's execution finisher
};

// ---------------- Game modes ----------------
export const MODES = {
  classic: { name: 'Classic', short: '1 vs 4', desc: 'One killer, four survivors. Repair generators, power the gates and escape.' },
  dark: { name: 'Lights Out', short: 'Horror', desc: 'The lights never come on. Thick fog, no auras for survivors, half-charged flashlights.' },
  rush: { name: 'Survivor Rush', short: '5 min', time: 300, desc: 'Five-minute matches. Generators and gates go twice as fast, and the killer gets a burst of speed after every hit. When the clock runs out, the gates power up and the night collapses fast.' },
  glass: { name: 'Glass Bones', short: 'One hit', desc: 'Every hit puts a survivor straight down. To make up for it, generators repair 40% faster. One mistake and you are on the floor.' },
  adrenaline: { name: 'Adrenaline', short: 'Fast', desc: 'Everyone moves 30% faster, generators and exit gates go 25% faster, and killer powers recharge 40% faster. Chases are frantic.' },
  bloodmoon: { name: 'Blood Moon', short: 'Tasers', desc: 'A red moon over the map. Every 45 seconds the killer sees every survivor for 4 seconds, but every survivor starts with a 2-shot Taser instead of their item.' },
};
// killers an infected survivor can turn into
export const INFECT_POOL = ['butcher', 'wisp', 'harrower', 'lamplighter', 'slimer', 'bateman', 'chucky'];

export const POSSESS_MAX = 66; // Chucky can stay in a survivor's body for 1.1 minutes
// Power levels: a killer's dash / pounce / hook reach starts low and is bought up with Embers.
// base and max in metres, step metres per level, cost Embers per level
export const POWER_LV = {
  granny: { power: 'Bat Rush', base: 25, max: 50, step: 1, cost: 10000 },
  butcher: { power: 'Rampage', base: 20, max: 40, step: 2, cost: 2500 },
  chucky: { power: 'Pounce', base: 7, max: 14, step: 1, cost: 3000 },
  foreman: { power: 'Chain Hook', base: 14, max: 24, step: 1, cost: 2500 },
};
export const powerReach = (char, lv) => { const L = POWER_LV[char]; if (!L) return 0; const v = typeof lv === 'number' && isFinite(lv) ? lv : L.base; return Math.max(L.base, Math.min(L.max, Math.round(v / L.step) * L.step)); };
export const KILLERS = {
  butcher: {
    id: 'butcher', name: 'The Butcher', speed: 4.6, terror: 32, weapon: 'Cleaver',
    lore: '',
    exec: { name: "Butcher's Block", desc: 'Hauls the survivor up by the collar and brings the cleaver down. Twice.' },
    ability: { name: 'Rampage', cooldown: 11, charges: 2, desc: 'Charge forward at great speed for 2.6s. Running into a survivor puts them straight down. Smashes through dropped barricades. Slamming into a wall stuns you. Holds 2 charges.' },
    feature: { name: 'Gore Trail', desc: 'Injured survivors leave a trail of fresh blood that only you can see.' },
    color: 0x7a1c14,
  },
  wisp: {
    id: 'wisp', name: 'The Wisp', speed: 4.6, terror: 28, weapon: 'Claws',
    lore: '',
    exec: { name: 'Drowning Embrace', desc: 'Lifts the survivor by the throat and drinks their breath until only mist remains.' },
    ability: { name: 'Fade', cooldown: 12, desc: 'Fade from sight for up to 7s: nearly invisible, no terror radius, +15% speed. You cannot attack while faded. Press again to reappear (1s).' },
    feature: { name: 'Ambush & Frost', desc: 'For 2.5s after reappearing, your lunge reaches 60% farther. Survivors near you while faded feel frost creep over their vision and hear whispers.' },
    color: 0x6fb7c9,
  },
  harrower: {
    id: 'harrower', name: 'The Harrower', speed: 4.45, terror: 30, weapon: 'Bone Spear',
    lore: '',
    exec: { name: 'Trophy Hunt', desc: 'Pins the survivor to the earth with a bone spear, then hoists them up as a trophy.' },
    ability: { name: 'Bone Spear', cooldown: 1.2, ammo: 3, reload: 9, desc: 'Hold to aim (slowed), release to hurl a bone spear. A hit injures the survivor like a strike. Carries 3 spears; one regrows every 9s.' },
    feature: { name: 'Trophy Mark', desc: 'Survivors struck by a spear are Marked: their aura is revealed to you for 12 seconds.' },
    color: 0xc9b98a,
  },
  lamplighter: {
    id: 'lamplighter', name: 'The Lamplighter', speed: 4.5, terror: 30, weapon: 'Hook Pole',
    lore: '',
    exec: { name: 'Last Light', desc: 'Raises his lantern to the survivor\'s face until the green flame swallows them whole.' },
    ability: { name: 'Cursed Lanterns', cooldown: 2.5, max: 4, desc: 'Place a cursed lantern (up to 4). Survivors within 9m of a lantern are revealed to you. Survivors can snuff lanterns out.' },
    feature: { name: 'Shadow Step', desc: 'Press R to step through the dark to the lantern you are looking toward (1.2s, 18s cooldown).' },
    color: 0x7cff9a,
  },
  slimer: {
    id: 'slimer', name: 'The Slimer', speed: 4.6, terror: 20, weapon: 'Ectoplasm', crossover: 'Ghostbusters (fan-made)',
    lore: '',
    exec: { name: 'Slimed', desc: 'Swallows the survivor whole, then spits out what is left.' },
    ability2: { name: 'Ghost Phase', key: 'R', cooldown: 16, duration: 2.5, desc: 'Turn see-through and float straight through walls for 2.5s.' },
    ability: { name: 'Slime Spit', cooldown: 7, max: 4, desc: 'Spit a glob of ectoplasm at the survivor in front of you (up to 14m): a hit slimes them on the spot and leaves a puddle (up to 4). Survivors who are slimed are slowed by 30% and revealed to you for 3s.' },
    feature: { name: 'Ectoplasmic', desc: 'He floats: no footsteps and only a 20m terror radius. Press R for Ghost Phase: float through walls for 2.5s (16s cooldown).' },
    color: 0x7aff4a,
  },
  foreman: {
    id: 'foreman', name: 'The Foreman', speed: 4.5, terror: 34, weapon: 'Meat Hook', crossover: 'OFFAL',
    lore: '',
    exec: { name: 'Reassignment', desc: 'Hooks the survivor under the jaw, hoists them off their feet and drags them backward into the dark.' },
    ability: { name: 'Chain Hook', cooldown: 9, range: 18, desc: 'Hold to aim, release to fling your hook on its chain. Catch a survivor and they are injured and reeled back to you. Catch a wall and you are yanked across to it.' },
    ability2: { name: 'Lights Out', key: 'R', cooldown: 45, duration: 9, desc: 'Kill every light on the map for 9s: the fog closes in, you go silent, runners are revealed and one strike of your hook puts a survivor down.' },
    feature: { name: 'Hunts by Sound', desc: 'Survivors running within 22m of you give away their position with a noise ping, lights or no lights.' },
    color: 0xd8ccbc,
  },
  chucky: {
    id: 'chucky', name: 'Chucky', speed: 4.6, terror: 20, weapon: 'Kitchen Knife', crossover: "Child's Play (fan-made)", tpv: true,
    lore: '',
    exec: { name: 'Friends Till the End', desc: 'Leaps onto the survivor\'s chest and stabs, and stabs, and stabs.' },
    ability: { name: 'Pounce', cooldown: 5, min: 3, max: 10, coil: 0.8, desc: 'Hold to coil (at full speed), release to leap up to 10m: the longer you coil, the farther you fly. He sails over fences, pallets and other low obstacles. Landing on a survivor strikes them. Leaping into a wall stuns you.' },
    ability2: { name: "Chucky's Laugh", key: 'R', cooldown: 35, radius: 28, reveal: 5, desc: 'Laugh. Every survivor within 28m hears it and is revealed to you for 5s.' },
    feature: { name: 'Tiny Terror & Possession', desc: 'Doll-sized and hard to spot: a 20m terror radius and silent footsteps. Space to jump over windows, pallets and rocks. Possession (G, once every 10 minutes): take over a downed survivor in secret. They wander as an invisible ghost, your doll is left as a harmless decoy, and you can let go once you have downed and hooked someone. Soul Split (V, once, with one generator left): jump into a spare doll lying on the map; your old body keeps hunting as a bot that can down survivors but not hook them. Played in third person.' },
    color: 0xd83a22,
  },
  granny: {
    id: 'granny', name: 'Granny', speed: 4.7, terror: 32, weapon: 'Baseball Bat', crossover: 'Granny (fan-made)',
    lore: '',
    exec: { name: 'Bedtime Trap', desc: 'Forces the survivor to their knees, sets a bear trap in front of them, and shoves their face into it.' },
    shotgun: { name: 'Shotgun', cooldown: 2.2, raise: 0.3, range: 45, minDmg: 6, maxDmg: 36, near: 2.5, far: 22.5 },
    ability: { name: 'Bat Rush', cooldown: 8, minCharge: 0.25, maxCharge: 1.0, minDist: 3, maxDist: 8, speed: 13, turn: 1.9, palletBonus: 2, slamRadius: 2.6, slamGen: 0.1, wallStun: 0.9, desc: 'Hold to wind up the bat (slowed), release to charge: the longer you hold, the further she goes (3m, 8m at one second, and on), up to her power level (25m to start, 50m fully levelled). Steer the charge with the mouse. She crashes straight through windows and smashes dropped pallets (each one carries her 2m further), and strikes the first survivor in her way; a Heard survivor goes straight down. Fully wound up, the charge ends in a Ground Slam: everyone healthy around her is injured (the slam never downs anyone) and a nearby generator is damaged. Charging into a wall stuns her.' },
    ability2: { name: 'I Hear You', key: 'R', cooldown: 25, reveal: 6, heard: 15, desc: 'Stop and listen. Every survivor who is running, repairing, healing or unhooking anywhere on the map is revealed for 6s and Heard for 15s: her next hit on a Heard survivor puts them straight down.' },
    teleport: { name: 'Creep', key: 'G', cooldown: 25, time: 1.2, haste: 3, desc: 'Hold G: every window, pallet, generator and hook on the map is marked. Release to vanish and reappear at the one in your sights, with a short burst of speed.' },
    swap: { name: 'Body Swap', key: 'V', cooldown: 6, desc: 'Switch bodies with Spider Mom, any time: Granny appears where Spider Mom was, and Spider Mom where Granny stood. Hold V to look through Spider Mom\'s eyes first, release to swap.' },
    feature: { name: 'Sharp Ears & Spider Mom', desc: 'She hears everything: survivors who run within 22m of her are revealed, and a failed skill check is heard anywhere. Spider Mom crawls between the generators; anyone she finds repairing is shown to Granny and webbed (slowed for 3s).' },
    color: 0xd8d0c0,
  },
  // Granny x DBD 1.1: Grandpa takes his own shift, and Slendrina comes up from the cellar
  grandpa: {
    id: 'grandpa', name: 'Grandpa', speed: 4.55, terror: 30, weapon: 'Shotgun', crossover: 'Granny (fan-made)',
    lore: '',
    exec: { name: 'Last Round', desc: 'Pins the survivor to the floor with his boot and takes his time reloading.' },
    // survivors carry a second health bar against him (100): the farther the shot, the more it takes
    shotgun: { name: 'Shotgun', cooldown: 2.0, raise: 0.3, range: 45, minDmg: 34, maxDmg: 75, near: 2, far: 14, reveal: 5, stagger: 0.9, slow: 0.6 },
    ability: { name: 'Shotgun', cooldown: 2.0, desc: 'Hold RMB to raise the shotgun (slowed), release to fire. Survivors carry a second health bar against him: two shots put anyone down from mid range or farther, three point-blank. Every hit staggers them (slowed for a moment) and reveals them for 5s.' },
    ability2: { name: 'Bear Trap', key: 'R', cooldown: 5, max: 3, snare: 4, reveal: 6, seen: 5, desc: 'Set a bear trap where you stand (up to 3: setting a 4th removes the oldest). A survivor who steps in is injured, caught for 4s and revealed for 6s. Survivors only spot a trap from 5m away.' },
    feature: { name: 'Old Soldier', desc: 'He takes his time, and he never misses twice: his shots hit hardest from far away, and his traps guard the generators he cannot watch.' },
    color: 0x8a7a5a,
  },
  slendrina: {
    id: 'slendrina', name: 'Slendrina', speed: 4.6, terror: 24, weapon: 'Claws', crossover: 'Granny (fan-made)', tpv: true, float: true,
    lore: '',
    exec: { name: 'Look at Me', desc: 'Lifts the survivor off the ground and makes them look into her eyes until there is nothing left.' },
    ability: { name: 'Haunt', cooldown: 10, range: 16, time: 0.5, desc: 'Hold RMB to choose a spot up to 16m away, through walls if you like; release to vanish and reappear there half a second later.' },
    ability2: { name: 'Cursed Gaze', key: 'R', cooldown: 30, duration: 8, range: 26, need: 1.2, slow: 0.8, desc: 'For 8s, every survivor who looks at her is Cursed: their vision darkens, they slow down by 20% and they are revealed. Look at her for more than a second and the curse is complete: her next hit puts them straight down.' },
    feature: { name: 'Ghost', desc: 'She floats: silent, with a 24m terror radius. Played over the shoulder.' },
    color: 0x9aa6a0,
  },
  angeline: {
    id: 'angeline', name: 'Angeline', speed: 4.6, terror: 30, weapon: 'Claws', crossover: 'Granny (fan-made)', tpv: true,
    lore: '',
    exec: { name: 'Hush Now', desc: 'Holds the survivor close, sings to them, and does not let go.' },
    ability: { name: 'Yellow Eyes', cooldown: 12, max: 4, range: 16, cone: 0.21, need: 0.5, reveal: 8, spotted: 15, slow: 0.6, desc: 'Hold RMB to shine the yellow light of her eyes ahead of her (up to 4s, 16m, blocked by walls; she moves slower). A survivor caught in it for half a second is Spotted: revealed for 8s, and her next hit puts them straight down for 15s.' },
    ability2: { name: 'Lullaby', key: 'R', cooldown: 30, radius: 30, time: 5, slow: 0.75, desc: 'She hums. Every survivor within 30m turns drowsy for 5s: they cannot run, they slow down, and their vision blurs.' },
    feature: { name: 'Slendrina\'s Mother', desc: 'She watches over the house: survivors she has Spotted show up to her on the whole map while it lasts.' },
    color: 0xd8c040,
  },
  bateman: {
    id: 'bateman', name: 'Patrick Bateman', speed: 4.7, terror: 28, weapon: 'Axe', crossover: 'American Psycho (fan-made)',
    lore: '',
    exec: { name: 'Hip to Be Square', desc: 'Puts on his raincoat, lectures the survivor about Huey Lewis, then swings the axe.' },
    ability: { name: 'Chainsaw Toss', cooldown: 2.5, aim: 0.35, range: 24, back: 8, desc: 'Hold to aim (slowed), release to hurl your chainsaw. A hit puts a survivor straight down. Walk over it to pick it up, or it flies back to your hand after 8s.' },
    ability2: { name: 'Business Card', key: 'R', cooldown: 18, range: 16, desc: 'Show your card. Survivors within 16m in front of you are intimidated: revealed and slowed by 20% for 5s.' },
    feature: { name: 'Morning Routine', desc: 'After every hit, a 4s burst of +12% speed. Survivors he has intimidated leave him a trail: they stay revealed while they run.' },
    color: 0xc01a1a,
  },
};

export const SURVIVORS = {
  mara:  { id: 'mara',  name: 'Mara Voss',   skin: 0xe2b896, hair: 0x2b1a12, shirt: 0x8a2f2a, pants: 0x2c3442, hairStyle: 'long' },
  eli:   { id: 'eli',   name: 'Eli Okafor',  skin: 0x7a4e32, hair: 0x111111, shirt: 0x3c5e3a, pants: 0x3a3226, hairStyle: 'short' },
  june:  { id: 'june',  name: 'June Harlow', skin: 0xf1cfb4, hair: 0xc99b4a, shirt: 0x3a5f8a, pants: 0x222831, hairStyle: 'bun' },
  tomas: { id: 'tomas', name: 'Tomás Reyes', skin: 0xc08a5e, hair: 0x2a1d14, shirt: 0x6b5a3a, pants: 0x1f2a24, hairStyle: 'cap' },
  // Ghostbusters fan-made crossover
  raghuvir: { id: 'raghuvir', name: 'Raghuvir', skin: 0xb08058, hair: 0x0e0a08, shirt: 0xb8a878, pants: 0xb0a070, hairStyle: 'short', big: true, gb: true },
  abeer: { id: 'abeer', name: 'Abeer', skin: 0xa87650, hair: 0x120c08, shirt: 0xb8a878, pants: 0xb0a070, hairStyle: 'short', gb: true },
  // Marvel fan-made crossover (model: "Spiderman_topy" by sabra, sketchfab.com/sabrayf, CC BY 4.0)
  spiderman: { id: 'spiderman', name: 'Spider-Man', skin: 0x8a1418, hair: 0x8a1418, shirt: 0x9a1a1e, pants: 0x1a2040, hairStyle: 'short', fan: true,
    // limited: 500,000 Embers, in the Store until the end of 7 Nov 2026 (UTC), then gone for good
    limited: { price: 500000, until: Date.UTC(2026, 10, 8, 0, 0) }, hookEscapes: 5, hookChance: 0.3,
    swing: { name: 'Web Swing', range: 18, cooldown: 15, perch: 5, desc: 'Aim at a wall, tree or object within 18m and press F to swing to it (15s cooldown). Look up as you fire to land on top of it and stay up there for 5s, out of the killer\'s reach.' },
    web: { name: 'Web Shooters', shots: 4, range: 20, slow: 0.45, time: 4, carryTime: 2.5, cd: 0.6, desc: 'Press R to fire a web where you aim (4 shots, 20m). A webbed killer is slowed by 55% for 4s; a killer carrying someone is forced to drop them.' } },
};

export const SURV_PERKS = {
  steady:   { name: 'Steady Hands', icon: '✋', desc: 'Calibration checks have a 40% larger success zone. Perfect checks grant +2% extra progress.' },
  medic:    { name: 'Field Medic',  icon: '✚', desc: 'Heal others 30% faster. You can heal yourself (hold E with no target) at 50% speed.' },
  hushed:   { name: 'Hushed',       icon: '☾', desc: 'Your footsteps and pained breathing are silent. Crouch speed +25%.' },
  sixth:    { name: 'Sixth Sense',  icon: '◉', desc: 'Every 25 seconds the killer\'s aura is revealed to you for 4 seconds.' },
  shared:   { name: 'Shared Labor', icon: '⚙', desc: '+15% repair speed for each other survivor working on the same generator.' },
  lockpick: { name: 'Quick Release', icon: '⚿', desc: 'Unhook survivors twice as fast. Open exit gates 30% faster.' },
  lastwind: { name: 'Last Wind',    icon: '➶', desc: 'When unhooked or picked up from the ground, gain +40% speed for 5 seconds.' },
  acrobat:  { name: 'Acrobat',      icon: '⤴', desc: 'Vault windows and barricades 30% faster.' },
  resolve:  { name: 'Resolve',      icon: '♥', desc: 'Struggle free from the killer 40% faster. Bleed out 50% slower and crawl 30% faster.' },
  fleet:    { name: 'Fleet Foot',   icon: '»', desc: 'While injured, run 7% faster. Your post-hit speed burst lasts 50% longer.' },
  // character-exclusive perks: only that survivor can equip them
  triage:      { name: 'Triage',      only: 'mara',     desc: 'Help a dying survivor back up twice as fast.' },
  overclock:   { name: 'Overclock',   only: 'eli',      desc: 'When a generator you are repairing is finished, the nearest unfinished generator jumps ahead by 10%.' },
  exposure:    { name: 'Exposure',    only: 'june',     desc: 'Blinding the killer with your flashlight reveals the killer\'s aura to every survivor for 6 seconds.' },
  pathfinder:  { name: 'Pathfinder',  only: 'tomas',    desc: 'You always see the exit gates\' auras, and open them 40% faster.' },
  exorcist:    { name: 'Exorcist',    only: 'abeer',    desc: 'You cannot be possessed. A survivor body Chucky has possessed shows up to you in purple within 20m.' },
};

export const KILLER_PERKS = {
  scent:      { name: 'Scent of Fear', icon: '☠', desc: 'Injured survivors within 24m have their auras revealed to you.' },
  static:     { name: 'Static Sense',  icon: 'ϟ', desc: 'Survivors repairing a generator are revealed to you.' },
  overload:   { name: 'Overload',      icon: '✸', desc: 'Kicking a generator instantly removes 8% progress, and it regresses 50% faster.' },
  relentless: { name: 'Relentless',    icon: '⟳', desc: 'Recovery after a successful strike is 35% shorter.' },
  dread:      { name: 'Dread',         icon: '♒', desc: 'Terror radius +8m. Survivors inside your terror radius repair 10% slower.' },
  brute:      { name: 'Brute',         icon: '⚒', desc: 'Break barricades and kick generators 35% faster.' },
  rust:       { name: 'Rusted Hooks',  icon: '⛓', desc: 'Hook timers run 20% faster and unhooking a survivor takes twice as long.' },
  sentry:     { name: 'Sentry',        icon: '◎', desc: 'When a generator is completed, the survivors who finished it are revealed for 6 seconds.' },
  fury:       { name: 'Endgame Fury',  icon: '♨', desc: 'Once the exit gates are powered, gain +8% movement speed.' },
  irongrip:   { name: 'Iron Grip',     icon: '✠', desc: 'Survivors you carry struggle free 30% slower.' },
  stalker:    { name: 'Stalker',       icon: '◐', desc: 'Terror radius -14m. Your lunge reaches 20% farther.' },
  stunless:   { name: 'Stunless',      icon: '➤', desc: 'Your dash and pounce powers (Bat Rush, Rampage, Pounce) are never stopped or stunned by walls or objects: you slide off them and keep going. Traps still stop you.' },
  extreme:    { name: 'Extreme Mode',  icon: '∞', only: 'granny', desc: 'Granny only. Once the exit gates are powered, Bat Rush has no limit: hold as long as you like and she keeps going.' },
};

// perk prices in Embers (perks not listed are free); exclusive perks cost 2,500
export const PERK_PRICES = {
  medic: 1500, hushed: 1500, sixth: 2000, lockpick: 1500, acrobat: 1500, resolve: 2000, fleet: 2000,
  triage: 2500, overclock: 2500, exposure: 2500, pathfinder: 2500, containment: 2500, exorcist: 2500,
  static: 1500, dread: 1500, brute: 1500, rust: 2000, sentry: 2000, fury: 1500, irongrip: 2000, stalker: 2500, stunless: 6000, extreme: 500000,
};
export const PERK_SLOTS = 4;
// ---------------- Sidekicks (cosmetic companions, for survivors and killers) ----------------
export const SIDEKICKS = {};
export const DEFAULT_SURV_PERKS = ['steady', 'shared', 'lastwind'];
export const DEFAULT_KILLER_PERKS = ['scent', 'overload', 'relentless'];

export const BOT_NAMES = ['Ash', 'Rook', 'Wren', 'Sable', 'Kit', 'Moss', 'Vale', 'Quill', 'Hollis', 'Briar', 'Fen', 'Lark'];

export const DIFFICULTY = {
  easy:   { react: 0.9, skill: 0.75, great: 0.05, aim: 0.3, killerSpeed: 0.84, sight: 18, reach: 2.1 },
  normal: { react: 0.55, skill: 0.9, great: 0.15, aim: 0.42, killerSpeed: 0.87, sight: 22, reach: 2.2 },
  hard:   { react: 0.25, skill: 0.96, great: 0.3, aim: 0.92, killerSpeed: 1.0, sight: 38, reach: 2.9 },
};

// ---------------- Lore (shown on the Loadout screen and in the Store) ----------------
export const LORE = {};


// ---------------- Store: skins (bought with embers) ----------------
export const SKINS = {
  mara: [
    { id: 'default', name: 'Field Jacket', price: 0 },
    { id: 'nightshift', name: 'Night Shift', price: 1500, shirt: 0x2a2e38, pants: 0x15171c, hair: 0x0e0b0a, desc: 'Ball cap, head torch and a scarf against the cold.', fx: [['cap', { color: 0x1a1e26 }], 'headlamp', ['scarf', { color: 0x4a1a1a }]] },
    { id: 'crimson', name: 'Crimson Hood', price: 2500, shirt: 0x6a0d10, pants: 0x222222, desc: 'A blood-red riding cloak, hood up. Not all of the red is dye.', fx: [['hood', { color: 0x6a0a0c }], ['cloak', { color: 0x6a0a0c, flare: 1.8 }], 'blood'] },
    { id: 'medic', name: 'Trauma Medic', price: 4000, shirt: 0xd8d4c8, pants: 0x2a3a4a, desc: 'Gas mask, plate carrier and a field medic pack. Ready for anything.', fx: [['gasmask', { color: 0x2a2e2a }], ['armor', { color: 0x3a4a3a, patch: 0xd02020 }], ['backpack', { color: 0xd8d4c8, cross: true }]] },
  ],
  eli: [
    { id: 'default', name: 'Hoodie', price: 0 },
    { id: 'overalls', name: 'Grease Monkey', price: 1500, shirt: 0x2f4a6a, pants: 0x2f4a6a, desc: 'Beanie, welding goggles and a belt full of tools.', fx: [['beanie', { color: 0x8a2a1a }], ['goggles', { color: 0x3a8a9a }], 'toolbelt'] },
    { id: 'hazard', name: 'Hazard Crew', price: 2500, shirt: 0x3a3a3a, pants: 0x2a2a2a, desc: 'Hard hat with a lamp, respirator and a hi-vis vest.', fx: [['hardhat', { color: 0xe0b020, lamp: true }], ['respirator', { filter: 0xd06020 }], ['hivis', { color: 0xf0a020 }]] },
    { id: 'midnight', name: 'Midnight Run', price: 4000, shirt: 0x14141c, pants: 0x14141c, desc: 'Hood up, hockey mask down, eyes that catch the light.', fx: [['hood', { color: 0x14141c }], ['hockey', { color: 0xe8e4d8, chevron: 0xc01a1a }], ['eyes', { color: 0x6affff }]] },
  ],
  june: [
    { id: 'default', name: 'Knit Sweater', price: 0 },
    { id: 'autumn', name: 'Autumn Coat', price: 1500, shirt: 0x8a4a20, pants: 0x2a2018, desc: 'Long wool coat, beanie and her camera.', fx: [['coat', { color: 0x6a3a1a }], ['beanie', { color: 0xa06030 }], 'camera'] },
    { id: 'ghost', name: 'Ghost Story', price: 2500, shirt: 0xdedad2, pants: 0x3a3a40, hair: 0xe8e0c8, desc: 'She went into the lake to get the photo. Something came back out.', fx: [['ghost', { color: 0xa8d8ff, op: 0.55 }], ['veil', { color: 0xdfe8ff, op: 0.4, len: 7, wide: 2.4 }], ['eyes', { color: 0x9ae0ff }]] },
    { id: 'reporter', name: 'Field Reporter', price: 4000, shirt: 0x4a5a3a, pants: 0x1c1c18, desc: 'Press vest, head torch, camera and a pack full of tapes.', fx: [['armor', { color: 0x3a4a6a, patch: 0xe8e8e8 }], 'headlamp', 'camera', ['backpack', { color: 0x3a3a2a, radio: true }]] },
  ],
  tomas: [
    { id: 'default', name: 'Ranger', price: 0 },
    { id: 'camo', name: 'Woodland Camo', price: 1500, shirt: 0x3a4a2a, pants: 0x2a3020, desc: 'Boonie hat, ghillie strips and a heavy pack.', fx: [['boonie', { color: 0x4a5236 }], ['moss', { color: 0x4a5a2a, glow: 0x000000 }], ['backpack', { color: 0x3a4228 }]] },
    { id: 'firewatch', name: 'Firewatch', price: 2500, shirt: 0xb04020, pants: 0x2a2018, desc: 'Red helmet, smoke goggles and a fire axe across his back.', fx: [['hardhat', { color: 0xb02010 }], ['goggles', { color: 0xd08020, down: true }], 'axe', ['scarf', { color: 0xd8c8a0 }]] },
    { id: 'searchlight', name: 'Search & Rescue', price: 4000, shirt: 0xd86a10, pants: 0x1a1a22, desc: 'Helmet lamp, hi-vis vest and a radio pack with a blinking beacon.', fx: [['hardhat', { color: 0xf0f0f0, lamp: true }], ['hivis', { color: 0xe8e020 }], ['backpack', { color: 0xc04010, radio: true }]] },
  ],
  raghuvir: [
    { id: 'default', name: 'Ghostbuster', price: 0, desc: 'Khaki flight suit, proton pack, name tag. Who you gonna call?', fx: [['face', { kind: 'r', skin: 0xb08058 }], 'fringehair', 'specs', ['protonpack', {}], ['nametag', {}], ['wand', {}]] },
    { id: 'street', name: 'Beige Puffer', price: 1500, shirt: 0xb8a48a, pants: 0x1a1a1e, desc: 'Off duty: beige puffer jacket with a black hood and sleeves.', fx: [['face', { kind: 'r', skin: 0xb08058 }], 'fringehair', 'specs', ['puffer', { color: 0xb8a48a }]] },
    { id: 'realism', name: 'Realism', price: 6000, glb: 'ray', desc: 'A fully realistic Ghostbuster: worn khaki flight suit, straps, name patch and a heavy proton pack. (Model: "Ghostbusters - Dr. Ray Stantz" by spinningblade, CC BY 4.0.)' },
    { id: 'slimed', name: 'Slimed', price: 3500, desc: 'He got slimed. It glows.', fx: [['face', { kind: 'r', skin: 0xb08058 }], 'fringehair', 'specs', ['protonpack', {}], ['wand', {}], ['tint', { color: 0x8aff6a, k: 0.35, e: 0x2a8a1a, ei: 0.5 }]] },
  ],
  spiderman: [
    { id: 'default', name: 'Classic Suit', price: 0, glb: 'spiderman', desc: 'Red and blue, raised webbing, silver lenses. Your friendly neighbourhood Spider-Man. (Model: "Spiderman_topy" by sabra, CC BY 4.0.)' },
  ],
  abeer: [
    { id: 'default', name: 'Ghostbuster', price: 0, desc: 'Khaki flight suit, proton pack, name tag. Ready to bust.', fx: [['face', { kind: 'a', skin: 0xa87650 }], 'mophair', ['protonpack', {}], ['nametag', {}], ['wand', {}]] },
    { id: 'street', name: 'Navy Jacket', price: 1500, shirt: 0x161c30, pants: 0x1a1c22, desc: 'Off duty: navy hooded jacket with a red stripe.', fx: [['face', { kind: 'a', skin: 0xa87650 }], 'mophair', ['stripe', { color: 0xc01e1e }]] },
    { id: 'slimed', name: 'Slimed', price: 3500, desc: 'Covered in ectoplasm, faintly glowing.', fx: [['face', { kind: 'a', skin: 0xa87650 }], 'mophair', ['protonpack', {}], ['wand', {}], ['tint', { color: 0x8aff6a, k: 0.35, e: 0x2a8a1a, ei: 0.5 }]] },
  ],
  butcher: [
    { id: 'default', name: 'Slaughterhouse', price: 0 },
    { id: 'freshcut', name: 'Fresh Cut', price: 2000, apron: 0xd8d0c8, desc: 'Clean whites, a hairnet and a polished cleaver. For about a minute.', fx: [['coat', { color: 0xe8e4dc }], 'hairnet', ['cleaver', { blood: true }], 'blood'] },
    { id: 'hogmask', name: 'Hog Mask', price: 3500, apron: 0x6a4a3a, desc: 'A real pig\'s head, stitched shut, and a belt of meat hooks.', fx: ['pighead', 'hooks', ['chains', { color: 0x5a5a58 }]] },
    { id: 'pale', name: 'Pale Rider', price: 6000, skin: 0x9aa0a4, mask: 0x3a3a3a, apron: 0x1a1a1a, desc: 'Skull, horns, a tattered black cloak and a scythe. Cold blue eyes.', fx: [['skull', { color: 0xd8d0c0 }], ['horns', { color: 0x141210 }], ['cloak', { color: 0x0a0a0c, tatter: true, flare: 2.4 }], ['eyes', { color: 0x6ac8ff }], ['scythe', { glow: 0x2a6aff }]], scale: 1.06 },
  ],
  wisp: [
    { id: 'default', name: 'Drowned Bride', price: 0 },
    { id: 'mourning', name: 'Mourning Veil', price: 2000, dress: 0x16161a, eye: 0xff4030, desc: 'A black veil to the floor and a crown of burning candles.', fx: [['veil', { color: 0x08080a, op: 0.85, len: 10, wide: 3.4 }], ['candles', { color: 0xffa040 }], ['claws', { both: true }]] },
    { id: 'lakemoss', name: 'Lake Moss', price: 3500, dress: 0x4a6a4a, eye: 0xb0ff60, desc: 'Weed and algae from the lake bed, glowing faintly green.', fx: [['tint', { color: 0x4a7a4a, k: 0.45, e: 0x0a3a14, ei: 0.6 }], ['moss', { color: 0x3a6a2a, glow: 0x1a5a14 }], ['eyes', { color: 0xb0ff60 }]] },
    { id: 'bloodmoon', name: 'Blood Moon', price: 6000, dress: 0x6a0a0a, eye: 0xffd040, desc: 'A crimson moon rises behind her. Long black claws.', fx: [['halo', { color: 0xff2a10 }], ['claws', { both: true, color: 0x0a0202 }], 'blood', ['eyes', { color: 0xffd040 }]] },
  ],
  harrower: [
    { id: 'default', name: 'Bone Hunter', price: 0 },
    { id: 'charred', name: 'Charred', price: 2000, bone: 0x2a2420, eye: 0xff8a20, desc: 'Burnt to the bone. Embers still glow through the cracks.', fx: [['embers', { color: 0xff5a10 }], ['eyes', { color: 0xff8a20 }]] },
    { id: 'winter', name: 'Winter Pelt', price: 3500, fur: 0xd8d4cc, bone: 0xeeeae0, eye: 0x60c0ff, desc: 'Frozen solid, crowned with antlers of clear ice, shoulders spiked with frost.', fx: ['frost', ['antlers', { ice: true, size: 1.6 }], ['spikes', { color: 0xbfe8ff }], ['eyes', { color: 0x60c0ff }]] },
    { id: 'gilded', name: 'Gilded Trophy', price: 6000, bone: 0xc8a050, fur: 0x1a1210, eye: 0xffe080, desc: 'Gold bones, a gold crown, gold chains and a gold spear.', fx: [['metal', { match: 0xc8a050 }], ['crown', { color: 0xd8b040, gem: 0xff2020 }], ['chains', { color: 0xd8b040, cross: true }], ['spear', { color: 0xd8b040 }]] },
  ],
  lamplighter: [
    { id: 'default', name: 'Lamplighter', price: 0 },
    { id: 'ember', name: 'Ember Lamp', price: 2000, lamp: 0xff8a3a, desc: 'His coat smoulders. A second lantern burns in his other hand.', fx: [['embers', { color: 0xff7a20 }], ['lamp', { color: 0xff8a3a }]] },
    { id: 'bloodlamp', name: 'Blood Lamp', price: 3500, lamp: 0xff2a2a, coat: 0x2a0a0a, desc: 'A skull for a face, a blood-red cloak and lamps that bleed light.', fx: [['skull', { color: 0xe0d0c0 }], ['cloak', { color: 0x5a0808, flare: 2.0 }], ['lamp', { color: 0xff2020 }], ['eyes', { color: 0xff2a2a }]] },
    { id: 'spectral', name: 'Spectral', price: 6000, lamp: 0x8ad0ff, coat: 0x1a2030, desc: 'Half here, half somewhere else: a translucent, glowing shade.', fx: [['ghost', { color: 0x8ad0ff, op: 0.45 }], ['halo', { color: 0x6ac8ff }], ['eyes', { color: 0x9ae0ff }]] },
  ],
  slimer: [
    { id: 'default', name: 'Kitchen Raider', price: 0 },
    { id: 'ectoblue', name: 'Ecto Blue', price: 2500, desc: 'A rarer, colder spirit: icy blue ectoplasm.', fx: [['tint', { color: 0x4aa8ff, k: 0.7, e: 0x0a3a8a, ei: 0.8 }]], tintGlb: { color: 0x9ad0ff, k: 1, emissive: 0x1a5aff, ei: 0.55 } },
    { id: 'golden', name: 'Golden Glutton', price: 5000, desc: 'He ate the hotel safe. Solid gold, still hungry.', fx: [['tint', { color: 0xe8c040, k: 0.75, e: 0x5a3a00, ei: 0.5 }], ['crown', { color: 0xd8b040, gem: 0x40ff40 }]], tintGlb: { color: 0xffe080, k: 1, emissive: 0x8a5a00, ei: 0.6 } },
  ],
  chucky: [
    { id: 'default', name: 'Good Guy', price: 0, desc: 'Denim overalls, striped shirt, red hair and a kitchen knife. Hi, I\'m Chucky. Wanna play?' },
    { id: 'charred', name: 'Burnt Out', price: 2500, tint: 0x141210, tintK: 0.88, glow: 0x6a1400, glowK: 0.12, desc: 'Pulled from the toy factory fire. Charred black and still smouldering.' },
    { id: 'voodoo', name: 'Voodoo', price: 4500, tint: 0x7aff8a, tintK: 0.3, glow: 0x0a6a1a, glowK: 0.7, desc: 'Ade due Damballa. A sickly green glow from the inside.' },
    { id: 'slappy', name: 'Slappy', price: 6000, slappy: true, desc: 'The ventriloquist\'s dummy who talks back. His own body, his own stiff, puppet-like moves, and an iron-banded wooden mallet instead of the knife. (Model: "slappy_animations" by Howard the Lipscomb, CC BY 4.0.)' },
  ],
  granny: [
    { id: 'default', name: 'House Dress', price: 0, desc: 'Her grey nightgown, her bloody bat, and the stare. You know the one.' },
    { id: 'bloodbath', name: 'Spring Cleaning', price: 3000, tint: 0x8a1010, tintK: 0.35, desc: 'She has been busy. Most of the red is not hers.' },
    { id: 'ghost', name: 'Pale Visitor', price: 4500, tint: 0xd8e4f0, tintK: 0.5, glow: 0x6a8aa8, glowK: 0.35, desc: 'Drained of colour, glowing faintly, like something that stayed in the house long after it should have left.' },
    { id: 'freddy', name: 'Freddy Fazbear', price: 9000, secret: true, glb: 'freddy', desc: 'Legendary. The pizzeria\'s star performer, still running after closing time, with her bat in his paw. Unlocked with a secret code. (Model: "FNaF 1 Freddy Fazbear Rigged" by ShadowSupreme, Sketchfab.)' },
  ],
  grandpa: [
    { id: 'default', name: 'Night Watch', price: 0, grandpa: true, desc: 'Braces, a dirty vest, his old shotgun and a bad mood.' },
    { id: 'bloodbath', name: 'Hunting Season', price: 0, grandpa: true, tint: 0x8a1010, tintK: 0.3, desc: 'Back from a long night in the woods. Not all of it is deer.' },
  ],
  slendrina: [
    { id: 'default', name: 'The Cellar', price: 0, desc: 'Her torn white dress, her long black hair, and those eyes.' },
    { id: 'pale', name: 'Pale Lady', price: 0, tint: 0xd8e4f0, tintK: 0.45, glow: 0x6a8aa8, glowK: 0.3, desc: 'Even paler, glowing faintly in the dark.' },
  ],
  angeline: [
    { id: 'default', name: 'Mother', price: 0, desc: 'Her black dress, her long hair, and the yellow light in her eyes.' },
    { id: 'pale', name: 'Ghost Mother', price: 0, tint: 0xd8e4f0, tintK: 0.4, glow: 0x8a9a6a, glowK: 0.25, desc: 'Faded, glowing faintly, like the photo on the cellar wall.' },
  ],
  bateman: [
    { id: 'default', name: 'Pierce & Pierce', price: 0, desc: 'Charcoal pinstripe double-breasted suit, crisp white shirt, red silk tie and a cigar. Valentino Couture.' },
    { id: 'raincoat', name: 'Hip to Be Square', price: 2500, rain: true, desc: 'A clear plastic raincoat over the suit, for the mess. Newspaper on the floor optional.' },
    { id: 'morning', name: 'Morning Routine', price: 3000, suit: 0xf2efe8, shirt: 0xf2efe8, tie: 0xf2efe8, mask: 0xd8ead0, desc: 'White robe, herb-mint facial mask and a Walkman. Ice pack under the eyes.' },
    { id: 'bloodbath', name: 'Bloodbath', price: 5000, suit: 0xe8e2d8, shirt: 0x8a0a08, tie: 0x5a0606, saw: true, desc: 'Shirt soaked through, chainsaw in hand. He has to return some videotapes.' },
  ],
  foreman: [
    { id: 'default', name: 'Night Shift', price: 0 },
    { id: 'overtime', name: 'Overtime', price: 2000, flesh: 0x9a8a88, apron: 0x2a1a14, blood: 0x6a0a06, desc: 'Hard hat and a hi-vis vest over the apron. Safety first.', fx: [['hardhat', { color: 0xe0b020, lamp: true }], ['hivis', { color: 0xf09020 }]] },
    { id: 'quota', name: 'Quota Met', price: 3500, bone: 0xc8a050, eye: 0xff3a20, desc: 'Employee of the month: a gold mask, a gold hook and gold chains.', fx: [['metal', { names: ['Foreman_8', 'Foreman_14'], color: 0xd8b040 }], ['chains', { color: 0xd8b040, cross: true }], ['crown', { color: 0xd8b040 }]] },
    { id: 'batman', name: 'The Dark Knight', price: 6500, limited: true, batman: true, desc: 'Limited edition. The cowl, the cape, the armoured suit, and the Foreman\'s hook turned into a grappling hook. Fan-made; not affiliated with DC.' },
    { id: 'reassigned', name: 'Reassigned', price: 6000, flesh: 0x7a8a8a, bone: 0x2a2a2a, eye: 0x7affd0, apron: 0x101418, desc: 'Moved to the cold store, and never came back out. A gas-masked teal ghost in chains.', fx: [['ghost', { color: 0x7affd0, op: 0.55 }], ['gasmask', { color: 0x1a1c1e, eye: 0x7affd0, filter: 0x2a2a2a }], ['chains', { color: 0x4a4a4a }]] },
  ],
};
// ---------------- Store: chapters (DLC) ----------------
// Bought with Embers. A chapter unlocks playing as its killer; its map is free for everyone.
export const CHAPTERS = [];
export const CHAPTER_OF = {}; // everything in Granny x DBD is free

export const skinOf = (char, id) => (SKINS[char] || []).find(s => s.id === id) || {};

// ---------------- Inbox: version notes & gifts ----------------
// email updates: the Buttondown newsletter's username (empty: the option stays hidden)
export const NEWSLETTER = '';
// Granny x DBD: four killers (Granny, Grandpa, Slendrina, Angeline) and the four original survivors
export const PLAY_K = ['granny', 'grandpa', 'slendrina', 'angeline'], PLAY_S = ['mara', 'eli', 'june', 'tomas'];
export const playable = c => PLAY_K.includes(c) || PLAY_S.includes(c);
export const DISCORD = 'https://discord.gg/WXvAJ2sgVP';
export const VERSION = '1.3.3';
// Inbox entries with `email: true` are big updates: they are emailed to newsletter subscribers
// automatically (tools/email-updates.mjs). Small tweaks leave it out and are never mailed.
export const INBOX = [
  {
    id: 'gdbd133b', version: '1.3.3', date: 'Nov 2026', title: "New map: Slendrina's Graveyard", tag: 'Update',
    body: [
      "NEW MAP: Slendrina's Graveyard. A ruined church with a bell tower, stone crypts, rows of graves, iron-fenced family plots, open graves and the gravedigger's shed, all in cold mist. Pick it in Play or vote for it in a lobby.",
      'Settings > Optimization mode: runs smoother on slower PCs and phones (no shadows or glow, less grass, lower resolution).',
      'Loading screens: shaders are prepared before things appear, so far fewer freezes before the match and on the menu.',
      'Phones: the on-screen buttons have pictures now.',
      'Phones: move and resize the on-screen buttons the way you like them. Settings > Edit touch controls.',
      'Phones: skill checks take a tap ANYWHERE on the screen now (your other thumb is fine), and the game tells you when to tap.',
      'Phones: let go of USE in the middle of a repair or heal and it keeps going, so both thumbs are free. Move or tap USE to stop.',
      'Phones: emotes work (they could not be picked before).',
      "Angeline's arms no longer disappear into her dress.",
      'Freddy Fazbear outfit: a bit taller, and he hits with his paw (no bat).',
    ],
  },
  {
    id: 'gdbd132', version: '1.3.2', date: 'Nov 2026', title: 'Freddy Fazbear, profiles and gifts', tag: 'Update',
    gift: { embers: 1000, label: 'Update gift: 1,000 Embers' },
    body: [
      'Your own profile card: click your name (top right) to pick an avatar, a banner, a title and a motto. Everyone in your lobby sees it.',
      "Legendary Freddy Fazbear skin for Granny: the first 10 members of the official Discord get a code for it (Discord button, top of the menu). Redeem it in Store > Codes.",
      'Gift outfits: Store > Codes. Buy an outfit as a gift and send the code to a friend; type a code in to redeem it.',
      'Smarter bots: survivors split up across the generators, tell each other where the killer is, heal each other, loop around walls and pallets, and stop leading the killer to their friends.',
      "Granny's Ground Slam can only injure now: it never puts anyone down.",
      'Smoother loading into a match, and the loading screen no longer shows the menu through it.',
    ],
  },
  {
    id: 'gdbd13', version: '1.3.0', date: 'Nov 2026', title: 'Angeline arrives', tag: 'Update',
    gift: { embers: 1500, label: 'Update gift: 1,500 Embers' },
    body: [
      "New killer: Angeline, Slendrina's mother. Yellow Eyes (a beam that Spots you: one hit downs) and Lullaby (nobody near her can run).",
      "Granny's House: the floors no longer have pieces floating in the air.",
      'Better graphics and a new loading screen.',
      "Grandpa's bear traps now use the real Granny bear trap, and snap shut on you.",
      'Online: public lobbies anyone can join from the lobby list, or private ones with a code.',
      'Join the official Discord server: the Discord button at the top of the menu (discord.gg/WXvAJ2sgVP).',
    ],
  },
  {
    id: 'gdbd12', version: '1.2.0', date: 'Nov 2026', title: "Into Granny's Old House", tag: 'Update',
    gift: { embers: 1000, label: 'Update gift: 1,000 Embers' },
    body: [
      "Granny's Old House is open: walk in through the front door. Hall, kitchen, living room, and a generator inside.",
      "Grandpa's shotgun hits harder: two shots put anyone down from mid range on, three point-blank, and every hit staggers.",
      'Slendrina is taller.',
      "Smarter bots: survivors dodge Grandpa's aim, look away from Slendrina and remember the traps they've seen; killers pick their targets better and Grandpa keeps his distance.",
    ],
  },
  {
    id: 'gdbd11', version: '1.1.0', date: 'Nov 2026', title: 'Grandpa, Slendrina and a new map', tag: 'Update',
    gift: { embers: 1500, label: 'Update gift: 1,500 Embers' },
    body: [
      'Grandpa is his own killer now: a stronger shotgun (two shots put anyone down, every hit staggers) and bear traps.',
      'New killer: Slendrina. Haunt (vanish and reappear up to 16m away, through walls) and Cursed Gaze (look at her and pay for it).',
      "New map: Granny's Old House. Her first house, out in the woods.",
      'Smarter bots: they no longer stand around stuck at generators, chests, hooks or pallets.',
      'Windows app: one file that just runs, and it recovers by itself if the graphics driver crashes.',
    ],
  },
  {
    id: 'gdbd1', version: '1.0.0', date: 'Nov 2026', title: 'Welcome to Granny x DBD', tag: 'Launch',
    gift: { embers: 1000, label: 'Welcome gift: 1,000 Embers' },
    body: [
      "What Granny in a Dead by Daylight style game could look like: four survivors, seven generators and Granny's House.",
      'Play as Granny (Bat Rush, I Hear You, Creep, Body Swap), or as Grandpa with his shotgun (free outfit).',
      'Survivors: Mara, Eli, June and Tomás. Bot matches and online lobbies with friends.',
      'Fan-made. Granny and Grandpa are characters by DVloper; not affiliated with or endorsed by them.',
    ],
  },
];

// ---------- 1.3.2: profile cards, secret codes, gift codes ----------
export const PROFILE_BANNERS = {
  blood: { name: 'Blood', a: '#6a0e0e', b: '#160405' }, midnight: { name: 'Midnight', a: '#1a2a4a', b: '#05070d' },
  moss: { name: 'Moss', a: '#2a3e1e', b: '#070a05' }, bone: { name: 'Bone', a: '#5e5444', b: '#141210' },
  ember: { name: 'Ember', a: '#7a3a10', b: '#140804' }, violet: { name: 'Violet', a: '#422058', b: '#0a050f' },
  gold: { name: 'Gold', a: '#76601c', b: '#141005' }, ash: { name: 'Ash', a: '#3a3a3e', b: '#0a0a0c' },
};
// titles: `need(stats, profile)` unlocks it; no `need` = free
export const PROFILE_TITLES = {
  fog: { name: 'Lost in the Fog' }, guest: { name: "Granny's Guest" }, night: { name: 'Night Owl' }, creak: { name: 'Creaky Floorboard' },
  escape: { name: 'Escape Artist', hint: '10 escapes', need: st => (st.escapes || 0) >= 10 },
  hunter: { name: 'The Hunter', hint: '10 kills', need: st => (st.kills || 0) >= 10 },
  regular: { name: 'Regular', hint: '25 matches', need: st => (st.matches || 0) >= 25 },
  veteran: { name: 'Veteran of the House', hint: '100 matches', need: st => (st.matches || 0) >= 100 },
  hoarder: { name: 'Ember Hoarder', hint: 'hold 10,000 Embers', need: st => (st.embers || 0) >= 10000 },
  gifter: { name: 'Generous', hint: 'gift an outfit', need: (st, P) => !!(P.gifts && P.gifts.length) },
  showtime: { name: "It's Showtime", hint: 'a secret', secret: true, need: (st, P) => !!(P.owned && P.owned['granny:freddy']) },
};
// SHA-256 of 'gdbd-showbear:' + code (they unlock Granny's legendary Freddy Fazbear outfit) (no dashes): the codes themselves are not in the game
export const SECRET_CODES = ["a6fb993d580ca12455d500af871be912e902f2ed21e22e270ca4c5833b09439d", "acf3b8fe9a31f8d8625419ab93a1681e3811330d23e013bcf2965c2ec657aaae", "52517749c1e9d61e4b1c580b718f8e9082446bd4d0bce3755cbc6918d6c755dc", "bd5977e481fdafa95fc238758c7ac53c030a5d241a3cb27b1d42d2aa01d5adcd", "11eea88346def0fb7e43a7b450776842f99f3307859d9b6282a31961bae1dc25", "56f719f05edae38085c1073e6b2c3de395ae0107b3644f984d83a9d5f8a2190f", "7bff9130dc1416c1a7d925add43aa660daf01a1dc2f1a0d839ef6d796523cc0a", "aa0ec1e4854f2e5df076d40da49aa8e735aa7c8ad61e99201a792271145282b4", "617dde538cb62f8050b88286870607fc05f40b6be75e3998f9f1f0095a1a8849", "445358acb7fba3b30c076874c6e309a63be51647781d474abc3316376d947ee7"];
// gift codes name a character by its place in this list and an outfit by its place in SKINS[char]:
// only ever add to the END of both, or old gift codes would turn into different outfits
export const GIFT_CHARS = ['mara', 'eli', 'june', 'tomas', 'granny', 'grandpa', 'slendrina', 'angeline'];
