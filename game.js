'use strict';
/* INCR.OS — a terminal-themed prestige incremental.
 *
 * Layer 0  BYTES     8 tiers of processes; tier N produces tier N-1, tier 1 produces bytes.
 * Layer 1  REBOOT    reset bytes/processes/clock for KERNELS (boost + module shop).
 * Layer 2  FORMAT    reset the kernel layer for CORES (bigger boost + firmware shop).
 * Beyond   past 1.79e308 bytes ("the door"), PATCHES bought with bytes lift a soft cap.
 * Goal     reach 1e1000 bytes and /patch the-door.
 *
 * Bytes, process amounts and production are L numbers (log10 of the value, see
 * big.js) so they can pass Number.MAX_VALUE. Kernels and cores stay plain numbers.
 */

// ---------------------------------------------------------------- constants
const SAVE_KEY = 'incr_os_save_v1';
const SAVE_VERSION = 2; // 2 = bytes stored as L numbers
const TIERS = 8;
const NAMES = SKINS.default.names; // command names, whatever the skin
const BASE_COST_L = [1, 2, 4, 6, 9, 13, 18, 24];
const COST_MULT_L = [3, 4, 5, 6, 8, 10, 12, 15];
const REBOOT_L = 12;
const FORMAT_AT = 1e6;
const OVERFLOW_L = Math.log10(Number.MAX_VALUE); // 308.25: "the door"
const GOAL_L = 1000;
const MAXN = Number.MAX_VALUE;

// Upgrades are bought from the terminal (/install, /flash, /patch) by their `key`.
const K_UPGRADES = [
  { id: 'procfs',    key: 'procfs',       cost: 1,    desc: 'Unlocks /top.' },
  { id: 'start',     key: 'warm-cache',   cost: 1,    desc: 'Start every reboot with 1,000 bytes.' },
  { id: 'auto1',     key: 'cron-jobs',    cost: 2,    desc: 'Autobuy tiers 1-4. Unlocks /auto.' },
  { id: 'alias',     key: 'alias',        cost: 3,    desc: 'Unlocks /alias (your own command shortcuts).' },
  { id: 'autoClock', key: 'governor',     cost: 5,    desc: 'Autobuy CLOCK SPEED. Unlocks /auto clock.' },
  { id: 'ten1',      key: 'loop-unroll',  cost: 8,    desc: 'Per-10 bonus x2.0 -> x2.2.' },
  { id: 'zlib',      key: 'zlib',         cost: 12,   desc: 'Unlocks /compress (double kernel gain).' },
  { id: 'auto2',     key: 'systemd',      cost: 20,   desc: 'Autobuy tiers 5-8. Unlocks /auto t2.' },
  { id: 'clockBase', key: 'overvolt',     cost: 40,   desc: 'CLOCK SPEED +0.025x per level.' },
  { id: 't1boost',   key: 'self-hosting', cost: 100,  desc: 'Tier 1 gains x log10(bytes).' },
  { id: 'bash',      key: 'bash',         cost: 150,  desc: 'Unlocks /script (run commands automatically).' },
  { id: 'time',      key: 'uptime',       cost: 300,  desc: 'Production grows with time since reboot. Unlocks /uptime.' },
  { id: 'ten2',      key: 'vectorize',    cost: 2000, desc: 'Per-10 bonus +0.3 more.' },
];
const C_UPGRADES = [
  { id: 'keep',       key: 'persistent-etc',    cost: 1,   desc: 'Keep autobuyer, alias and bash modules on FORMAT. Flashing it gives back the ones your last FORMAT wiped.' },
  { id: 'autoReboot', key: 'watchdog',          cost: 2,   desc: 'Auto-REBOOT. Unlocks /watchdog and /auto reboot.' },
  { id: 'startK',     key: 'bootloader',        cost: 4,   desc: 'Start each FORMAT with 100 kernels.' },
  { id: 'ten',        key: 'simd',              cost: 10,  desc: 'Per-10 bonus +0.5.' },
  { id: 'clock',      key: 'ln2-cooling',       cost: 30,  desc: 'CLOCK SPEED +0.05x per level.' },
  { id: 'recursive',  key: 'recursive-compile', cost: 100, desc: 'All production x log10(bytes)^2.' },
];
// Past the door: bought with bytes (costL = log10 of the price), never reset.
const PATCHES = [
  { id: 'pae',    key: 'pae',         costL: 310,  desc: 'Soft cap ^0.50 -> ^0.60.' },
  { id: 'x8664',  key: 'x86-64',      costL: 330,  desc: 'Per-10 bonus +0.5.' },
  { id: 'bigint', key: 'bigint',      costL: 360,  desc: 'Soft cap ^0.60 -> ^0.70.' },
  { id: 'ecc',    key: 'ecc-ram',     costL: 400,  desc: 'Kernel gain: 8th root -> 7th root of bytes.' },
  { id: 'numa',   key: 'numa',        costL: 450,  desc: 'CLOCK SPEED +0.05x per level.' },
  { id: 'b128',   key: '128-bit',     costL: 520,  desc: 'Soft cap ^0.70 -> ^0.85.' },
  { id: 'qram',   key: 'quantum-ram', costL: 650,  desc: 'Soft cap removed.' },
  { id: 'door',   key: 'the-door',    costL: GOAL_L, desc: 'Open it.' },
];
for (const u of [...K_UPGRADES, ...C_UPGRADES, ...PATCHES]) u.name = u.key.toUpperCase();
// kernel modules that persistent-etc keeps through a FORMAT
const KEEP_IDS = ['auto1', 'auto2', 'autoClock', 'alias', 'bash'];
const K_BY_ID = Object.fromEntries(K_UPGRADES.map(u => [u.id, u]));
const C_BY_ID = Object.fromEntries(C_UPGRADES.map(u => [u.id, u]));
const P_BY_ID = Object.fromEntries(PATCHES.map(u => [u.id, u]));

// Challenges: restart the run with a handicap, reach goalL to beat it.
// tier 1: after 3 reboots · tier 2: after a FORMAT · final: after all the others.
const CHALLENGES = [
  { id: 'underclock', tier: 1, goalL: 12, desc: 'CLOCK SPEED is disabled.',             reward: 'CLOCK SPEED +0.02x per level.' },
  { id: 'quadcore',   tier: 1, goalL: 12, desc: 'Only tiers 1-4 can run.',              reward: 'Tiers 1-4 produce x3.' },
  { id: 'safemode',   tier: 1, goalL: 12, desc: 'Kernels give no production boost.',    reward: 'Kernel boost ^0.7 -> ^0.75.' },
  { id: 'manual',     tier: 1, goalL: 12, desc: 'Autobuyers and scripts are disabled.', reward: 'Per-10 bonus +0.1.' },
  { id: 'inflation',  tier: 2, goalL: 40, desc: 'Process costs scale twice as fast.',   reward: 'Process costs scale 10% slower.' },
  { id: 'entropy',    tier: 2, goalL: 30, desc: 'Byte production is raised to ^0.75.',  reward: 'Byte production ^1.02.' },
  { id: 'nomodules',  tier: 2, goalL: 30, desc: 'Kernel modules do nothing.',           reward: 'Kernel gain x3.' },
  { id: 'singlecore', tier: 2, goalL: 14, desc: 'Only tiers 1-2 can run.',              reward: 'Tiers 1-2 produce x1000.' },
  { id: 'kernel-panic', tier: 3, goalL: 18, desc: 'EVERY challenge at once.',           reward: 'Production x1e10 and the title "root".' },
];
const CHAL_BY_ID = Object.fromEntries(CHALLENGES.map(c => [c.id, c]));

// Other machines reachable with /ssh. Each keeps its own run (bytes, processes,
// kernels, modules); cores, firmware, patches and achievements are shared.
const MACHINES = {
  'incr-7': { trait: 'home. no special traits.',                          unlock: () => true },
  'incr-8': { trait: 'overclocked: CLOCK SPEED +0.05x per level.',        unlock: () => S.stats.formats > 0 },
  'incr-9': { trait: 'kernel farm: kernel gain x3, byte production x0.1.', unlock: () => S.stats.formats >= 3 },
};
// fields that belong to one machine (the active one lives directly on S)
const MACHINE_KEYS = ['bytes', 'tiers', 'clocks', 'kernels', 'kernelsEarned', 'kGainLvl', 'kUpg', 'auto'];

const ACH = [
  { id: 'a1',  name: 'hello, world',     desc: 'Buy a tier 1 process.',         check: () => S.tiers[0].bought > 0 },
  { id: 'a2',  name: 'fork()',           desc: 'Buy a tier 3 process.',         check: () => S.tiers[2].bought > 0 },
  { id: 'a3',  name: 'Full stack',       desc: 'Buy a tier 8 process.',         check: () => S.tiers[7].bought > 0 },
  { id: 'a4',  name: 'Overclocked',      desc: 'Reach CLOCK SPEED level 10.',   check: () => S.clocks >= 10 },
  { id: 'a5',  name: 'Gigabyte',         desc: 'Have 1e9 bytes.',               check: () => S.bytes >= 9 },
  { id: 'a6',  name: 'Off and on again', desc: 'REBOOT once.',                  check: () => S.stats.reboots > 0 },
  { id: 'a7',  name: 'Uptime: 0',        desc: 'REBOOT 10 times.',              check: () => S.stats.reboots >= 10 },
  { id: 'a8',  name: 'Speedrun',         desc: 'REBOOT in under 30 seconds.',   check: () => S.stats.fastestReboot !== null && S.stats.fastestReboot < 30 },
  { id: 'a9',  name: 'Googol',           desc: 'Have 1e100 bytes.',             check: () => S.bytes >= 100 },
  { id: 'a10', name: 'Kernel panic',     desc: 'Earn 1,000 kernels in one format.', check: () => S.kernelsEarned >= 1e3 },
  { id: 'a11', name: 'rm -rf /',         desc: 'FORMAT once.',                  check: () => S.stats.formats > 0 },
  { id: 'a12', name: 'Heat death',       desc: 'Have 1e200 bytes.',             check: () => S.bytes >= 200 },
  { id: 'a13', name: 'SYSTEM OVERFLOW',  desc: 'Have 1.79e308 bytes.',          check: () => S.stats.overflowed },
  { id: 'a14', name: 'Script kiddie',    desc: 'Write a script.',               check: () => S.scripts.length > 0 },
  { id: 'a15', name: 'Hard mode',        desc: 'Beat a challenge.',             check: () => Object.keys(S.chal.done).length > 0 },
  { id: 'a16', name: 'Cracked',          desc: 'Open the vault.',               check: () => !!S.fsRan.vault },
  { id: 'a17', name: 'Botnet',           desc: 'Connect to another machine.',   check: () => S.machine !== 'incr-7' || Object.keys(S.machines).length > 0 },
  { id: 'a18', name: 'Fashion victim',   desc: 'Change the skin of your processes.', check: () => S.skin !== 'default' || Object.keys(S.rename).length > 0 },
  { id: 'a19', name: 'Beyond',           desc: 'Have 1e500 bytes.',             check: () => S.bytes >= 500 },
  { id: 'a20', name: 'root',             desc: 'Beat kernel-panic.',            check: () => chalDone('kernel-panic') },
  { id: 'a21', name: 'The other side',   desc: 'Open the door.',                check: () => hasP('door') },
];

// ---------------------------------------------------------------- state
function freshTiers() {
  return Array.from({ length: TIERS }, () => ({ amt: ZERO, bought: 0 }));
}
function freshMachine() {
  return {
    bytes: 1, tiers: freshTiers(), clocks: 0,
    kernels: 0, kernelsEarned: 0, kGainLvl: 0, kUpg: {},
    auto: { t1: true, t2: true, clock: true, reboot: false, rebootAt: 1 },
    thisReboot: 0, thisFormat: 0, lastSeen: Date.now(),
  };
}
function newState() {
  const m = freshMachine();
  return {
    v: SAVE_VERSION,
    machine: 'incr-7',
    machines: {}, // inactive machines: id -> snapshot
    bytes: m.bytes, tiers: m.tiers, clocks: m.clocks,
    kernels: 0, kernelsEarned: 0, kGainLvl: 0, kUpg: {},
    auto: m.auto,
    cores: 0, coresEarned: 0, cUpg: {},
    patches: {},
    wipedKeep: [], // modules the last FORMAT wiped (persistent-etc gives them back)
    ach: {},
    cmds: {}, // commands already announced as unlocked
    aliases: {},
    scripts: [], // { trigger: 'boot' | 'every', secs, cmd, acc }
    chal: { active: null, done: {} },
    fsRan: {},   // one-time programs already run
    buffs: { turboUntil: 0 },
    skin: 'default',
    rename: {},  // tier index -> custom name
    tut: { step: 0, done: false, f: {} },
    gui: { on: true, win1: false, declined: false }, // graphical environment (first reboot); declined = said no to it
    stats: {
      played: 0, thisReboot: 0, thisFormat: 0,
      reboots: 0, formats: 0, fastestReboot: null,
      bestBytes: 1, totalBytes: ZERO, highestTier: 0, overflowed: false,
    },
    opts: { theme: 'green', scan: true, flicker: true, notation: 'sci', news: true, keys: 'auto', music: true, volume: 40 },
    seenVersion: '', // last version whose changelog the player opened
    won: false,      // opened the door
    lastTick: Date.now(),
  };
}
let S = newState();

const inChal = id => S.chal.active === id || S.chal.active === 'kernel-panic';
const chalDone = id => !!S.chal.done[id];
const has = id => !!S.kUpg[id] && !inChal('nomodules');
const hasC = id => !!S.cUpg[id];
const hasP = id => !!S.patches[id];
const onMachine = id => S.machine === id;
const turboLeft = () => Math.max(0, S.buffs.turboUntil - S.stats.played);

// display name of a process (skin or custom rename)
function pname(i) {
  return S.rename[i] || (SKINS[S.skin] || SKINS.default).names[i];
}
const picon = i => (SKINS[S.skin] || SKINS.default).icons[i];

// ---------------------------------------------------------------- formulas
function perTen() {
  let m = 2;
  if (has('ten1')) m += 0.2;
  if (has('ten2')) m += 0.3;
  if (hasC('ten')) m += 0.5;
  if (chalDone('manual')) m += 0.1;
  if (hasP('x8664')) m += 0.5;
  return m;
}
function clockBase() {
  let b = 1.125;
  if (has('clockBase')) b += 0.025;
  if (hasC('clock')) b += 0.05;
  if (chalDone('underclock')) b += 0.02;
  if (hasP('numa')) b += 0.05;
  if (onMachine('incr-8')) b += 0.05;
  return b;
}
function costScale() {
  let k = 1;
  if (inChal('inflation')) k *= 2;
  if (chalDone('inflation')) k *= 0.9;
  return k;
}
// Past the door every price grows quadratically. Without this, multipliers grow
// as fast as bytes do and the whole economy runs away to infinity.
const SCALE_DIV = 800;
function scaledL(costL) {
  if (costL <= OVERFLOW_L) return costL;
  const x = costL - OVERFLOW_L;
  return OVERFLOW_L + x + x * x / SCALE_DIV;
}
const tierCostL = i => scaledL(BASE_COST_L[i] + COST_MULT_L[i] * Math.floor(S.tiers[i].bought / 10) * costScale());
// clock speed boosts all 8 tiers, so its price also grows quadratically from the
// start; with plain x10 steps it pays for itself and production runs away
const clockCostL = () => scaledL(3 + S.clocks + S.clocks * S.clocks / 100);
const tierUnlocked = i => (i === 0 || S.tiers[i - 1].bought > 0)
  && !(inChal('quadcore') && i >= 4) && !(inChal('singlecore') && i >= 2);
const clockUnlocked = () => (S.tiers[1].bought > 0 || S.clocks > 0) && !inChal('underclock');

function tierMultL(i) {
  let m = Math.floor(S.tiers[i].bought / 10) * Math.log10(perTen());
  if (i === 0 && has('t1boost')) m += Math.log10(Math.max(1, S.bytes));
  if (i < 4 && chalDone('quadcore')) m += Math.log10(3);
  if (i < 2 && chalDone('singlecore')) m += 3;
  return m;
}
const kernelL = () => (inChal('safemode') ? 0 : Math.log10(1 + Math.pow(S.kernelsEarned, chalDone('safemode') ? 0.75 : 0.7)));
const coreL = () => 1.5 * Math.log10(1 + S.coresEarned);
const achCount = () => Object.keys(S.ach).length;
const achMult = () => 1 + 0.05 * achCount();
const timeEffect = () => Math.sqrt(1 + Math.min(S.stats.thisReboot, 3600) / 30);
const recursiveL = () => 2 * Math.log10(Math.max(1, S.bytes));
function kGainMult() {
  let m = Math.pow(2, S.kGainLvl) * Math.sqrt(1 + S.coresEarned);
  if (S.fsRan.patch) m *= 2;
  if (chalDone('nomodules')) m *= 3;
  if (onMachine('incr-9')) m *= 3;
  return Math.min(MAXN, m);
}
const kGainCost = () => 50 * Math.pow(8, S.kGainLvl);

// Clock speed accelerates every tier; prestige boosts multiply byte output only
// (applying them to all 8 tiers compounds to boost^8 and breaks pacing).
const speedL = () => (inChal('underclock') ? 0 : S.clocks * Math.log10(clockBase()));
function boostL() {
  let m = kernelL() + coreL() + Math.log10(achMult());
  if (has('time')) m += Math.log10(timeEffect());
  if (hasC('recursive')) m += recursiveL();
  if (S.fsRan.vault) m += Math.log10(2);
  if (turboLeft() > 0) m += Math.log10(5);
  if (chalDone('kernel-panic')) m += 10;
  if (onMachine('incr-9')) m -= 1;
  return m;
}
const globalL = () => speedL() + boostL();
// Past the door, byte production above 1.79e308/s is soft capped: the excess
// exponent is multiplied by this. Patches raise it back to 1.
const softcapExp = () => (hasP('qram') ? 1 : hasP('b128') ? 0.85 : hasP('bigint') ? 0.7 : hasP('pae') ? 0.6 : 0.5);

// what tier i produces per second (bytes for tier 1, tier i-1 otherwise), as L
function outL(i) {
  const t = S.tiers[i];
  if (t.amt === ZERO) return ZERO;
  let r = t.amt + tierMultL(i) + speedL();
  if (i > 0) return r;
  r += boostL();
  if (r > 0 && inChal('entropy')) r *= 0.75;
  if (r > 0 && chalDone('entropy')) r *= 1.02;
  if (r > OVERFLOW_L) r = OVERFLOW_L + (r - OVERFLOW_L) * softcapExp();
  return r;
}
const bpsL = () => outL(0);

const rebootRoot = () => (hasP('ecc') ? 7 : 8);
function rebootGain() {
  if (S.bytes < REBOOT_L) return 0;
  return Math.min(MAXN, Math.floor(Math.pow(10, (S.bytes - REBOOT_L) / rebootRoot()) * kGainMult()));
}
function nextKernelAtL() {
  const g = rebootGain();
  return REBOOT_L + rebootRoot() * Math.log10((g + 1) / kGainMult());
}
function formatGain() {
  if (S.kernelsEarned < FORMAT_AT) return 0;
  return Math.min(MAXN, Math.floor(Math.pow(S.kernelsEarned / FORMAT_AT, 0.3)));
}
const chalGoalL = () => (S.chal.active ? CHAL_BY_ID[S.chal.active].goalL : REBOOT_L);

// ---------------------------------------------------------------- simulation
const clampN = x => (isFinite(x) ? x : MAXN);
let bgSim = false; // catching up an inactive machine: global clocks don't move

function addBytes(l) {
  S.bytes = L.add(S.bytes, l);
  S.stats.totalBytes = L.add(S.stats.totalBytes, l);
  if (S.bytes > S.stats.bestBytes) S.stats.bestBytes = S.bytes;
}

let autoAcc = 0, achAcc = 0;
function step(dt) {
  if (!(dt > 0)) return;
  const ldt = Math.log10(dt);
  for (let i = TIERS - 1; i >= 1; i--) {
    const t = S.tiers[i - 1];
    t.amt = L.add(t.amt, outL(i) + ldt);
  }
  addBytes(outL(0) + ldt);

  if (!bgSim) S.stats.played += dt;
  S.stats.thisReboot += dt;
  S.stats.thisFormat += dt;

  if (!bgSim && ev && ev.def.id === 'virus') S.bytes += Math.log10(Math.max(1e-6, 1 - 0.02 * dt));
  if (S.chal.active && S.bytes >= chalGoalL()) completeChallenge();

  autoAcc += dt;
  if (autoAcc >= 0.1) { autoAcc = 0; runAuto(); }
  runScripts('every', dt);
  achAcc += dt;
  if (achAcc >= 0.5) { achAcc = 0; checkAch(); checkCommands(false); }

  if (!S.stats.overflowed && S.bytes >= OVERFLOW_L) { S.stats.overflowed = true; onOverflow(); }
}

function simulate(sec) {
  const steps = Math.min(2000, Math.max(1, Math.ceil(sec / 0.05)));
  const dt = sec / steps;
  for (let i = 0; i < steps; i++) step(dt);
}

// ---------------------------------------------------------------- buying
function onBought(i) {
  if (i + 1 > S.stats.highestTier) {
    S.stats.highestTier = i + 1;
    log(`spawned new process: 0${i + 1} ${pname(i)}`, 'ok');
  }
}
function buyOne(i) {
  if (!tierUnlocked(i)) return false;
  const c = tierCostL(i);
  if (S.bytes < c) return false;
  S.bytes = L.sub(S.bytes, c);
  const t = S.tiers[i];
  t.bought++;
  t.amt = L.add(t.amt, 0);
  onBought(i);
  return true;
}
function buyTen(i) {
  if (!tierUnlocked(i)) return false;
  const t = S.tiers[i];
  const n = 10 - (t.bought % 10);
  const c = tierCostL(i) + Math.log10(n);
  if (S.bytes < c) return false;
  S.bytes = L.sub(S.bytes, c);
  t.bought += n;
  t.amt = L.add(t.amt, Math.log10(n));
  onBought(i);
  return true;
}
function buyMax(i) {
  let guard = 0;
  while (guard++ < 2000 && buyTen(i));
  while (guard++ < 2020 && buyOne(i));
}
function buyClock() {
  if (!clockUnlocked()) return false;
  const c = clockCostL();
  if (S.bytes < c) return false;
  S.bytes = L.sub(S.bytes, c);
  S.clocks++;
  return true;
}
function buyClockMax() { let g = 0; while (g++ < 2000 && buyClock()); }
function maxAll() {
  for (let i = TIERS - 1; i >= 0; i--) buyMax(i);
  buyClockMax();
}

function buyK(id) {
  const u = K_BY_ID[id];
  if (!u || S.kUpg[id] || S.kernels < u.cost) return;
  S.kernels -= u.cost; S.kUpg[id] = true;
  log(`installed kernel module: ${u.name}`, 'ok');
}
function buyKGain() {
  const c = kGainCost();
  if (S.kernels < c) return;
  S.kernels -= c; S.kGainLvl++;
  log(`COMPRESSION level ${S.kGainLvl}: kernel gain x${fmt(Math.pow(2, S.kGainLvl))}`, 'ok');
}
function buyC(id) {
  const u = C_BY_ID[id];
  if (!u || hasC(id) || S.cores < u.cost) return;
  S.cores -= u.cost; S.cUpg[id] = true;
  log(`installed core firmware: ${u.name}`, 'ok');
  // persistent-etc can only be bought after a FORMAT, which already wiped the
  // modules it protects: give those back so it works right away
  if (id === 'keep' && S.wipedKeep.length) {
    for (const k of S.wipedKeep) S.kUpg[k] = true;
    log(`restored from /etc: ${S.wipedKeep.map(k => K_BY_ID[k].name).join(', ')}`, 'ok');
    S.wipedKeep = [];
  }
}
function buyP(id) {
  const u = P_BY_ID[id];
  if (!u || hasP(id) || S.bytes < u.costL) return;
  S.bytes = L.sub(S.bytes, u.costL);
  S.patches[id] = true;
  log(`patch applied: ${u.name}`, 'ok');
  if (id === 'door') showEnding();
}

function runAuto() {
  if (inChal('manual')) return;
  if (has('auto2') && S.auto.t2) for (let i = TIERS - 1; i >= 4; i--) buyMax(i);
  if (has('auto1') && S.auto.t1) for (let i = 3; i >= 0; i--) buyMax(i);
  if (has('autoClock') && S.auto.clock) buyClockMax();
  if (hasC('autoReboot') && S.auto.reboot && !S.chal.active && rebootGain() >= Math.max(1, S.auto.rebootAt)) doReboot(true);
}

// ---------------------------------------------------------------- prestige
function resetRun() {
  S.bytes = has('start') ? 3 : 1;
  S.tiers = freshTiers();
  S.clocks = 0;
  S.stats.thisReboot = 0;
}
function doReboot(auto) {
  const gain = rebootGain();
  if (gain < 1) return false;
  const t = S.stats.thisReboot;
  S.kernels = clampN(S.kernels + gain);
  S.kernelsEarned = clampN(S.kernelsEarned + gain);
  S.stats.reboots++;
  if (S.stats.fastestReboot === null || t < S.stats.fastestReboot) S.stats.fastestReboot = t;
  resetRun();
  runScripts('boot', 0);
  // auto-reboots stay quiet so they don't scroll live views off the screen
  if (!auto) log(`system rebooted after ${fmtTime(t)}: +${fmt(gain)} kernels`, 'w');
  return true;
}
function doFormat() {
  const gain = formatGain();
  if (gain < 1) return false;
  S.cores = clampN(S.cores + gain);
  S.coresEarned = clampN(S.coresEarned + gain);
  S.stats.formats++;
  const kept = {};
  const keepable = KEEP_IDS.filter(id => S.kUpg[id]);
  if (hasC('keep')) for (const id of keepable) kept[id] = true;
  else S.wipedKeep = keepable; // persistent-etc gives these back when flashed
  S.kUpg = kept;
  S.kGainLvl = 0;
  S.kernels = hasC('startK') ? 100 : 0;
  S.kernelsEarned = S.kernels;
  S.stats.thisFormat = 0;
  resetRun();
  log(`disk formatted. +${fmt(gain)} cores. everything else is gone.`, 'w');
  return true;
}

function completeChallenge() {
  const c = CHAL_BY_ID[S.chal.active];
  S.chal.done[c.id] = true;
  S.chal.active = null;
  log(`challenge '${c.id}' beaten! reward: ${c.reward}`, 'w');
}

function checkAch() {
  for (const a of ACH) {
    if (!S.ach[a.id] && a.check()) {
      S.ach[a.id] = true;
      log(`achievement unlocked: "${a.name}" (+5% production)`, 'w');
      const skin = Object.keys(SKINS).find(k => SKINS[k].unlock === a.id);
      if (skin) log(`new process skin unlocked: ${skin}. see /skin`, 'w');
    }
  }
}

// ---------------------------------------------------------------- formatting
// L number -> text
function fmtL(l) {
  if (l === ZERO || isNaN(l)) return '0';
  if (l < 6) return Math.floor(Math.pow(10, l) * (1 + 1e-12)).toLocaleString('en-US');
  const eng = S.opts.notation === 'eng';
  let e = Math.floor(l);
  if (eng) e -= ((e % 3) + 3) % 3;
  let ms = Math.pow(10, l - e).toFixed(2);
  if (parseFloat(ms) >= (eng ? 1000 : 10)) {
    e += eng ? 3 : 1;
    ms = Math.pow(10, l - e).toFixed(2);
  }
  return `${ms}e${e >= 1e6 ? fmt(e) : e}`;
}
// plain number -> text
function fmt(n) {
  if (n === null || n === undefined || isNaN(n) || n <= 0) return '0';
  return fmtL(Math.log10(n));
}
// multiplier given as L -> "1.25" / "123.4" / "1.00e15"
function fmtM(l) {
  return l < 3 ? fmtD(Math.pow(10, l)) : fmtL(l);
}
function fmtD(n) {
  if (n < 10) return n.toFixed(2);
  if (n < 1000) return n.toFixed(1);
  return fmt(n);
}
function fmtTime(s) {
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)}s`;
  s = Math.floor(s);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m ${sec}s`;
}
function bar(frac, len) {
  const n = Math.max(0, Math.min(len, Math.floor(frac * len)));
  return '[' + '#'.repeat(n) + '.'.repeat(len - n) + ']';
}

// ---------------------------------------------------------------- terminal output
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MAX_LINES = 300;

function trimLog(box) { while (box.children.length > MAX_LINES) box.firstChild.remove(); }
function stickBottom(box) { box.scrollTop = box.scrollHeight; }

function appendLine(msg, cls, prefix) {
  const box = $('log');
  if (!box) return;
  const line = document.createElement('div');
  if (prefix) {
    const t = document.createElement('span');
    t.className = 't'; t.textContent = prefix;
    line.append(t);
  }
  const m = document.createElement('span');
  if (cls) m.className = cls;
  m.textContent = msg || ' '; // keep blank lines visible
  line.append(m);
  box.append(line);
  trimLog(box);
  stickBottom(box);
  noteTermOutput();
}
// timestamped system event
function log(msg, cls) {
  const d = new Date();
  const ts = [d.getHours(), d.getMinutes(), d.getSeconds()].map(x => String(x).padStart(2, '0')).join(':');
  appendLine(msg, cls, `[${ts}] `);
}
// plain command output (scripts run with QUIET on, so they don't flood the screen)
let QUIET = false;
const out = (msg, cls) => { if (!QUIET) appendLine(msg, cls || 'o'); };

// Live blocks: command output that keeps updating while it is on screen.
// Once newer output pushes it off the top it freezes for good: type the command again.
const live = new Set();
function liveBlock(fn) {
  if (QUIET) return;
  const box = $('log');
  const el = document.createElement('div');
  el.className = 'live';
  box.append(el);
  const b = { el, fn, html: '' };
  live.add(b);
  paintBlock(b);
  trimLog(box);
  stickBottom(box);
}
function paintBlock(b) {
  const html = b.fn().map(l => Array.isArray(l)
    ? `<div class="${l[1]}">${esc(l[0])}</div>`
    : `<div>${esc(l)}</div>`).join('');
  if (html !== b.html) { b.el.innerHTML = html; b.html = html; }
}
function updateLive() {
  if (!live.size) return;
  const top = $('log').getBoundingClientRect().top;
  for (const b of live) {
    if (!b.el.isConnected || b.el.getBoundingClientRect().bottom <= top + 1) {
      live.delete(b);
      b.el.classList.add('frozen');
      continue;
    }
    paintBlock(b);
  }
}

const SPIN = '|/-\\';
const spin = () => SPIN[Math.floor(Date.now() / 150) % SPIN.length];
const pad = (s, n) => String(s).padEnd(n);
function frame(title, rows, footer) {
  const head = `.-- ${title} `;
  return [
    [head + '-'.repeat(Math.max(2, 34 - head.length)) + ` [${spin()}]`, 'hd'],
    ...rows.map(r => Array.isArray(r) ? ['| ' + r[0], r[1]] : '| ' + r),
    [`'-- ${footer}`, 'dim'],
  ];
}

// ---------------------------------------------------------------- live views
function tierView(i) {
  return () => {
    const t = S.tiers[i];
    const c = tierCostL(i), n = 10 - (t.bought % 10);
    const rows = [
      `owned   ${pad(fmtL(t.amt), 11)} bought ${t.bought}`,
      `mult    ${pad('x' + fmtM(tierMultL(i)), 11)} ${bar((t.bought % 10) / 10, 10)} ${n} to x${perTen().toFixed(1)}`,
      `output  +${fmtL(outL(i))} ${i === 0 ? 'bytes' : pname(i - 1)}/s`,
      [`cost    ${pad(fmtL(c), 11)} ${n} for ${fmtL(c + Math.log10(n))}`, S.bytes >= c ? 'ok' : 'dim'],
    ];
    if (!tierUnlocked(i)) rows.push([i > 0 && S.tiers[i - 1].bought === 0 ? `locked until you own a ${pname(i - 1)}` : 'locked by the current challenge', 'w']);
    return frame(`0${i + 1} ${pname(i)} ${picon(i)}`, rows, `/buy ${NAMES[i].toLowerCase()} [n|max]`);
  };
}

function topView() {
  const rows = [[`${pad('PROC', 16)}${pad('OWNED', 11)}${pad('MULT', 10)}OUTPUT/s`, 'dim']];
  for (let i = 0; i < TIERS && tierUnlocked(i); i++) {
    rows.push(`${pad('0' + (i + 1) + ' ' + pname(i), 16)}${pad(fmtL(S.tiers[i].amt), 11)}` +
      `${pad('x' + fmtM(tierMultL(i)), 10)}+${fmtL(outL(i))}`);
  }
  rows.push([`clock x${fmtM(speedL())} · boosts x${fmtM(boostL())}`, 'dim']);
  if (S.stats.overflowed) rows.push([`soft cap past 1.79e308/s: ^${softcapExp().toFixed(2)}`, 'dim']);
  return frame('top', rows, '/<process> for details');
}

function clockView() {
  const c = clockCostL();
  return frame('CLOCK SPEED', [
    `level   ${S.clocks}   (x${clockBase().toFixed(3)} per level)`,
    `total   x${fmtM(speedL())} to every process`,
    clockUnlocked() ? [`next    ${fmtL(c)} bytes`, S.bytes >= c ? 'ok' : 'dim'] : [inChal('underclock') ? 'disabled by the current challenge' : `locked until you own a ${pname(1)}`, 'w'],
  ], '/clock buy | /clock max');
}

function rebootView() {
  const gain = rebootGain();
  const frac = Math.min(1, Math.max(0, S.bytes) / REBOOT_L);
  const rows = gain < 1
    ? [`${bar(frac, 20)} ${(frac * 100).toFixed(1)}%`, `need    ${fmtL(REBOOT_L)} bytes`, `have    ${fmtL(S.bytes)}`]
    : [[`READY   +${fmt(gain)} KRN`, 'ok'], `next kernel at ${fmtL(nextKernelAtL())} bytes`, `have    ${fmtL(S.bytes)}`];
  return frame('REBOOT', rows, gain < 1 ? 'wipes bytes, processes, clock' : 'type /reboot to do it');
}

function kernelView() {
  const rows = [
    `kernels ${pad(fmt(S.kernels), 11)} earned ${fmt(S.kernelsEarned)}`,
    `effect  production x${fmtM(kernelL())}`,
    `gain    x${fmtD(kGainMult())}${has('zlib') ? `  (compression lvl ${S.kGainLvl})` : ''}`,
    [`reboot  +${fmt(rebootGain())} KRN now`, rebootGain() >= 1 ? 'ok' : 'dim'],
  ];
  if (CMD_BY_NAME.format.when()) {
    const fg = formatGain();
    const frac = Math.min(1, Math.log10(Math.max(1, S.kernelsEarned)) / Math.log10(FORMAT_AT));
    rows.push(fg < 1 ? `format  ${bar(frac, 14)} ${(frac * 100).toFixed(1)}%` : [`format  READY: +${fmt(fg)} CORES`, 'ok']);
  }
  return frame('KERNEL', rows, '/modules · /install <name>');
}

function formatView() {
  const fg = formatGain();
  const frac = Math.min(1, Math.log10(Math.max(1, S.kernelsEarned)) / Math.log10(FORMAT_AT));
  const rows = fg < 1
    ? [`${bar(frac, 20)} ${(frac * 100).toFixed(1)}%`, `need    ${fmt(FORMAT_AT)} kernels earned`, `have    ${fmt(S.kernelsEarned)}`]
    : [[`READY   +${fmt(fg)} CORES`, 'ok'], `have    ${fmt(S.kernelsEarned)} kernels earned`];
  rows.push(`cores   ${fmt(S.cores)}  (production x${fmtM(coreL())})`);
  return frame('FORMAT', rows, fg < 1 ? 'wipes the whole kernel layer' : 'type /format to do it');
}

function statsView() {
  const s = S.stats;
  return frame('STATS', [
    `machine        ${S.machine}`,
    `played         ${fmtTime(s.played)}`,
    `this reboot    ${fmtTime(s.thisReboot)}`,
    `best bytes     ${fmtL(s.bestBytes)}`,
    `total bytes    ${fmtL(s.totalBytes)}`,
    `reboots        ${fmt(s.reboots)}   fastest ${s.fastestReboot === null ? '--' : fmtTime(s.fastestReboot)}`,
    `formats        ${fmt(s.formats)}`,
    `achievements   ${achCount()}/${ACH.length}  (x${fmtD(achMult())})`,
    `global mult    x${fmtM(globalL())}`,
  ], 'live while on screen');
}

// progress toward 1e1000 once past the door
function doorView() {
  const frac = Math.min(1, Math.max(0, S.bytes - OVERFLOW_L) / (GOAL_L - OVERFLOW_L));
  return frame('THE OTHER SIDE', [
    `${bar(frac, 20)} ${(frac * 100).toFixed(1)}%`,
    `bytes   ${fmtL(S.bytes)} / ${fmtL(GOAL_L)}`,
    `cap     ^${softcapExp().toFixed(2)} past 1.79e308/s`,
  ], '/patches · /patch <name>');
}

// ---------------------------------------------------------------- commands
// A command shows up in /help once `when()` is true. Most unlock through
// progress, or by installing a module / flashing firmware.
const findUpg = (list, q) => {
  const k = String(q || '').toLowerCase().replace(/[\s_]+/g, '-');
  return list.find(u => u.key === k || u.id.toLowerCase() === k);
};
function findTier(q) {
  if (!q) return -1;
  const n = parseInt(q, 10);
  if (String(n) === q && n >= 1 && n <= TIERS) return n - 1;
  const s = q.toLowerCase().replace(/-/g, ' ');
  const i = NAMES.findIndex(name => name.toLowerCase().startsWith(s));
  if (i >= 0) return i;
  // the current skin's (or custom) names work too
  for (let k = 0; k < TIERS; k++) if (pname(k).toLowerCase().startsWith(s)) return k;
  return -1;
}
// "/dyson-sphere" -> the tier command of that process, whatever the skin
function skinCommand(name) {
  for (let k = 0; k < TIERS; k++) {
    if (pname(k).toLowerCase().replace(/ /g, '-') === name) return CMD_BY_NAME[NAMES[k].toLowerCase()];
  }
  return null;
}
const AUTO_TARGETS = {
  t1:     { label: 'tiers 1-4',   owned: () => has('auto1') },
  t2:     { label: 'tiers 5-8',   owned: () => has('auto2') },
  clock:  { label: 'clock speed', owned: () => has('autoClock') },
  reboot: { label: 'reboot',      owned: () => hasC('autoReboot') },
};
const THEMES = ['green', 'amber', 'cyan', 'white'];

// ---------------------------------------------------------------- random events
// Every few minutes something happens. Each event has a response command that
// only exists while the event is active.
const rnd = n => Math.floor(Math.random() * n);
const EVENTS = [
  { id: 'packet', cmd: 'accept', secs: 15, weight: 3, when: () => true,
    start: () => {
      const amtL = Math.max(2, bpsL() + Math.log10(30 + Math.random() * 60)); // 30-90s of production
      return { amtL, text: `incoming packet from 10.0.${rnd(256)}.${rnd(256)}: ${fmtL(amtL)} bytes. type /accept within 15s` };
    },
    resolve: e => { addBytes(e.amtL); out(`packet accepted: +${fmtL(e.amtL)} bytes.`, 'ok'); },
    miss: 'packet dropped.' },
  { id: 'turbo', cmd: 'turbo', secs: 15, weight: 2, when: () => S.stats.highestTier >= 2,
    start: () => ({ text: 'thermal headroom detected. type /turbo within 15s for x5 production (60s)' }),
    short: 'thermal headroom: x5 production for 60s.',
    resolve: () => { S.buffs.turboUntil = S.stats.played + 60; out('TURBO engaged: x5 production for 60s.', 'ok'); },
    miss: 'thermal window closed.' },
  { id: 'orphan', cmd: 'recover', secs: 15, weight: 2, when: () => S.stats.reboots > 0,
    start: () => {
      const amt = Math.max(1, Math.floor(S.kernelsEarned * 0.02));
      return { amt, text: `orphaned kernel found in /tmp: ${fmt(amt)} KRN. type /recover within 15s` };
    },
    resolve: e => { S.kernels += e.amt; S.kernelsEarned += e.amt; out(`recovered ${fmt(e.amt)} kernel(s).`, 'ok'); },
    miss: 'the orphaned kernel was garbage-collected.' },
  { id: 'virus', cmd: 'scan', secs: 120, weight: 1, when: () => S.stats.highestTier >= 3,
    start: () => ({ text: 'VIRUS DETECTED: worm.exe is eating 2% of your bytes per second. type /scan' }),
    resolve: () => out('worm.exe quarantined. your bytes are safe.', 'ok'),
    miss: 'worm.exe burned itself out.' },
];
let ev = null;
let nextEventAt = 0;
function scheduleEvent() { nextEventAt = Date.now() + (90 + Math.random() * 150) * 1000; }
function eventTick() {
  const now = Date.now();
  if (ev && now >= ev.until) { log(ev.def.miss, 'dim'); ev = null; scheduleEvent(); return; }
  if (ev || now < nextEventAt) return;
  const pool = EVENTS.filter(e => e.when());
  let roll = Math.random() * pool.reduce((a, e) => a + e.weight, 0);
  const def = pool.find(e => (roll -= e.weight) < 0) || pool[0];
  const data = def.start();
  ev = { def, until: now + def.secs * 1000, ...data };
  log(data.text, 'w');
}
function resolveEvent() {
  const e = ev;
  ev = null;
  scheduleEvent();
  e.def.resolve(e);
}

// ---------------------------------------------------------------- file system
// The tree itself (FS) lives in filesystem.js.
const HOME = ['home', 'user'];
let cwd = [...HOME];
function displayPath(p) {
  const s = '/' + p.join('/');
  return s === '/home/user' || s.startsWith('/home/user/') ? '~' + s.slice(10) : s;
}
// in the graphical environment the terminal is a DOS window: INCR-7 C:HOMEUSER>
const promptText = () => (guiOn()
  ? `${S.machine.toUpperCase()} C:\\${cwd.join('\\').toUpperCase()}>`
  : `root@${S.machine}:${displayPath(cwd)}$`);
function setPrompt() { const el = document.querySelector('.prompt span'); if (el) el.textContent = promptText(); }
function resolvePath(str) {
  if (!str || str === '~') return [...HOME];
  const segs = str.startsWith('/') ? [] : str.startsWith('~') ? [...HOME] : [...cwd];
  for (const p of str.replace(/^~/, '').split('/')) {
    if (!p || p === '.') continue;
    if (p === '..') segs.pop(); else segs.push(p);
  }
  return segs;
}
const fsVisible = n => !n.when || n.when();
// walk the tree; returns { node } or { err }
function lookup(segs) {
  let node = FS;
  for (const seg of segs) {
    if (node.type !== 'dir') return { err: 'not a directory' };
    const lock = node.locked && node.locked();
    if (lock) return { err: lock };
    const child = node.children[seg];
    if (!child || !fsVisible(child)) return { err: 'no such file or directory' };
    node = child;
  }
  const lock = node.type === 'dir' && node.locked && node.locked();
  return lock ? { err: lock } : { node };
}
const fileText = n => (typeof n.text === 'function' ? n.text() : n.text);
const fsUnlocked = () => S.stats.highestTier >= 1;

function cmdLs(args) {
  const all = args.includes('-a');
  const path = args.find(a => !a.startsWith('-'));
  const { node, err } = lookup(resolvePath(path || '.'));
  if (err) return out(`ls: ${path || '.'}: ${err}`, 'w');
  if (node.type !== 'dir') return out(path);
  const names = Object.keys(node.children).sort()
    .filter(n => fsVisible(node.children[n]) && (all || !n.startsWith('.')))
    .map(n => n + (node.children[n].type === 'dir' ? '/' : node.children[n].run ? '*' : ''));
  out(names.length ? names.join('   ') : '(empty)');
}
function cmdCd([path]) {
  const segs = resolvePath(path);
  const { node, err } = lookup(segs);
  if (err) return out(`cd: ${path}: ${err}`, 'w');
  if (node.type !== 'dir') return out(`cd: ${path}: not a directory`, 'w');
  cwd = segs;
}
function cmdCat([path]) {
  if (!path) return out('usage: /cat <file>', 'w');
  const { node, err } = lookup(resolvePath(path));
  if (err) return out(`cat: ${path}: ${err}`, 'w');
  if (node.type === 'dir') return out(`cat: ${path}: is a directory`, 'w');
  for (const line of fileText(node).split('\n')) out(line);
}
function cmdRun([path, ...args]) {
  if (!path) return out('usage: /run <file> [args]  (or ./file)', 'w');
  const { node, err } = lookup(resolvePath(path));
  if (err) return out(`run: ${path}: ${err}`, 'w');
  if (node.type === 'dir' || !node.run) return out(`run: ${path}: permission denied (not executable)`, 'w');
  node.run(args);
}

// ---------------------------------------------------------------- challenges
// tier 1 is open once /challenge unlocks; tier 2 needs a FORMAT; the final one needs all others
function chalOpen(c) {
  if (c.tier === 2) return S.stats.formats > 0;
  if (c.tier === 3) return CHALLENGES.every(x => x.tier === 3 || chalDone(x.id));
  return true;
}
function cmdChallenge([sub, id]) {
  if (!sub) {
    out('challenges: restart your run with a handicap. reach the goal for a permanent reward.');
    for (const c of CHALLENGES) {
      if (!chalOpen(c)) continue;
      const mark = S.chal.active === c.id ? '[>]' : chalDone(c.id) ? '[x]' : '[ ]';
      out(`${mark} ${pad(c.id, 13)} goal ${pad(fmtL(c.goalL), 8)} ${c.desc}`, chalDone(c.id) ? 'dim' : c.tier === 3 ? 'w' : '');
      out(`    reward: ${c.reward}`, 'dim');
    }
    const hidden = CHALLENGES.filter(c => !chalOpen(c)).length;
    if (hidden) out(`  ...${hidden} more locked. ${S.stats.formats > 0 ? 'beat every other challenge.' : 'FORMAT to unlock them.'}`, 'dim');
    out('/challenge start <id> · /challenge exit', 'dim');
    return;
  }
  sub = sub.toLowerCase();
  if (sub === 'exit') {
    if (!S.chal.active) return out('no challenge running.', 'dim');
    out(`left challenge '${S.chal.active}'.`);
    S.chal.active = null;
    return;
  }
  if (sub !== 'start') return out('usage: /challenge [start <id>|exit]', 'w');
  const c = CHAL_BY_ID[String(id).toLowerCase()];
  if (!c || !chalOpen(c)) return out('usage: /challenge start <id>. see /challenge', 'w');
  if (chalDone(c.id)) return out(`${c.id} is already beaten.`, 'dim');
  if (S.chal.active) return out(`already in '${S.chal.active}'. /challenge exit first.`, 'w');
  askConfirm(`challenge ${c.id}`, 'this restarts your current run (no kernels).', () => {
    if (S.chal.active) return;
    S.chal.active = c.id;
    resetRun();
    log(`challenge '${c.id}' started: ${c.desc} goal: ${fmtL(c.goalL)} bytes.`, 'w');
  });
}

// ---------------------------------------------------------------- aliases
const MAX_ALIASES = 15;
function cmdAlias([name, ...rest]) {
  const names = Object.keys(S.aliases);
  if (!name) {
    if (!names.length) out('no aliases yet.', 'dim');
    for (const n of names) out(`  /${pad(n, 12)} = ${S.aliases[n]}`);
    out('/alias <name> <command>  ·  /alias rm <name>  ·  chain commands with ;', 'dim');
    return;
  }
  name = name.toLowerCase().replace(/^\//, '');
  if (name === 'rm') {
    const n = (rest[0] || '').toLowerCase().replace(/^\//, '');
    if (!S.aliases[n]) return out(`no alias named ${n}.`, 'w');
    delete S.aliases[n];
    return out(`alias /${n} removed.`);
  }
  if (!rest.length) return S.aliases[name] ? out(`/${name} = ${S.aliases[name]}`) : out(`no alias named ${name}.`, 'w');
  if (!/^[a-z0-9-]{1,12}$/.test(name)) return out('alias names: letters, digits and -, up to 12 characters.', 'w');
  if (CMD_BY_NAME[name]) return out(`/${name} is already a command.`, 'w');
  if (!S.aliases[name] && names.length >= MAX_ALIASES) return out(`alias limit reached (${MAX_ALIASES}).`, 'w');
  S.aliases[name] = rest.join(' ');
  out(`alias saved: /${name} = ${S.aliases[name]}`);
}

// ---------------------------------------------------------------- scripts
// commands a script is allowed to run
const SCRIPT_OK = new Set(['buy', 'max', 'clock', 'compress', 'install', 'flash', 'auto', 'reboot',
  ...NAMES.map(n => n.toLowerCase())]);
const MAX_SCRIPTS = 5;
const scriptLabel = sc => (sc.trigger === 'boot' ? 'on boot ' : pad(`every ${sc.secs}s`, 8));
function cmdScript([sub, ...rest]) {
  if (!sub) {
    if (!S.scripts.length) out('no scripts yet.', 'dim');
    S.scripts.forEach((sc, k) => out(`  ${k + 1}. ${scriptLabel(sc)}  ${sc.cmd}`));
    out('/script boot <cmds>          run after every reboot', 'dim');
    out('/script every <secs> <cmds>  run on a timer (5s minimum)', 'dim');
    out('/script rm <n>  ·  /script clear  ·  chain commands with ;', 'dim');
    out('allowed: buy, max, clock buy|max, <process> n|max, compress, install, flash, auto, reboot', 'dim');
    return;
  }
  sub = sub.toLowerCase();
  if (sub === 'rm') {
    const k = parseInt(rest[0], 10) - 1;
    if (!S.scripts[k]) return out('usage: /script rm <number>', 'w');
    S.scripts.splice(k, 1);
    return out('script removed.');
  }
  if (sub === 'clear') { S.scripts = []; return out('all scripts removed.'); }
  if (sub !== 'boot' && sub !== 'every') return out('usage: /script [boot|every <secs>|rm <n>|clear] <cmds>', 'w');
  if (S.scripts.length >= MAX_SCRIPTS) return out(`script limit reached (${MAX_SCRIPTS}). /script rm <n>`, 'w');
  let secs = 0;
  if (sub === 'every') {
    secs = parseFloat(rest.shift());
    if (!(secs >= 5)) return out('usage: /script every <secs> <cmds>  (secs >= 5)', 'w');
  }
  const cmd = rest.join(' ').trim();
  if (!cmd) return out('a script needs commands, e.g. /script boot daemon max; clock max', 'w');
  S.scripts.push({ trigger: sub, secs, cmd, acc: 0 });
  out(`script ${S.scripts.length} saved: ${scriptLabel(S.scripts[S.scripts.length - 1])} ${cmd}`);
}
function runScripts(trigger, dt) {
  if (!has('bash') || inChal('manual') || !S.scripts.length) return;
  for (const sc of S.scripts) {
    if (sc.trigger !== trigger) continue;
    if (trigger === 'every') {
      sc.acc = (sc.acc || 0) + dt;
      if (sc.acc < sc.secs) continue;
      sc.acc = 0;
    }
    execLine(sc.cmd, true);
  }
}

// ---------------------------------------------------------------- neofetch
function cmdNeofetch() {
  const art = [
    '   _______',
    '  | .---. |',
    '  | |>_ | |',
    "  | '---' |",
    '  |_______|',
    '  /  ===  \\',
    ' /_________\\',
  ];
  const info = [
    `${chalDone('kernel-panic') ? 'ROOT' : 'root'}@${S.machine}`,
    '-----------',
    `OS        INCR.OS ${VERSION}`,
    `Uptime    ${fmtTime(S.stats.played)}`,
    `Bytes     ${fmtL(S.bytes)}`,
    `Procs     ${S.stats.highestTier}/${TIERS} discovered`,
    `Clock     lvl ${S.clocks} (x${fmtM(speedL())})`,
    `Kernels   ${fmt(S.kernels)}`,
    `Cores     ${fmt(S.cores)}`,
    `Achieve.  ${achCount()}/${ACH.length}`,
    `Skin      ${S.skin}`,
    `Theme     ${S.opts.theme}`,
  ];
  if ($('log').clientWidth < 600) {
    art.forEach(l => out(l));
    info.forEach(l => out(l));
    return;
  }
  for (let k = 0; k < Math.max(art.length, info.length); k++) out(pad(art[k] || '', 16) + (info[k] || ''));
}

// ---------------------------------------------------------------- past the door: patches
function onOverflow() {
  log('*** SYSTEM OVERFLOW ***', 'w');
  out('1.79e308 bytes. every addressable byte is full.', 'w');
  out('...but the counter keeps going. something opened.', 'w');
  out('new commands: /patches, /door. production past 1.79e308/s is soft capped for now.', 'dim');
}
function showEnding() {
  S.won = true;
  out('');
  out('+------------------------------------------+', 'w');
  out('|            THE OTHER SIDE                |', 'w');
  out('+------------------------------------------+', 'w');
  out(`1e1000 bytes in ${fmtTime(S.stats.played)}. the door is open.`);
  out('behind it: another prompt, blinking. waiting for you.', 'dim');
  out(`reboots ${fmt(S.stats.reboots)} · formats ${fmt(S.stats.formats)} · achievements ${achCount()}/${ACH.length}`, 'dim');
  out(`that's the end of ${VERSION}. thanks for playing. the numbers will keep going if you do.`, 'dim');
}
function cmdPatches() {
  out(`patches: bought with bytes, never reset. soft cap past 1.79e308/s: ^${softcapExp().toFixed(2)}`);
  for (const u of PATCHES) {
    const mark = hasP(u.id) ? '[x]' : S.bytes >= u.costL ? '[ ]' : '[-]';
    out(`${mark} ${pad(u.key, 13)} ${pad(fmtL(u.costL) + ' B', 12)} ${u.desc}`, hasP(u.id) ? 'dim' : u.id === 'door' ? 'w' : '');
  }
  out('apply with /patch <name> · /door shows your progress', 'dim');
}
function cmdPatch([key]) {
  if (!key) return out('usage: /patch <name>. see /patches', 'w');
  const u = findUpg(PATCHES, key);
  if (!u) return out(`no such patch: ${key}. see /patches`, 'w');
  if (hasP(u.id)) return out(`${u.key} is already applied.`, 'dim');
  if (S.bytes < u.costL) return out(`not enough bytes: ${u.key} costs ${fmtL(u.costL)}, you have ${fmtL(S.bytes)}.`, 'w');
  buyP(u.id);
}

// ---------------------------------------------------------------- machines (ssh)
function snapshotMachine() {
  const o = { visited: true, lastSeen: Date.now(), thisReboot: S.stats.thisReboot, thisFormat: S.stats.thisFormat };
  for (const k of MACHINE_KEYS) o[k] = structuredClone(S[k]);
  return o;
}
function loadMachine(o) {
  for (const k of MACHINE_KEYS) S[k] = o[k];
  S.stats.thisReboot = o.thisReboot || 0;
  S.stats.thisFormat = o.thisFormat || 0;
}
const machineOpen = id => !!MACHINES[id] && MACHINES[id].unlock();
function cmdSsh([id]) {
  if (!id) {
    out('machines:');
    for (const m of Object.keys(MACHINES)) {
      if (!machineOpen(m)) { out(`  ${pad(m, 8)} locked`, 'dim'); continue; }
      const here = m === S.machine, snap = S.machines[m];
      const bytes = here ? S.bytes : snap ? snap.bytes : 1;
      const krn = here ? S.kernels : snap ? snap.kernels : 0;
      out(`${here ? '>' : ' '} ${pad(m, 8)} ${pad(fmtL(bytes) + ' B', 13)} ${pad(fmt(krn) + ' KRN', 13)} ${MACHINES[m].trait}`, here ? 'ok' : '');
    }
    out('/ssh <machine> to connect · /scp <n|all> <machine> sends kernels (10% lost)', 'dim');
    out('machines you leave keep running (up to 12h).', 'dim');
    return;
  }
  id = id.toLowerCase();
  if (!machineOpen(id)) return out(`ssh: ${id}: no route to host`, 'w');
  if (id === S.machine) return out(`already on ${id}.`, 'dim');
  if (S.chal.active) return out('finish the challenge (or /challenge exit) before leaving this machine.', 'w');
  // live views on screen belong to the machine we're leaving: freeze them
  for (const b of live) b.el.classList.add('frozen');
  live.clear();
  S.machines[S.machine] = snapshotMachine();
  const target = S.machines[id] || freshMachine();
  delete S.machines[id];
  loadMachine(target);
  S.machine = id;
  setPrompt();
  log(target.visited ? `connected to ${id}.` : `connected to ${id} for the first time. fresh machine provisioned.`, 'ok');
  out(`trait: ${MACHINES[id].trait}`, 'dim');
  const away = (Date.now() - target.lastSeen) / 1000;
  if (target.visited && away > 10) catchUp(away, `${id} while you were away`, true);
}
function cmdScp([amt, id]) {
  if (!amt || !id) return out('usage: /scp <n|all> <machine>', 'w');
  id = id.toLowerCase();
  if (!machineOpen(id)) return out(`scp: ${id}: no route to host`, 'w');
  if (id === S.machine) return out('scp: that is this machine.', 'w');
  const n = amt === 'all' ? Math.floor(S.kernels) : Math.floor(Number(amt));
  if (!(n >= 1) || n > S.kernels) return out(`scp: you have ${fmt(S.kernels)} kernels.`, 'w');
  const target = S.machines[id] || (S.machines[id] = freshMachine());
  const got = Math.floor(n * 0.9);
  S.kernels -= n;
  target.kernels = clampN(target.kernels + got);
  out(`sent ${fmt(n)} kernels to ${id}: ${fmt(got)} arrived (10% lost in transit).`);
}

// ---------------------------------------------------------------- offline / catch-up report
const progressSnap = () => ({
  bytes: S.bytes, kernels: S.kernels, reboots: S.stats.reboots,
  ach: achCount(), tier: S.stats.highestTier,
});
function reportBox(title, sec, a, b) {
  const narrow = $('log').clientWidth < 600; // phones: keep it from wrapping
  const W = narrow ? 36 : 46;
  const lbl = s => pad(s, narrow ? 9 : 14);
  const rule = () => out('+' + '-'.repeat(W - 2) + '+', 'dim');
  const line = (s, cls) => out('| ' + pad(s, W - 4) + ' |', cls);
  rule();
  line(narrow ? `${title.toLowerCase()} ${fmtTime(sec)}` : `${title} (${fmtTime(sec)})`, 'w');
  rule();
  line(`${lbl('bytes')}${fmtL(a.bytes)} -> ${fmtL(b.bytes)}`);
  if (b.reboots > a.reboots) line(`${lbl('reboots')}+${fmt(b.reboots - a.reboots)}`);
  if (b.kernels !== a.kernels) line(`${lbl('kernels')}${fmt(a.kernels)} -> ${fmt(b.kernels)}`);
  if (b.tier > a.tier) line(`${lbl(narrow ? 'procs' : 'new processes')}+${b.tier - a.tier}`);
  if (b.ach > a.ach) line(`${lbl(narrow ? 'achiev.' : 'achievements')}+${b.ach - a.ach}`);
  if (sec > 43200) line('(progress is capped at 12h)', 'dim');
  rule();
}
// simulate `sec` seconds and print what happened; bg = an inactive machine catching up
function catchUp(sec, title, bg) {
  const before = progressSnap();
  bgSim = !!bg;
  try { simulate(Math.min(sec, 43200)); } finally { bgSim = false; }
  reportBox(title, sec, before, progressSnap());
}

// ---------------------------------------------------------------- skins
const skinOpen = k => !!SKINS[k] && (!SKINS[k].unlock || !!S.ach[SKINS[k].unlock]);
const skinsUnlocked = () => Object.keys(SKINS).some(k => k !== 'default' && skinOpen(k));
function cmdSkin([name]) {
  if (!name) {
    out('process skins:');
    for (const k of Object.keys(SKINS)) {
      const open = skinOpen(k);
      const a = ACH.find(x => x.id === SKINS[k].unlock);
      const mark = S.skin === k ? '[x]' : open ? '[ ]' : '[-]';
      out(`${mark} ${pad(k, 9)} ${open ? SKINS[k].names.slice(0, 4).join(', ') + '...' : `locked: achievement "${a.name}"`}`, open ? '' : 'dim');
    }
    out('/skin <name> to apply · /rename <process> <name> for your own', 'dim');
    return;
  }
  name = name.toLowerCase();
  if (!SKINS[name]) return out(`no skin named ${name}. see /skin`, 'w');
  if (!skinOpen(name)) return out(`${name} is locked. see /skin`, 'w');
  S.skin = name;
  out(`skin set to ${name}: ${SKINS[name].names.join(', ')}`);
  out('the usual commands still work (/daemon...), and so do the new names.', 'dim');
}
function cmdRename([who, ...rest]) {
  const i = findTier(who);
  if (i < 0) return out('usage: /rename <process> <new name>  ·  /rename <process> to reset', 'w');
  const name = rest.join(' ').toUpperCase().trim();
  if (!name) { delete S.rename[i]; return out(`process ${i + 1} is back to ${pname(i)}.`); }
  if (!/^[A-Z0-9 _-]{1,14}$/.test(name)) return out('names: letters, digits, spaces, - and _, up to 14 characters.', 'w');
  S.rename[i] = name;
  out(`process ${i + 1} is now ${name}.`);
}

// ---------------------------------------------------------------- tutorial
const TUTORIAL = [
  { text: () => `look at your first process: /${NAMES[0].toLowerCase()}`, done: () => S.tut.f.daemon },
  { text: () => `buy one: /buy ${NAMES[0].toLowerCase()}`, done: () => S.tiers[0].bought >= 1 },
  { text: () => `it makes bytes. own 10 for a x2 bonus: /buy ${NAMES[0].toLowerCase()} max (as bytes come in)`, done: () => S.tiers[0].bought >= 10 },
  { text: () => `a new process appeared. buy one: /buy ${NAMES[1].toLowerCase()}`, done: () => S.tiers[1].bought >= 1 },
  { text: () => `it makes more ${pname(0)}s. now speed everything up: /clock buy`, done: () => S.clocks >= 1 },
  { text: () => 'commands unlock as you play. list them: /help', done: () => S.tut.f.help },
  { text: () => 'this machine has files. read one: /cat readme.txt', done: () => S.tut.f.cat },
];
function checkTutorial() {
  if (S.tut.done) return;
  while (S.tut.step < TUTORIAL.length && TUTORIAL[S.tut.step].done()) {
    S.tut.step++;
    log(`tutorial ${S.tut.step}/${TUTORIAL.length} done.`, 'ok');
  }
  if (S.tut.step >= TUTORIAL.length) {
    S.tut.done = true;
    log(`tutorial complete! next goal: ${fmtL(REBOOT_L)} bytes, then /reboot. (/tutorial replays it)`, 'w');
  }
}
function cmdTutorial([sub]) {
  if ((sub || '').toLowerCase() === 'skip') {
    if (S.tut.done) return out('the tutorial is not running. /tutorial starts it.', 'dim');
    S.tut.done = true;
    return out('tutorial skipped. /tutorial starts it again.');
  }
  if (!S.tut.done) return out(`tutorial ${S.tut.step + 1}/${TUTORIAL.length}: ${TUTORIAL[S.tut.step].text()}`);
  S.tut = { step: 0, done: false, f: {} };
  out('tutorial restarted. follow the line above the prompt.');
}

const COMMANDS = [
  { name: 'help', args: '[command]', desc: 'list commands, or explain one', when: () => true, run: cmdHelp },
  ...NAMES.map((n, i) => ({
    name: n.toLowerCase(), args: '[n|max]', desc: `watch ${n} live (or buy n)`,
    when: () => S.stats.highestTier >= i,
    run: ([a]) => (a ? cmdBuy([String(i + 1), a]) : liveBlock(tierView(i))),
  })),
  { name: 'buy', args: '<name|1-8> [n|max]', desc: 'buy processes', when: () => true, run: cmdBuy,
    more: 'examples: /buy daemon   /buy daemon 5   /buy 2 max' },
  { name: 'max', desc: 'buy every process and clock level you can afford', when: () => true,
    run: () => { maxAll(); out('bought everything affordable.'); } },
  { name: 'clear', desc: 'clear the screen', when: () => true, run: () => { $('log').innerHTML = ''; live.clear(); } },
  { name: 'sys', args: '[setting]', desc: 'settings, save, export/import, reset', when: () => true, run: cmdSys },
  { name: 'clock', args: '[buy|max]', desc: 'clock speed: speeds up ALL processes',
    when: () => S.stats.highestTier >= 2 || S.clocks > 0, run: cmdClock },
  { name: 'stats', desc: 'live statistics', when: () => S.stats.highestTier >= 2, run: () => liveBlock(statsView) },
  { name: 'ach', args: '[list]', desc: 'achievements menu (/ach list for plain text)', when: () => achCount() > 0,
    run: ([sub]) => (sub === 'list' || QUIET ? cmdAch() : openAchMenu()) },
  { name: 'upgrade', desc: 'install INCR.OS 2.0 (the graphical environment)',
    when: () => S.stats.reboots > 0 && !S.gui.win1, run: startUpgrade },
  { name: 'tutorial', args: '[skip]', desc: 'show, skip or replay the tutorial', when: () => true, run: cmdTutorial },
  { name: 'reboot', desc: `reset your run for KERNELS at ${fmtL(REBOOT_L)} bytes`,
    when: () => S.stats.bestBytes >= 9 || S.stats.reboots > 0, run: cmdReboot },
  { name: 'kernel', desc: 'live kernel status', when: () => S.stats.reboots > 0, run: () => liveBlock(kernelView) },
  { name: 'modules', desc: 'list kernel modules (upgrades)', when: () => S.stats.reboots > 0, run: cmdModules },
  { name: 'install', args: '<module>', desc: 'install a kernel module', when: () => S.stats.reboots > 0, run: cmdInstall,
    more: 'example: /install warm-cache   (Tab autocompletes module names)' },
  { name: 'top', desc: 'live table of every process', when: () => has('procfs'), run: () => liveBlock(topView) },
  { name: 'auto', args: '[target] [on|off]', desc: 'list or toggle autobuyers',
    when: () => Object.values(AUTO_TARGETS).some(t => t.owned()), run: cmdAuto },
  { name: 'compress', desc: 'double kernel gain (repeatable)', when: () => has('zlib'), run: cmdCompress },
  { name: 'uptime', desc: 'show the UPTIME bonus', when: () => has('time'), run: cmdUptime },
  { name: 'format', desc: `wipe the kernel layer for CORES at ${fmt(FORMAT_AT)} kernels`,
    when: () => S.kernelsEarned >= FORMAT_AT / 100 || S.stats.formats > 0, run: cmdFormat },
  { name: 'firmware', desc: 'list core firmware (upgrades)', when: () => S.stats.formats > 0, run: cmdFirmware },
  { name: 'flash', args: '<firmware>', desc: 'flash core firmware', when: () => S.stats.formats > 0, run: cmdFlash },
  { name: 'watchdog', args: '[kernels]', desc: 'auto-reboot once a reboot gives this many kernels',
    when: () => hasC('autoReboot'), run: cmdWatchdog },
  { name: 'ls', args: '[-a] [dir]', desc: 'list files', when: fsUnlocked, run: cmdLs },
  { name: 'cd', args: '<dir>', desc: 'change directory', when: fsUnlocked, run: cmdCd },
  { name: 'cat', args: '<file>', desc: 'read a file', when: fsUnlocked, run: cmdCat },
  { name: 'run', args: '<file> [args]', desc: 'run a program (or ./file)', when: () => S.stats.highestTier >= 2, run: cmdRun },
  { name: 'neofetch', desc: 'system summary', when: () => S.stats.highestTier >= 2, run: cmdNeofetch },
  { name: 'challenge', args: '[start <id>|exit]', desc: 'restart with a handicap for a permanent reward',
    when: () => S.stats.reboots >= 3 || !!S.chal.active || Object.keys(S.chal.done).length > 0, run: cmdChallenge },
  { name: 'alias', args: '[name] [command]', desc: 'make your own shortcut commands', when: () => has('alias'), run: cmdAlias,
    more: 'examples: /alias d daemon max  (then type /d)   /alias go max; clock max  (; chains commands)' },
  { name: 'script', args: '[boot|every <s>] [cmds]', desc: 'run commands automatically', when: () => has('bash'), run: cmdScript,
    more: 'examples: /script boot daemon max; thread max   /script every 10 max' },
  { name: 'skin', args: '[name]', desc: 'change how your processes look', when: skinsUnlocked, run: cmdSkin },
  { name: 'rename', args: '<process> [name]', desc: 'give a process your own name', when: skinsUnlocked, run: cmdRename },
  { name: 'ssh', args: '[machine]', desc: 'list machines, or connect to one', when: () => S.stats.formats > 0, run: cmdSsh },
  { name: 'scp', args: '<n|all> <machine>', desc: 'send kernels to another machine', when: () => S.stats.formats > 0, run: cmdScp },
  { name: 'patches', desc: 'list patches (upgrades past the door)', when: () => S.stats.overflowed, run: cmdPatches },
  { name: 'patch', args: '<name>', desc: 'apply a patch, paid in bytes', when: () => S.stats.overflowed, run: cmdPatch },
  { name: 'door', desc: 'live progress toward 1e1000 bytes', when: () => S.stats.overflowed, run: () => liveBlock(doorView) },
  // answers to a pending question (/reboot, /format...): only exist while it waits
  { name: 'yes', temp: true, desc: 'confirm', when: () => !!pending, run: () => answer(true) },
  { name: 'no', temp: true, desc: 'cancel', when: () => !!pending, run: () => answer(false) },
  // event responses: only exist while their event is active
  ...EVENTS.map(e => ({ name: e.cmd, temp: true, desc: 'respond to the current event',
    when: () => !!ev && ev.def === e, run: resolveEvent })),
];
const CMD_BY_NAME = Object.fromEntries(COMMANDS.map(c => [c.name, c]));
const unlockedCmds = () => COMMANDS.filter(c => c.when());

function checkCommands(silent) {
  for (const c of COMMANDS) {
    if (c.temp || S.cmds[c.name] || !c.when()) continue;
    S.cmds[c.name] = true;
    if (!silent) log(`new command unlocked: /${c.name}`, 'w');
  }
}

const cmdHistory = [];
let histPos = 0;
function runCommand(line) {
  const raw = line.trim();
  if (!raw) return;
  appendLine(raw, 'cmdline', promptText() + ' ');
  if (cmdHistory[cmdHistory.length - 1] !== raw) cmdHistory.push(raw);
  histPos = cmdHistory.length;
  execLine(raw, false);
  checkCommands(false);
  setPrompt();
}

// Run a line of ';'-separated commands. /alias and /script take the rest of
// the line as-is, so they can store chains.
const RAW_REST = new Set(['alias', 'script']);
function execLine(text, quiet, depth = 0) {
  let rest = text;
  while (rest.trim()) {
    const name = rest.match(/^\s*\/?(\S+)/)[1].toLowerCase();
    let part;
    if (RAW_REST.has(name)) { part = rest; rest = ''; }
    else {
      const k = rest.indexOf(';');
      part = k < 0 ? rest : rest.slice(0, k);
      rest = k < 0 ? '' : rest.slice(k + 1);
    }
    execOne(part, quiet, depth);
  }
}
function execOne(text, quiet, depth) {
  let t = text.trim();
  if (!t) return;
  if (t.startsWith('./')) t = 'run ' + t.slice(2);
  const args = t.replace(/^\//, '').split(/\s+/);
  const name = args.shift().toLowerCase();
  const cmd = CMD_BY_NAME[name] || skinCommand(name);
  const real = cmd && cmd.when();
  if (!real && has('alias') && S.aliases[name] && depth < 3) {
    execLine(S.aliases[name] + (args.length ? ' ' + args.join(' ') : ''), quiet, depth + 1);
    return;
  }
  if (!real) { if (!quiet) out(`command not found: ${name}. type /help`, 'w'); return; }
  if (quiet && !SCRIPT_OK.has(cmd.name)) return;
  if (!quiet) S.tut.f[cmd.name] = true; // the tutorial watches what you type
  const prev = QUIET;
  QUIET = quiet;
  try { cmd.run(args); } finally { QUIET = prev; }
}

function cmdHelp([name]) {
  if (name) {
    const c = CMD_BY_NAME[name.replace(/^\//, '').toLowerCase()];
    if (!c || !c.when()) return out(`no help for '${name}': unknown or locked command.`, 'w');
    out(`/${c.name} ${c.args || ''}`);
    out(`  ${c.desc}`);
    if (c.more) out(`  ${c.more}`);
    return;
  }
  const list = unlockedCmds();
  out('available commands:');
  const narrow = $('log').clientWidth < 600;
  if (ev) out(`  active event: /${ev.def.cmd}`, 'w');
  if (pending) out(`  waiting for an answer: /yes or /no`, 'w');
  for (const c of list) {
    if (c.temp) continue;
    const usage = '/' + c.name + (c.args ? ' ' + c.args : '');
    if (narrow) { out('  ' + usage); out('      ' + c.desc, 'dim'); }
    else out(`  ${pad(usage, 26)} ${c.desc}`);
  }
  const locked = COMMANDS.filter(c => !c.temp && !c.when()).length;
  if (locked > 0) out(`  ...${locked} more locked. keep progressing.`, 'dim');
  out('Tab autocompletes · Up/Down history · live views freeze once they scroll away', 'dim');
}

function cmdBuy([what, amt]) {
  const i = findTier(what);
  if (i < 0) return out('usage: /buy <name|1-8> [n|max]', 'w');
  if (!tierUnlocked(i)) {
    return out(i > 0 && S.tiers[i - 1].bought === 0 ? `${pname(i)} is locked: buy a ${pname(i - 1)} first.` : `${pname(i)} is disabled by the current challenge.`, 'w');
  }
  const before = S.tiers[i].bought;
  if (amt === 'max') buyMax(i);
  else {
    const n = amt === undefined ? 1 : parseInt(amt, 10);
    if (!(n >= 1)) return out('amount must be a number or "max".', 'w');
    for (let k = 0; k < Math.min(n, 1000) && buyOne(i); k++);
  }
  const got = S.tiers[i].bought - before;
  if (got === 0) out(`not enough bytes: 1 ${pname(i)} costs ${fmtL(tierCostL(i))}.`, 'w');
  else out(`bought ${got} ${pname(i)} (owned: ${S.tiers[i].bought}).`);
}

function cmdClock([a]) {
  if (!a) return liveBlock(clockView);
  if (a !== 'buy' && a !== 'max') return out('usage: /clock [buy|max]', 'w');
  if (!clockUnlocked()) return out(inChal('underclock') ? 'clock speed is disabled by the current challenge.' : `clock speed is locked until you own a ${pname(1)}.`, 'w');
  const before = S.clocks;
  if (a === 'max') buyClockMax(); else buyClock();
  if (S.clocks === before) out(`not enough bytes: next level costs ${fmtL(clockCostL())}.`, 'w');
  else out(`clock speed level ${S.clocks} (x${fmtM(speedL())}). next: ${fmtL(clockCostL())}.`);
}

function cmdAch() {
  out(`achievements ${achCount()}/${ACH.length}  (each +5% production)`);
  for (const a of ACH) {
    if (S.ach[a.id]) out(`[x] ${pad(a.name, 18)} ${a.desc}`);
    else out(`[ ] ${pad('???', 18)} ${a.desc}`, 'dim');
  }
}

// ---------------------------------------------------------------- achievements menu
// /ach opens an interactive panel over the terminal: arrow keys (or the mouse)
// move through the grid, Tab switches filter, Esc closes.
// progress toward locked achievements, 0..1
const ACH_PROGRESS = {
  a4: () => S.clocks / 10,
  a5: () => S.bytes / 9,
  a7: () => S.stats.reboots / 10,
  a9: () => S.bytes / 100,
  a10: () => Math.log10(1 + S.kernelsEarned) / 3,
  a11: () => Math.log10(1 + S.kernelsEarned) / Math.log10(FORMAT_AT),
  a12: () => S.bytes / 200,
  a13: () => S.bytes / OVERFLOW_L,
  a19: () => S.bytes / 500,
  a20: () => CHALLENGES.filter(c => c.tier < 3 && chalDone(c.id)).length / CHALLENGES.filter(c => c.tier < 3).length,
  a21: () => S.bytes / GOAL_L,
};
const ACH_FILTERS = ['all', 'unlocked', 'locked'];
let achMenu = null; // { filter, sel, count } while open

function achShown() {
  const f = achMenu.filter;
  return ACH.filter(a => f === 'all' || (f === 'unlocked') === !!S.ach[a.id]);
}
function openAchMenu() {
  achMenu = { filter: 'all', sel: 0, count: -1 };
  $('achMenu').classList.remove('hidden');
  renderAchMenu();
  $('achMenu').focus();
}
function closeAchMenu() {
  if (!achMenu) return;
  achMenu = null;
  $('achMenu').classList.add('hidden');
  $('cmd').focus();
}
function renderAchMenu() {
  const list = achShown();
  achMenu.sel = Math.max(0, Math.min(achMenu.sel, list.length - 1));
  achMenu.count = achCount();
  $('amHead').textContent = `ACHIEVEMENTS ${achCount()}/${ACH.length}  ${bar(achCount() / ACH.length, 20)}  production x${fmtD(achMult())}`;
  for (const b of document.querySelectorAll('[data-amf]')) b.classList.toggle('on', b.dataset.amf === achMenu.filter);
  $('amGrid').innerHTML = list.length
    ? list.map((a, k) => `<button type="button" class="am-cell${S.ach[a.id] ? ' got' : ''}${k === achMenu.sel ? ' sel' : ''}" data-ami="${k}">` +
        `${S.ach[a.id] ? '[x]' : '[ ]'} ${esc(a.name)}</button>`).join('')
    : '<p class="dim">nothing here yet.</p>';
  renderAchDetail();
}
function renderAchDetail() {
  const a = achShown()[achMenu.sel];
  if (!a) { $('amDetail').innerHTML = ''; return; }
  const got = !!S.ach[a.id];
  const skin = Object.keys(SKINS).find(k => SKINS[k].unlock === a.id);
  const rows = [
    `<p>${esc(a.name)}  <span class="${got ? '' : 'dim'}">${got ? '[UNLOCKED]' : '[LOCKED]'}</span></p>`,
    `<p class="dim">${esc(a.desc)}</p>`,
    `<p class="dim">reward: +5% production${skin ? ` · unlocks the "${skin}" skin` : ''}</p>`,
  ];
  if (!got && ACH_PROGRESS[a.id]) {
    const frac = Math.max(0, Math.min(1, ACH_PROGRESS[a.id]()));
    rows.push(`<p>${bar(frac, 24)} ${(frac * 100).toFixed(1)}%</p>`);
  }
  $('amDetail').innerHTML = rows.join('');
}
function selectAch(k) {
  const cells = document.querySelectorAll('.am-cell');
  if (!cells.length) return;
  achMenu.sel = Math.max(0, Math.min(k, cells.length - 1));
  cells.forEach((c, i) => c.classList.toggle('sel', i === achMenu.sel));
  cells[achMenu.sel].scrollIntoView({ block: 'nearest' });
  renderAchDetail();
}
function wireAchMenu() {
  const menu = $('achMenu');
  menu.addEventListener('keydown', e => {
    if (!achMenu) return;
    const grid = $('amGrid');
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length || 1;
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols };
    if (e.key in moves) { e.preventDefault(); selectAch(achMenu.sel + moves[e.key]); }
    else if (e.key === 'Home') { e.preventDefault(); selectAch(0); }
    else if (e.key === 'End') { e.preventDefault(); selectAch(Infinity); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const i = ACH_FILTERS.indexOf(achMenu.filter);
      achMenu.filter = ACH_FILTERS[(i + (e.shiftKey ? ACH_FILTERS.length - 1 : 1)) % ACH_FILTERS.length];
      achMenu.sel = 0;
      renderAchMenu();
    } else if (e.key === 'Escape' || e.key === 'q') { e.preventDefault(); closeAchMenu(); }
    e.stopPropagation(); // keep game hotkeys (M, C, 1-8) out of the menu
  });
  menu.addEventListener('click', e => {
    const cell = e.target.closest('[data-ami]');
    const filter = e.target.closest('[data-amf]');
    if (cell) selectAch(+cell.dataset.ami);
    else if (filter) { achMenu.filter = filter.dataset.amf; achMenu.sel = 0; renderAchMenu(); }
    else if (e.target.closest('#amClose')) { e.stopPropagation(); return closeAchMenu(); }
    menu.focus();
    e.stopPropagation(); // the terminal would grab focus for the prompt
  });
  menu.addEventListener('mouseover', e => {
    const cell = e.target.closest('[data-ami]');
    if (cell && +cell.dataset.ami !== achMenu.sel) selectAch(+cell.dataset.ami);
  });
}

function cmdReboot([sure]) {
  const gain = rebootGain();
  if (gain < 1) return liveBlock(rebootView);
  const go = () => {
    if (!doReboot(QUIET)) return out('nothing to reboot for anymore.', 'dim'); // scripts stay quiet
    if (S.stats.reboots === 1) out('kernels boost production forever. try /modules.', 'ok');
  };
  // scripts and "/reboot yes" skip the question
  if (QUIET || sure === 'yes' || sure === '-y') return go();
  askConfirm('reboot', `this wipes your bytes, processes and clock for +${fmt(gain)} kernel(s).`, go);
}

function listUpgrades(list, owned, unit, have) {
  for (const u of list) {
    const mark = owned(u.id) ? '[x]' : (have >= u.cost ? '[ ]' : '[-]');
    out(`${mark} ${pad(u.key, 18)} ${pad(fmt(u.cost) + ' ' + unit, 10)} ${u.desc}`, owned(u.id) ? 'dim' : '');
  }
}
function cmdModules() {
  out(`kernel modules (you have ${fmt(S.kernels)} KRN)  [x] installed [ ] affordable [-] too expensive`);
  listUpgrades(K_UPGRADES, has, 'KRN', S.kernels);
  out('install with /install <name>', 'dim');
}
function cmdInstall([key]) {
  if (!key) return out('usage: /install <module>. see /modules', 'w');
  const u = findUpg(K_UPGRADES, key);
  if (!u) return out(`no such module: ${key}. see /modules`, 'w');
  if (has(u.id)) return out(`${u.key} is already installed.`, 'dim');
  if (S.kernels < u.cost) return out(`not enough kernels: ${u.key} costs ${fmt(u.cost)}, you have ${fmt(S.kernels)}.`, 'w');
  buyK(u.id);
}
function cmdFirmware() {
  out(`core firmware (you have ${fmt(S.cores)} CORES)  [x] flashed [ ] affordable [-] too expensive`);
  listUpgrades(C_UPGRADES, hasC, 'CORE', S.cores);
  out('flash with /flash <name>', 'dim');
}
function cmdFlash([key]) {
  if (!key) return out('usage: /flash <firmware>. see /firmware', 'w');
  const u = findUpg(C_UPGRADES, key);
  if (!u) return out(`no such firmware: ${key}. see /firmware`, 'w');
  if (hasC(u.id)) return out(`${u.key} is already flashed.`, 'dim');
  if (S.cores < u.cost) return out(`not enough cores: ${u.key} costs ${fmt(u.cost)}, you have ${fmt(S.cores)}.`, 'w');
  buyC(u.id);
}

function cmdAuto([target, state]) {
  const owned = Object.entries(AUTO_TARGETS).filter(([, t]) => t.owned());
  if (!target) {
    out('autobuyers:');
    for (const [k, t] of owned) out(`  ${pad(k, 8)} ${pad(t.label, 13)} ${S.auto[k] ? 'ON' : 'OFF'}`);
    out('toggle with /auto <target> [on|off]', 'dim');
    return;
  }
  const k = target.toLowerCase();
  const t = AUTO_TARGETS[k];
  if (!t || !t.owned()) return out(`unknown autobuyer: ${target}. targets: ${owned.map(([n]) => n).join(', ')}`, 'w');
  S.auto[k] = state === 'on' ? true : state === 'off' ? false : !S.auto[k];
  out(`auto ${k}: ${S.auto[k] ? 'ON' : 'OFF'}`);
}

function cmdCompress() {
  const c = kGainCost();
  if (S.kernels < c) return out(`not enough kernels: compression level ${S.kGainLvl + 1} costs ${fmt(c)}.`, 'w');
  buyKGain();
  out(`next level costs ${fmt(kGainCost())} KRN.`, 'dim');
}
function cmdUptime() {
  out(`up ${fmtTime(S.stats.thisReboot)} since last reboot. UPTIME bonus: x${fmtD(timeEffect())} (max at 1h).`);
}

function cmdFormat() {
  const gain = formatGain();
  if (gain < 1) return liveBlock(formatView);
  askConfirm('format', `this erases kernels, kernel modules and compression for +${fmt(gain)} core(s).`, () => {
    if (!doFormat()) return out('nothing to format for anymore.', 'dim');
    if (S.stats.formats === 1) out('cores boost everything. try /firmware.', 'ok');
  });
}
function cmdWatchdog([n]) {
  if (n !== undefined) {
    const v = Math.floor(Number(n));
    if (!(v >= 1)) return out('usage: /watchdog <kernels>  (a number >= 1)', 'w');
    S.auto.rebootAt = v;
  }
  out(`watchdog reboots when gain >= ${fmt(S.auto.rebootAt)} KRN. auto reboot is ${S.auto.reboot ? 'ON' : 'OFF'} (/auto reboot).`);
}

function cmdSys([what, arg]) {
  const o = S.opts;
  switch ((what || '').toLowerCase()) {
    case '':
      out('system settings:');
      out(`  theme      ${o.theme}        /sys theme <${THEMES.join('|')}>`);
      out(`  scanlines  ${o.scan ? 'on ' : 'off'}          /sys scanlines`);
      out(`  flicker    ${o.flicker ? 'on ' : 'off'}          /sys flicker`);
      out(`  notation   ${o.notation}          /sys notation`);
      out(`  touch keys ${pad(o.keys, 12)} /sys keys <auto|on|off>`);
      if (S.gui.win1) out(`  graphics   ${S.gui.on ? 'on ' : 'off'}          /sys gui <on|off>`);
      out(`  music      ${o.music ? 'on ' : 'off'}          /sys music <on|off>`);
      out(`  volume     ${pad(o.volume, 12)} /sys volume <0-100>`);
      out('  /sys save · /sys export · /sys import <code> · /sys reset', 'dim');
      return;
    case 'theme':
      if (!THEMES.includes(arg)) return out(`usage: /sys theme <${THEMES.join('|')}>`, 'w');
      o.theme = arg; applyOpts(); return out(`phosphor set to ${arg}.`);
    case 'scanlines': o.scan = !o.scan; applyOpts(); return out(`scanlines ${o.scan ? 'on' : 'off'}.`);
    case 'flicker': o.flicker = !o.flicker; applyOpts(); return out(`flicker ${o.flicker ? 'on' : 'off'}.`);
    case 'music':
      if (!['on', 'off'].includes(arg)) return out('usage: /sys music <on|off>', 'w');
      o.music = arg === 'on';
      return out(`music ${arg}.`);
    case 'volume': {
      const v = Math.round(Number(arg));
      if (!(v >= 0 && v <= 100)) return out('usage: /sys volume <0-100>', 'w');
      o.volume = v;
      if (v > 0) o.music = true;
      return out(`volume ${v}.`);
    }
    case 'keys':
      if (!['auto', 'on', 'off'].includes(arg)) return out('usage: /sys keys <auto|on|off>  (auto = only on touch screens)', 'w');
      o.keys = arg; applyOpts(); return out(`touch keys: ${arg}.`);
    case 'notation':
      o.notation = o.notation === 'sci' ? 'eng' : 'sci';
      return out(`notation: ${o.notation === 'sci' ? 'scientific (1.23e45)' : 'engineering (123.45e42)'}.`);
    case 'save': return save(false);
    case 'export': {
      const code = exportSave();
      out('save code (copied to clipboard if allowed):');
      out(code, 'code');
      if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
      return;
    }
    case 'import':
      if (!arg) return out('usage: /sys import <code>', 'w');
      try { importSave(arg); log('save imported.', 'ok'); }
      catch (e) { out('could not read that save code.', 'w'); }
      return;
    case 'reset':
      return askConfirm('reset', 'this ERASES ALL PROGRESS, on every machine. there is no undo.', hardReset);
    case 'gui':
      if (!S.gui.win1) {
        if (S.stats.reboots === 0) return out('locked. reboot once first.', 'dim');
        if (arg === 'on') return startUpgrade();
        return out('INCR.OS 2.0 is not installed. /upgrade installs it.', 'dim');
      }
      if (!['on', 'off'].includes(arg)) return out('usage: /sys gui <on|off>  (the graphical environment)', 'w');
      S.gui.on = arg === 'on';
      return out(`graphical environment ${arg}.`);
    default:
      return out(`unknown setting: ${what}. type /sys`, 'w');
  }
}

// file names in the directory part of `prefix`, for path completion
function pathPool(prefix) {
  const cut = prefix.lastIndexOf('/') + 1;
  const dirPart = prefix.slice(0, cut), namePart = prefix.slice(cut);
  const { node } = lookup(resolvePath(dirPart || '.'));
  if (!node || node.type !== 'dir') return [];
  return Object.keys(node.children)
    .filter(n => fsVisible(node.children[n]) && (namePart.startsWith('.') || !n.startsWith('.')))
    .map(n => dirPart + n + (node.children[n].type === 'dir' ? '/' : ''));
}

// Tab completion for command names, file paths and first arguments.
function complete(inp) {
  if (inp.value.startsWith('./')) return applyCompletion(inp, './', pathPool(inp.value.slice(2)), inp.value.slice(2));
  const m = inp.value.match(/^\/?(\S*)(\s+(\S*))?$/);
  if (!m) return;
  let pool, prefix, base;
  if (m[2] === undefined) {
    pool = unlockedCmds().filter(c => !c.temp).map(c => c.name);
    if (has('alias')) pool.push(...Object.keys(S.aliases));
    prefix = m[1].toLowerCase(); base = '/';
  } else {
    const name = m[1].toLowerCase();
    prefix = m[3] || ''; base = `/${name} `;
    if (['ls', 'cd', 'cat', 'run'].includes(name)) return applyCompletion(inp, base, pathPool(prefix), prefix);
    prefix = prefix.toLowerCase();
    if (name === 'challenge') pool = ['start', 'exit'];
    else if (name === 'script') pool = ['boot', 'every', 'rm', 'clear'];
    else if (name === 'alias') pool = ['rm', ...Object.keys(S.aliases)];
    else if (name === 'install') pool = K_UPGRADES.filter(u => !has(u.id)).map(u => u.key);
    else if (name === 'flash') pool = C_UPGRADES.filter(u => !hasC(u.id)).map(u => u.key);
    else if (name === 'buy') pool = NAMES.filter((_, i) => tierUnlocked(i)).map(n => n.toLowerCase());
    else if (name === 'auto') pool = Object.keys(AUTO_TARGETS).filter(k => AUTO_TARGETS[k].owned());
    else if (name === 'help') pool = unlockedCmds().map(c => c.name);
    else if (name === 'clock') pool = ['buy', 'max'];
    else if (name === 'ssh') pool = Object.keys(MACHINES).filter(machineOpen);
    else if (name === 'skin') pool = Object.keys(SKINS).filter(skinOpen);
    else if (name === 'rename') pool = NAMES.map(n => n.toLowerCase());
    else if (name === 'patch') pool = PATCHES.filter(u => !hasP(u.id)).map(u => u.key);
    else if (name === 'tutorial') pool = ['skip'];
    else if (name === 'ach') pool = ['list'];
    else if (name === 'sys') pool = ['theme', 'scanlines', 'flicker', 'notation', 'music', 'volume', 'keys', 'gui', 'save', 'export', 'import', 'reset'];
    else return;
  }
  applyCompletion(inp, base, pool, prefix);
}
function applyCompletion(inp, base, pool, prefix) {
  const hits = pool.filter(p => p.startsWith(prefix));
  if (hits.length === 1) inp.value = base + hits[0] + (hits[0].endsWith('/') ? '' : ' ');
  else if (hits.length > 1) {
    let common = hits[0];
    for (const h of hits) while (!h.startsWith(common)) common = common.slice(0, -1);
    inp.value = base + common;
    out(hits.join('   '), 'dim');
  }
}

// Destructive commands ask first: answer /yes or /no within 10 seconds (the bar
// above the prompt shows the countdown and has YES/NO buttons for touch screens).
const CONFIRM_SECS = 10;
let pending = null; // { label, action, until }
// onNo (optional) runs on /no and when time runs out
function askConfirm(label, detail, action, secs = CONFIRM_SECS, onNo = null) {
  pending = { label, action, onNo, until: Date.now() + secs * 1000 };
  out(detail, 'w');
  out(`${label}? type /yes or /no (${secs}s)`, 'w');
}
function answer(yes) {
  const p = pending;
  pending = null;
  if (!p) return;
  if (yes) p.action();
  else if (p.onNo) p.onNo();
  else out(`${p.label} cancelled.`, 'dim');
}
function confirmTick() {
  if (pending && Date.now() >= pending.until) {
    const p = pending;
    pending = null;
    if (p.onNo) p.onNo();
    else log(`no answer: ${p.label} cancelled.`, 'dim');
  }
}

// ---------------------------------------------------------------- upgrade offer
// Saves that rebooted before INCR.OS 2.0 existed get asked instead of having the
// new look forced on them. New players get the transition on their first reboot.
let upgradeOffer = false; // the question is on screen
function offerUpgrade() {
  upgradeOffer = true;
  askConfirm('install INCR.OS 2.0',
    'INCR.OS 2.0 is available: a whole new graphical environment, with windows, menus and buttons.',
    startUpgrade, 60, () => {
      upgradeOffer = false;
      S.gui.declined = true;
      out('staying on the terminal. type /upgrade whenever you want INCR.OS 2.0.', 'dim');
    });
}
function startUpgrade() {
  upgradeOffer = false;
  S.gui.declined = false;
  playGuiIntro();
}

// ---------------------------------------------------------------- save / load
function num(v, d) { return typeof v === 'number' && !isNaN(v) ? Math.min(v, MAXN) : d; }
function merge(base, saved) {
  for (const k in saved) {
    const b = base[k], s = saved[k];
    if (b && s && typeof b === 'object' && typeof s === 'object' && !Array.isArray(b) && !Array.isArray(s)) merge(b, s);
    else base[k] = s;
  }
  return base;
}
// Machine fields after JSON: L numbers come back as null (-Infinity), and
// version 1 saves stored bytes and amounts as plain numbers.
function cleanMachine(m, v1) {
  const toL = (v, d) => (v1 ? (typeof v === 'number' && v > 0 ? Math.min(Math.log10(v), OVERFLOW_L) : d) : Lnum(v, d));
  const tiers = Array.isArray(m.tiers) ? m.tiers : [];
  m.tiers = Array.from({ length: TIERS }, (_, i) => {
    const t = tiers[i] || {};
    return { amt: toL(v1 ? t.amount : t.amt, ZERO), bought: Math.floor(num(t.bought, 0)) };
  });
  m.bytes = toL(v1 ? m.points : m.bytes, 1);
  delete m.points;
  for (const k of ['clocks', 'kernels', 'kernelsEarned', 'kGainLvl']) m[k] = num(m[k], 0);
  if (!m.kUpg || typeof m.kUpg !== 'object') m.kUpg = {};
  if (!m.auto || typeof m.auto !== 'object') m.auto = freshMachine().auto;
  return m;
}
function sanitize(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const v1 = !raw.v;
  const s = merge(newState(), raw);
  cleanMachine(s, v1);
  if (!MACHINES[s.machine]) s.machine = 'incr-7';
  if (!s.machines || typeof s.machines !== 'object') s.machines = {};
  for (const id of Object.keys(s.machines)) {
    if (!MACHINES[id] || id === s.machine) delete s.machines[id];
    else cleanMachine(s.machines[id], false);
  }
  for (const k of ['cores', 'coresEarned']) s[k] = num(s[k], 0);
  const st = s.stats;
  if (v1) {
    const old = raw.stats || {};
    st.bestBytes = Math.max(1, L.of(num(old.bestPoints, 10)));
    st.totalBytes = L.of(num(old.totalPoints, 0));
    st.overflowed = !!raw.won;
    s.won = false;
    s.tut.done = true; // players from before the tutorial skip it
    delete st.bestPoints; delete st.totalPoints;
  } else {
    st.bestBytes = Lnum(st.bestBytes, 1);
    st.totalBytes = Lnum(st.totalBytes, ZERO);
  }
  s.v = SAVE_VERSION;
  s.lastTick = num(s.lastTick, Date.now());
  if (!Array.isArray(s.scripts)) s.scripts = [];
  s.wipedKeep = Array.isArray(s.wipedKeep) ? s.wipedKeep.filter(id => KEEP_IDS.includes(id)) : [];
  if (!CHAL_BY_ID[s.chal.active]) s.chal.active = null;
  if (!SKINS[s.skin]) s.skin = 'default';
  if (!s.rename || typeof s.rename !== 'object') s.rename = {};
  if (!s.patches || typeof s.patches !== 'object') s.patches = {};
  if (!s.tut.f || typeof s.tut.f !== 'object') s.tut.f = {};
  if (!s.gui || typeof s.gui !== 'object') s.gui = { on: true, win1: false };
  delete s.gui.intro; // v0.5's green desktop: everyone sees the new install once
  return s;
}
function save(silent) {
  S.lastTick = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
    if (!silent) log('session saved to disk.');
  } catch (e) {
    if (!silent) log('save failed: storage unavailable.', 'w');
  }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) { S = sanitize(JSON.parse(raw)); return true; }
  } catch (e) { /* corrupt or blocked storage: start fresh */ }
  return false;
}
function exportSave() {
  return btoa(unescape(encodeURIComponent(JSON.stringify(S))));
}
function importSave(str) {
  const data = JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
  S = sanitize(data);
  checkCommands(true);
  S.lastTick = Date.now();
  applyOpts();
  setPrompt();
  save(true);
}

// ---------------------------------------------------------------- screen
function hardReset() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  S = newState();
  S.seenVersion = VERSION;
  checkCommands(true);
  applyOpts();
  $('log').innerHTML = '';
  live.clear();
  pending = null;
  ev = null;
  scheduleEvent();
  cwd = [...HOME];
  setPrompt();
  log('all data erased. fresh install. type /help', 'w');
}

// ---------------------------------------------------------------- news ticker
// Headlines (news.js) scroll across one line under the header, never in the
// console, so they can't push live views off the screen.
const NEWS_LABEL = { update: 'UPDATE', joke: 'JOKE', fact: 'FACT', tip: 'TIP', news: 'NEWS' };
const newsHistory = [];
let newsBag = [], newsAnim = null, newsTimer = null;
const reduceMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

function nextHeadline() {
  const eligible = NEWS.filter(n => !n.when || n.when());
  newsBag = newsBag.filter(n => eligible.includes(n));
  if (!newsBag.length) {
    newsBag = eligible.slice();
    for (let i = newsBag.length - 1; i > 0; i--) { const j = rnd(i + 1); [newsBag[i], newsBag[j]] = [newsBag[j], newsBag[i]]; }
  }
  const n = newsBag.pop();
  const item = { label: NEWS_LABEL[n.cat], text: typeof n.text === 'function' ? n.text() : n.text };
  newsHistory.push(`[${item.label}] ${item.text}`);
  if (newsHistory.length > 30) newsHistory.shift();
  return item;
}
function stopNews() {
  if (newsAnim) { newsAnim.onfinish = null; newsAnim.cancel(); newsAnim = null; }
  clearTimeout(newsTimer);
}
function playNews() {
  stopNews();
  const box = $('news'), line = $('newsText');
  box.classList.toggle('hidden', !S.opts.news);
  if (!S.opts.news) return;
  const item = nextHeadline();
  line.innerHTML = `<span class="dim">[${item.label}]</span> ${esc(item.text)}`;
  if (reduceMotion() || !line.animate) {
    line.style.transform = '';
    newsTimer = setTimeout(playNews, 12000);
    return;
  }
  const from = box.clientWidth, to = -line.scrollWidth;
  newsAnim = line.animate(
    [{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }],
    { duration: ((from - to) / 80) * 1000, easing: 'linear' });
  newsAnim.onfinish = playNews;
  if (newsTab && newsTab === 'recent') renderNewsPanel();
}

// NEWS button: a panel with recent headlines, the changelog and the ticker switch.
let newsTab = null; // null = panel closed
function openNews(tab) {
  newsTab = tab;
  $('newsPanel').classList.remove('hidden');
  $('newsBtn').setAttribute('aria-expanded', 'true');
  if (tab === 'updates') S.seenVersion = VERSION; // clears the "*" badge
  renderNewsPanel();
}
function closeNews() {
  if (!newsTab) return;
  newsTab = null;
  $('newsPanel').classList.add('hidden');
  $('newsBtn').setAttribute('aria-expanded', 'false');
  $('cmd').focus();
}
function renderNewsPanel() {
  for (const b of document.querySelectorAll('[data-np]')) b.classList.toggle('on', b.dataset.np === newsTab);
  $('npTicker').textContent = `TICKER: ${S.opts.news ? 'ON' : 'OFF'}`;
  let html;
  if (newsTab === 'updates') {
    html = UPDATES.map(u => `<p>${esc(u.v)}${u.v === VERSION ? ' <span class="dim">(current)</span>' : ''}</p>` +
      u.notes.map(n => `<p class="dim">  - ${esc(n)}</p>`).join('')).join('');
  } else {
    html = newsHistory.length
      ? newsHistory.slice(-12).reverse().map(h => `<p>${esc(h)}</p>`).join('')
      : '<p class="dim">no headlines yet.</p>';
  }
  $('npBody').innerHTML = html;
}
function updateNewsBadge() {
  $('newsBtn').classList.toggle('new', S.seenVersion !== VERSION);
}
function wireNews() {
  $('newsBtn').addEventListener('click', () => (newsTab ? closeNews() : openNews(S.seenVersion !== VERSION ? 'updates' : 'recent')));
  $('news').addEventListener('click', () => openNews('recent'));
  for (const b of document.querySelectorAll('[data-np]')) b.addEventListener('click', () => openNews(b.dataset.np));
  $('npTicker').addEventListener('click', () => { S.opts.news = !S.opts.news; playNews(); renderNewsPanel(); });
  $('npClose').addEventListener('click', closeNews);
  // Esc or a click outside closes the panel
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && newsTab) closeNews(); });
  document.addEventListener('pointerdown', e => {
    if (newsTab && !e.target.closest('#newsPanel, #newsBtn, #news')) closeNews();
  });
}

// a touch screen is the main input (tablets, phones): no Tab key, no arrows
const touchFirst = () => !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
function applyOpts() {
  document.documentElement.dataset.theme = S.opts.theme;
  $('crt').classList.toggle('scan', !!S.opts.scan);
  $('crt').classList.toggle('flicker', !!S.opts.flicker);
  const keys = S.opts.keys === 'on' || (S.opts.keys !== 'off' && touchFirst());
  $('keys').classList.toggle('hidden', !keys);
}

// On tablets and phones the on-screen keyboard covers part of the page. Size the
// screen to the visible part so the prompt stays above the keyboard.
function fitViewport() {
  const vv = window.visualViewport;
  const root = document.documentElement.style;
  root.setProperty('--app-h', `${vv ? vv.height : window.innerHeight}px`);
  root.setProperty('--app-top', `${vv ? vv.offsetTop : 0}px`);
  const box = $('log');
  if (box) stickBottom(box);
}

function setText(el, s) { if (el && el._t !== s) { el.textContent = s; el._t = s; } }

// the question bar above the prompt: label, countdown, YES / NO
function renderConfirm() {
  const bar = $('confirmBar');
  bar.classList.toggle('hidden', !pending);
  if (!pending) return;
  const secs = Math.max(0, Math.ceil((pending.until - Date.now()) / 1000));
  setText($('confirmText'), `${pending.label.toUpperCase()}? /yes or /no  ${secs}s`);
}

function render() {
  setText($('points'), fmtL(S.bytes));
  setText($('pps'), fmtL(bpsL()));
  const sub = [];
  if (S.machine !== 'incr-7') sub.push(S.machine);
  if (S.kernelsEarned > 0 || S.stats.reboots > 0) sub.push(`KRN ${fmt(S.kernels)}`);
  if (S.coresEarned > 0) sub.push(`CORES ${fmt(S.cores)}`);
  if (turboLeft() > 0) sub.push(`TURBO ${Math.ceil(turboLeft())}s`);
  if (ev && ev.def.id === 'virus') sub.push('VIRUS!');
  if (S.chal.active) sub.push(`CHALLENGE ${S.chal.active}`);
  setText($('subcur'), sub.join('  ·  '));
  updateNewsBadge();
  if (achMenu) {
    if (achMenu.count !== achCount()) renderAchMenu(); // something unlocked while open
    else renderAchDetail(); // keeps the progress bar moving
  }
  renderConfirm();
  renderGui();
  Music.sync(guiOn() ? 'win1' : 'terminal', S.opts.music, S.opts.volume);
  const mb = $('musicBtn');
  mb.classList.toggle('off', !S.opts.music);
  mb.setAttribute('aria-pressed', String(!!S.opts.music));
  checkTutorial();
  const obj = $('objective');
  obj.classList.toggle('hidden', S.tut.done);
  if (!S.tut.done) setText(obj, `TUTORIAL ${S.tut.step + 1}/${TUTORIAL.length} > ${TUTORIAL[S.tut.step].text()}   (/tutorial skip)`);
  updateLive();
}

function wireInput() {
  const inp = $('cmd');
  const histUp = () => { if (histPos > 0) inp.value = cmdHistory[--histPos]; };
  const histDown = () => {
    histPos = Math.min(cmdHistory.length, histPos + 1);
    inp.value = cmdHistory[histPos] || '';
  };
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { runCommand(inp.value); inp.value = ''; }
    else if (e.key === 'Tab') { e.preventDefault(); complete(inp); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); histUp(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); histDown(); }
    else if (e.key === 'Escape') inp.blur();
  });
  // touch keys: the keys a tablet keyboard doesn't have
  const keyActions = {
    tab: () => complete(inp),
    up: histUp,
    down: histDown,
    help: () => runCommand('/help'),
    max: () => runCommand('/max'),
  };
  // pointerdown + preventDefault keeps the prompt focused, so the keyboard stays open
  $('keys').addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-key]');
    if (!b) return;
    e.preventDefault();
    if (document.activeElement !== inp) inp.focus();
    keyActions[b.dataset.key]();
  });
  $('keys').addEventListener('click', e => e.stopPropagation());
  if (window.visualViewport) {
    visualViewport.addEventListener('resize', fitViewport);
    visualViewport.addEventListener('scroll', fitViewport);
  }
  window.addEventListener('resize', () => { fitViewport(); applyOpts(); });
  fitViewport();
  // clicking the terminal focuses the prompt (unless selecting text)
  $('term').addEventListener('click', () => {
    if (!String(window.getSelection())) inp.focus();
  });
  // outside the prompt: / or Enter jumps back in, plus a few hotkeys
  document.addEventListener('keydown', e => {
    if ($('app').classList.contains('hidden') || e.target === inp) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === '/' || k === 'enter') {
      e.preventDefault();
      inp.focus();
      if (k === '/' && !inp.value) inp.value = '/';
    } else if (k === 'm') maxAll();
    else if (k === 'c') buyClockMax();
    else if (k >= '1' && k <= '8') buyMax(+k - 1);
  });
}

// ---------------------------------------------------------------- boot + loop
const BOOT_LINES = [
  'INCR BIOS v0.1   (c) 1987 Incremental Systems Corp.',
  '',
  'Memory test ............ 640K OK',
  'Detecting drives ....... /dev/sda0 OK',
  'Loading kernel ......... OK',
  'Mounting /proc ......... OK',
  'Restoring session ...... %SESSION%',
  '',
  'Welcome to INCR.OS. Press any key.',
];

function runBoot(hadSave, done) {
  const box = $('boot');
  let i = 0, finished = false;
  const finish = e => {
    if (finished) return;
    finished = true;
    if (e) e.preventDefault();
    window.removeEventListener('keydown', finish);
    window.removeEventListener('pointerdown', finish);
    box.classList.add('hidden');
    $('app').classList.remove('hidden');
    done();
  };
  window.addEventListener('keydown', finish);
  window.addEventListener('pointerdown', finish);
  const next = () => {
    if (finished) return;
    if (i >= BOOT_LINES.length) { setTimeout(finish, 500); return; }
    box.textContent += BOOT_LINES[i++].replace('%SESSION%', hadSave ? 'OK' : 'NONE (new install)') + '\n';
    setTimeout(next, 90 + Math.random() * 120);
  };
  next();
}

let lastLogic = Date.now(), saveAcc = 0;
function logicTick() {
  const now = Date.now();
  const dt = (now - lastLogic) / 1000;
  lastLogic = now;
  if (dt <= 0) return;
  // the tab was asleep (browsers throttle background timers): catch up
  if (dt > 60) catchUp(dt, 'WHILE THE TAB WAS ASLEEP', false);
  else if (dt > 2) simulate(dt);
  else step(dt);
  S.lastTick = now;
  saveAcc += dt;
  if (saveAcc >= 10) { saveAcc = 0; save(true); }
  eventTick();
  confirmTick();
}

function init() {
  const hadSave = load();
  applyOpts();
  wireInput();
  wireNews();
  wireAchMenu();
  wireGui();
  // Browsers only start audio from a "real" gesture. On touch screens that's the
  // finger lifting (touchend / pointerup / click), not touching down.
  const unlockAudio = () => Music.unlock();
  for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
    window.addEventListener(type, unlockAudio, { passive: true });
  }
  // the phone's media notification Play/Pause buttons act like the music button
  Music.onMediaButton(on => { S.opts.music = on; if (on) Music.unlock(); });
  $('musicBtn').addEventListener('click', () => {
    S.opts.music = !S.opts.music;
    if (S.opts.music && S.opts.volume === 0) S.opts.volume = 40;
    log(`music ${S.opts.music ? 'on' : 'off'}. (/sys volume to change how loud)`, 'dim');
  });

  checkCommands(true); // what the save already had is not "new"

  // offline progress (the report prints once the boot screen is gone)
  const away = (Date.now() - S.lastTick) / 1000;
  let offline = null;
  if (hadSave && away > 10) {
    const before = progressSnap();
    simulate(Math.min(away, 43200));
    if (away > 60) offline = { sec: away, before, after: progressSnap() };
  }
  checkAch();
  checkCommands(true);
  setPrompt();
  scheduleEvent();

  runBoot(hadSave, () => {
    log('INCR.OS ready. type /help to list commands.', 'ok');
    if (!hadSave) S.seenVersion = VERSION;
    else if (S.seenVersion !== VERSION) log(`INCR.OS updated to ${VERSION}. click NEWS (top left) to see what's new.`, 'w');
    playNews();
    if (!hadSave) out('new here? follow the TUTORIAL line above the prompt.', 'dim');
    if (offline) reportBox('WHILE YOU WERE AWAY', offline.sec, offline.before, offline.after);
    if (hadSave && S.stats.reboots > 0 && !S.gui.win1 && !S.gui.declined) offerUpgrade();
    $('cmd').focus();
    lastLogic = Date.now();
    setInterval(() => { logicTick(); render(); }, 50);
  });

  document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });
  window.addEventListener('beforeunload', () => save(true));
}

init();
