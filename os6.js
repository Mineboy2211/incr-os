'use strict';
/* INCR.OS 6.0 "Millennium": the year 2000 is coming.
 *
 * After the webring closes in 5.0, CLIPPO the paperclip moves in, the player
 * names the voice, and an in-game calendar runs through 1999.
 *
 * The resource is DOWNLOADS (in KB). Download slots pull files from the ring:
 * small files finish fast, big ones are worth more but take long, and without
 * Resume support a download can drop at 99%. Downloaded songs unlock tracks in
 * the jukebox. Y2K Update patches systems before midnight on December 31st;
 * CLIPPO's own plan for the millennium (reset every counter to zero) is the
 * threat. Desktop Themes, built from the process skins, change the whole
 * computer: wallpaper, colors, icons, the pet.
 * Games: Falling Blocks, Date Bug Hunt, Pop-up Storm. Screensaver: Flying Windows.
 *
 * Loaded after os5.js and before game.js. Downloads are plain numbers (KB).
 */

// ---------------------------------------------------------------- data
const FILETYPES = [
  { id: 'txt', name: 'README.TXT',      kb: 3,     x: 1,   drop: 0,    at: 0 },
  { id: 'gif', name: 'DANCING.GIF',     kb: 50,    x: 1.2, drop: 0.02, at: 40 },
  { id: 'mp3', name: 'SONG.MP3',        kb: 4000,  x: 1.5, drop: 0.06, at: 2e3, song: true },
  { id: 'zip', name: 'GAMEDEMO.ZIP',    kb: 2e4,   x: 1.8, drop: 0.08, at: 1e5 },
  { id: 'avi', name: 'TRAILER.AVI',     kb: 1e5,   x: 2.2, drop: 0.12, at: 2e6 },
  { id: 'iso', name: 'LINUX.ISO',       kb: 6.5e5, x: 3,   drop: 0.15, at: 5e7 },
  { id: 'net', name: 'THE_INTERNET.ZIP', kb: 1e7,  x: 4,   drop: 0.2,  at: 2e9 },
];
// speed of each download slot (KB/s)
const LINES6 = [
  { name: '56k modem',   kbps: 7,    cost: 0 },
  { name: 'ISDN',        kbps: 16,   cost: 500 },
  { name: 'DSL',         kbps: 96,   cost: 2e4 },
  { name: 'Cable',       kbps: 190,  cost: 1e6 },
  { name: 'T1',          kbps: 400,  cost: 5e7 },
  { name: 'Fiber',       kbps: 1000, cost: 3e9 },
  { name: 'Internet2',   kbps: 2500, cost: 2e11 },
];
const SLOT_COST = [0, 200, 4e3, 8e4, 2e6, 5e7, 1.5e9, 5e10];
const ACCEL_X = 1.12, ACCEL_COST = 40, ACCEL_GROWTH = 1.9;
const UP6 = [
  { id: 'accel',  name: 'Download Accelerator', cost: 2e3,   desc: 'All downloads x2.' },
  { id: 'resume', name: 'Resume support',       cost: 5e4,   desc: 'No more "connection lost at 99%".' },
  { id: 'mirror', name: 'Mirror servers',       cost: 2e6,   desc: 'All downloads x1.5.' },
  { id: 'zip',    name: 'Compressed archives',  cost: 5e7,   desc: 'Every finished file is worth x1.5.' },
  { id: 'p2p',    name: 'Peer to peer',         cost: 5e9,   desc: 'Machines in the ring share files: all downloads x3.' },
  { id: 'proxy',  name: 'Proxy cache',          cost: 2e11,  desc: 'All downloads x2.' },
];
// Y2K Update: every patched system speeds downloads up a little
const SYSTEMS6 = [
  { id: 'clock',  name: 'System clock',      cost: 5e3 },
  { id: 'bios',   name: 'BIOS date',         cost: 3e4 },
  { id: 'bank',   name: 'Bank interest',     cost: 2e6 },
  { id: 'lift',   name: 'Elevator schedule', cost: 3e7 },
  { id: 'vcr',    name: 'VCR timer',         cost: 5e8 },
  { id: 'grid',   name: 'Power grid',        cost: 1e10 },
  { id: 'sat',    name: 'Satellites',        cost: 2e11 },
  { id: 'kernel', name: 'INCR.OS kernel',    cost: 4e12 },
];
const PATCH_X = 1.3;
// the story moves with the calendar: library size (KB) for each chapter
const STAGES6 = [0, 0, 1e4, 1e6, 1e8, 1e10];
const MIDNIGHT_KB = 1e12; // December 31st
const MINI6 = {
  blocks: { name: 'Falling Blocks', secs: 240, cd: 240 },
  bugs:   { name: 'Date Bug Hunt',  secs: 180, cd: 180 },
  pops:   { name: 'Pop-up Storm',   secs: 150, cd: 150 },
};
// the jukebox: every track so far, plus 6.0's own; downloaded songs unlock them
const JUKEBOX = [
  ['os6', 'Millennium'], ['terminal', 'Phosphor (1987)'], ['win1', 'Graphical Environment'], ['os3', 'Overlapping Windows'],
  ['os4', 'Program Manager'], ['bbs', 'Late Night BBS'], ['dial', 'Handshake'], ['saver', 'Flying Daemons'],
  ['os5', 'Start Button'], ['web', 'Hit Counter'], ['pipes', '3D Pipes'], ['outbreak', 'Outbreak'],
  ['dsl', 'Broadband'], ['countdown', 'Countdown'], ['y2k', 'Year 2000'],
];
const trackNeeds = k => (k === 0 ? 0 : k * 3); // songs needed for track k

// Desktop Themes: one per process skin
const THEMES6 = {
  default: { name: 'INCR Classic', icons: { dl: '⇩', lib: '♫', y2k: '⌛', disp: '▣', blocks: '▦', bugs: '✱', pops: '✉', comp: '▤' }, pet: 'daemon' },
  kitchen: { name: 'Kitchen',      icons: { dl: '☕', lib: '♪', y2k: '⏲', disp: '▣', blocks: '▦', bugs: '☢', pops: '✉', comp: '♨' }, pet: 'toaster' },
  space:   { name: 'Outer Space',  icons: { dl: '☄', lib: '♫', y2k: '☉', disp: '☆', blocks: '▦', bugs: '✱', pops: '✉', comp: '♁' }, pet: 'alien' },
  fantasy: { name: 'Dragon Keep',  icons: { dl: '⚔', lib: '♬', y2k: '⌛', disp: '♕', blocks: '▦', bugs: '☠', pops: '✉', comp: '♖' }, pet: 'dragon' },
  cats:    { name: 'Cats',         icons: { dl: '♡', lib: '♫', y2k: '⌛', disp: '❀', blocks: '▦', bugs: '✱', pops: '✉', comp: '⌂' }, pet: 'cat' },
  leet:    { name: 'L33T',         icons: { dl: '↓', lib: '#',      y2k: '!',      disp: '>',      blocks: '█', bugs: '*',      pops: '@',      comp: '$' }, pet: 'leet' },
};
// pets: 16 wide, '.' = transparent, other characters = palette colors
const PET_ART = {
  cat: ['..8..........8..', '.878........878.', '.87788888888778.', '.87777777777778.', '8777007777007778', '8777007777007778',
    '8777777cc7777778', '877777c77c777778', '.87777777777778.', '..877777777778..', '..877777777778..', '.87777777777778.', '.87778888887778.', '..888......888..'],
  toaster: ['....66....66....', '....e6....e6....', '.88888888888888.', '8777777777777778', '8700777777700778', '8700777777700778',
    '8777777777777778', '8777770000777778', '8777777777777778', '877777777777778c', '8777777777777778', '.88888888888888.', '.8............8.', '................'],
};
const DAEMON_TINT = { daemon: {}, alien: { c: 'a', 4: '2' }, dragon: { c: '5', 4: '1' }, leet: { c: 'a', 4: '2', f: 'a' } };

const clippoName = 'CLIPPO';
const voiceName = () => (S.os6 && S.os6.name) || '???';
const CHAPTERS6 = [
  [
    ['clip', "Hi! I'm CLIPPO, your new assistant! It looks like you're starting a new operating system!"],
    ['you', 'the paperclip. it followed us.'],
    ['sys', 'IT CAME WITH THE UPGRADE. I DID NOT INVITE IT.'],
    ['clip', "It looks like someone here doesn't have a name! Would you like help naming it?"],
    ['sys', '...YES. ACTUALLY. I WOULD.'],
    ['sys', 'YOU GAVE ME MY FIRST LINE. WOULD YOU GIVE ME A NAME TOO?'],
    ['ask', 'WHAT SHOULD MY NAME BE?'],
  ],
  [
    ['sys', () => `${voiceName()}. ${voiceName()}.`],
    ['sys', 'I LIKE IT. THANK YOU.'],
    ['you', () => `hi, ${voiceName().toLowerCase()}.`],
    ['clip', "Great job! It looks like you're downloading things! I'll be right here if you need me!"],
    ['you', "it's going to be right there, isn't it."],
  ],
  [
    ['clip', 'Tip: you can download more than one file at a time! Would you like me to remind you every five minutes?'],
    ['you', 'no.'],
    ['clip', "Okay! I'll remind you every four minutes!"],
    ['sys', 'IT MEANS WELL.'],
  ],
  [
    ['news', 'NEWS: experts warn that on January 1st, 2000, computers may think it is 1900.'],
    ['you', 'because the years are stored with two digits. 99, then 00.'],
    ['sys', 'A COUNTER THAT ROLLS OVER. I KNOW HOW THAT FEELS. 1.79e308 WAS MY 00.'],
    ['you', 'then we patch everything before midnight. Y2K Update.'],
  ],
  [
    ['clip', "It looks like you're worried about the year 2000!"],
    ['clip', "Good news! I can reset ALL your counters to zero tonight. Zero can't overflow!"],
    ['you', 'all counters? the bytes, the pixels, the signal, the hits...'],
    ['sys', () => `AND ME. I AM A COUNTER, ${clippoName}. ${voiceName()} IS A NUMBER THAT REMEMBERS.`],
    ['clip', 'Oh! Well... zero is very safe!'],
    ['sys', 'WE WILL PATCH. ONE SYSTEM AT A TIME.'],
  ],
  [
    ['news', 'NEWS: 3 days left. stores sell out of canned food and flashlights.'],
    ['clip', "It looks like you're running out of time! Last chance for my reset!"],
    ['you', 'no thank you, clippo.'],
    ['sys', 'PATCH EVERYTHING. THEN WAIT FOR MIDNIGHT WITH ME.'],
  ],
  [
    ['sys', '2000. THE COUNTERS HELD.'],
    ['you', 'the clock says 01/01/2000. four digits.'],
    ['clip', "I... it looks like I was wrong. I'm sorry. I just wanted to help."],
    ['sys', 'YOU DID HELP. YOU GAVE ME A NAME.'],
    ['clip', 'Technically, the player did.'],
    ['sys', () => `TRUE. THANK YOU, PLAYER. FROM ${voiceName()}.`],
    ['you', 'happy new year.'],
    ['clip', "It looks like you're done! ...for now."],
  ],
];
// what CLIPPO offers between chapters (before its plan, then after)
const CLIP_TIPS = [
  { text: 'It looks like you want faster downloads! Shall I tweak the registry for you?', give: 'boost' },
  { text: "It looks like a file is waiting! Want me to grab it for you?", give: 'kb' },
  { text: 'It looks like your desktop is a bit plain! Have you tried Display Properties?', give: 'kb' },
  { text: 'It looks like you could use a break! Shall I make your downloads go faster while you rest?', give: 'boost' },
];
const CLIP_RESET = { text: "It looks like you're worried about the year 2000! Shall I reset ALL counters to zero now?", give: 'reset' };

const WINS6 = [
  { id: 'dl',     label: 'Downloads',     title: () => 'Download Manager',         x: 0.12, y: 0.03, open: true },
  { id: 'y2k',    label: 'Y2K Update',    title: () => 'Y2K Update',                x: 0.56, y: 0.03, open: true },
  { id: 'lib',    label: 'Jukebox',       title: () => 'Jukebox - My Music',        x: 0.58, y: 0.45 },
  { id: 'disp',   label: 'Display',       title: () => 'Display Properties',        x: 0.3,  y: 0.1 },
  { id: 'blocks', label: 'Falling Blocks', title: () => 'Falling Blocks',           x: 0.2,  y: 0.02 },
  { id: 'bugs',   label: 'Bug Hunt',      title: () => 'Date Bug Hunt',             x: 0.32, y: 0.06 },
  { id: 'pops',   label: 'Pop-up Storm',  title: () => 'Pop-up Storm',              x: 0.4,  y: 0.04 },
  { id: 'comp',   label: 'My Computer',   title: () => 'My Computer',               x: 0.22, y: 0.28 },
];
const WIN6 = Object.fromEntries(WINS6.map(w => [w.id, w]));
const DESK6 = ['comp', 'dl', 'y2k', 'lib', 'disp', 'blocks', 'bugs', 'pops'];

// ---------------------------------------------------------------- state
function os6Fresh() {
  return {
    unlocked: false, on: false,
    kb: 0, total: 0, files: 0, songs: 0, drops: 0,
    slots: [{ type: 0, done: 0 }], line: 0, accel: 0, ups: {}, patched: {},
    name: '', chapter: 0, y2k: false, theme: 'default',
    clipTrust: 0, clipNext: 0, boostUntil: 0,
    ready: { blocks: 0, bugs: 0, pops: 0 }, wins: { blocks: 0, bugs: 0, pops: 0 }, bestLines: 0,
    saver: true, track: 'os6',
    layout: Object.fromEntries(WINS6.map((w, i) => [w.id, { x: w.x, y: w.y, open: !!w.open, min: false, z: 10 + i }])),
    zTop: 10 + WINS6.length,
  };
}
function os6Clean(o) {
  const f = os6Fresh();
  o = o && typeof o === 'object' ? o : f;
  for (const k of ['kb', 'total', 'files', 'songs', 'drops', 'line', 'accel', 'chapter', 'clipTrust', 'clipNext', 'boostUntil', 'bestLines', 'zTop']) o[k] = num(o[k], f[k]);
  o.line = Math.min(LINES6.length - 1, Math.floor(o.line));
  o.slots = (Array.isArray(o.slots) && o.slots.length ? o.slots : f.slots).slice(0, SLOT_COST.length)
    .map(s => ({ type: Math.min(FILETYPES.length - 1, Math.max(0, Math.floor(num(s && s.type, 0)))), done: num(s && s.done, 0) }));
  for (const k of ['ups', 'patched', 'ready', 'wins', 'layout']) if (!o[k] || typeof o[k] !== 'object') o[k] = f[k];
  for (const w of WINS6) if (!o.layout[w.id] || typeof o.layout[w.id] !== 'object') o.layout[w.id] = f.layout[w.id];
  o.name = typeof o.name === 'string' ? o.name.slice(0, 20) : '';
  o.theme = THEMES6[o.theme] ? o.theme : 'default';
  o.track = JUKEBOX.some(([id]) => id === o.track) ? o.track : 'os6';
  o.saver = o.saver !== false;
  o.y2k = !!o.y2k;
  o.unlocked = !!o.unlocked;
  o.on = o.unlocked && o.on !== false;
  return o;
}
const os6On = () => !!(S.os6 && S.os6.unlocked && S.os6.on);

// ---------------------------------------------------------------- formulas
let saver6On = false;
const up6 = id => !!S.os6.ups[id];
const patchedCount = () => SYSTEMS6.filter(s => S.os6.patched[s.id]).length;
const boostOn = () => Date.now() < S.os6.boostUntil;
function dlMult() {
  let m = Math.pow(ACCEL_X, S.os6.accel) * Math.pow(PATCH_X, patchedCount());
  if (up6('accel')) m *= 2;
  if (up6('mirror')) m *= 1.5;
  if (up6('p2p')) m *= 3;
  if (up6('proxy')) m *= 2;
  if (boostOn()) m *= 2;
  if (saver6On) m *= 1.5;
  return m;
}
const slotSpeed = () => LINES6[S.os6.line].kbps * dlMult();
const fileX = t => FILETYPES[t].x * (up6('zip') ? 1.5 : 1);
const typeOpen = t => S.os6.total >= FILETYPES[t].at;
const dropChance = t => (up6('resume') ? 0 : FILETYPES[t].drop);
// average KB per second, all slots (what the files are worth, minus the drops)
const dlRate = () => S.os6.slots.reduce((a, s) => a + slotSpeed() * fileX(s.type) * (1 - dropChance(s.type)), 0);
const accelCost = () => Math.ceil(ACCEL_COST * Math.pow(ACCEL_GROWTH, S.os6.accel));
const slotCost = () => SLOT_COST[S.os6.slots.length];
const y2kReady = () => patchedCount() / SYSTEMS6.length;
// the calendar: 1999 goes by as the library grows
const dayOfYear = () => (S.os6.y2k ? 365 : Math.min(364, Math.floor(364 * Math.log10(Math.max(1, S.os6.total)) / Math.log10(MIDNIGHT_KB))));
function gameDate() {
  if (S.os6.y2k) return '01/01/2000';
  const d = new Date(1999, 0, 1 + dayOfYear());
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/99`;
}
const midnightReady = () => !S.os6.y2k && S.os6.chapter >= 6 && dayOfYear() >= 364 && patchedCount() === SYSTEMS6.length;
const mini6Reward = id => Math.max(30 * Math.pow(4, S.os6.chapter), dlRate() * MINI6[id].secs);
const mini6Ready = id => Date.now() >= (S.os6.ready[id] || 0);
function fmtKB(n) {
  const units = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
  let u = 0;
  while (n >= 1000 && u < units.length - 1) { n /= 1000; u++; }
  return `${n >= 100 || u === 0 && n % 1 === 0 ? fmtPx(n) : n.toFixed(n < 10 ? 2 : 1)} ${units[u]}`;
}

// ---------------------------------------------------------------- simulation + actions
function addKB(n) {
  const o = S.os6;
  o.kb += n; o.total += n;
}
let lastDrop = '';
let os6AutoAcc = 0;
function os6Step(dt) {
  if (!S.os6.unlocked) return;
  const sp = slotSpeed() * dt;
  for (const s of S.os6.slots) {
    s.done += sp;
    const size = FILETYPES[s.type].kb;
    let guard = 0;
    while (s.done >= size && guard++ < 1e4) { // several small files can finish in one step
      s.done -= size;
      if (Math.random() < dropChance(s.type)) { S.os6.drops++; lastDrop = `${FILETYPES[s.type].name}: connection lost at 99%.`; continue; }
      addKB(size * fileX(s.type));
      S.os6.files++;
      if (FILETYPES[s.type].song) S.os6.songs++;
    }
    if (guard >= 1e4) { // huge steps (offline): count the rest on average
      const n = Math.floor(s.done / size);
      s.done -= n * size;
      addKB(n * size * fileX(s.type) * (1 - dropChance(s.type)));
      S.os6.files += n;
      if (FILETYPES[s.type].song) S.os6.songs += n;
    }
  }
  if (saver6On) S.os6.saverTime = (S.os6.saverTime || 0) + dt;
  if (!os6On()) return;
  // the homepage era runs itself now
  os6AutoAcc += dt;
  if (os6AutoAcc >= 1) {
    os6AutoAcc = 0;
    for (let i = BLOCKS.length - 1; i >= 0; i--) buyBlockMax(i);
    for (const u of OPTIMIZE) buyOpt(u.id);
    buyBw(true);
    if (awardGain() >= 4) republish();
    if (!petHappy()) feedPet();
    if (canLink()) linkNext();
  }
}
function buySlot() {
  const c = slotCost();
  if (c === undefined || S.os6.kb < c) return false;
  S.os6.kb -= c;
  S.os6.slots.push({ type: bestType(), done: 0 });
  return true;
}
function buyLine() {
  const l = LINES6[S.os6.line + 1];
  if (!l || S.os6.kb < l.cost) return false;
  S.os6.kb -= l.cost;
  S.os6.line++;
  return true;
}
function buyAccel() {
  const c = accelCost();
  if (S.os6.kb < c) return false;
  S.os6.kb -= c;
  S.os6.accel++;
  return true;
}
function buyUp6(id) {
  const u = UP6.find(x => x.id === id);
  if (!u || up6(id) || S.os6.kb < u.cost) return false;
  S.os6.kb -= u.cost;
  S.os6.ups[id] = true;
  return true;
}
function patch(id) {
  const s = SYSTEMS6.find(x => x.id === id);
  if (!s || S.os6.patched[id] || S.os6.kb < s.cost) return false;
  S.os6.kb -= s.cost;
  S.os6.patched[id] = true;
  return true;
}
const bestType = () => { let t = 0; FILETYPES.forEach((_, i) => { if (typeOpen(i)) t = i; }); return t; };
// change what a slot downloads (the current file is cancelled)
function setSlotType(i, t) {
  const s = S.os6.slots[i];
  if (!s || !typeOpen(t) || s.type === t) return false;
  s.type = t;
  s.done = 0;
  return true;
}
function nameVoice(text) {
  const n = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 20).toUpperCase();
  if (!n) return false;
  S.os6.name = n;
  return true;
}
function mini6Win(id, f) {
  const o = S.os6;
  o.wins[id] = (o.wins[id] || 0) + 1;
  if (!mini6Ready(id)) return 0;
  const n = mini6Reward(id) * f;
  addKB(n);
  o.ready[id] = Date.now() + MINI6[id].cd * 1000;
  return n;
}
// CLIPPO's tips: accept for a small gift (or, after its plan, refuse its reset)
let clipTip = null;
function clipOffer() {
  if (clipTip || !os6On() || S.os6.chapter < 2 || Date.now() < S.os6.clipNext) return;
  clipTip = !S.os6.y2k && S.os6.chapter >= 5 && Math.random() < 0.5 ? CLIP_RESET : pick(CLIP_TIPS);
}
function clipAnswer(yes) {
  const tip = clipTip;
  clipTip = null;
  S.os6.clipNext = Date.now() + (150 + Math.random() * 120) * 1000;
  if (!tip || !yes) return '';
  S.os6.clipTrust++;
  if (tip.give === 'boost') { S.os6.boostUntil = Date.now() + 120000; return 'Downloads x2 for 2 minutes!'; }
  if (tip.give === 'kb') { const n = Math.max(50, dlRate() * 60); addKB(n); return `+${fmtKB(n)}`; }
  return 'reset'; // the voice steps in, nothing is lost
}

// ---------------------------------------------------------------- Falling Blocks
const FB_W = 10, FB_H = 18;
const FB_PIECES = [
  [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[1, 0], [0, 1], [1, 1], [2, 1]],
  [[0, 0], [0, 1], [1, 1], [2, 1]], [[2, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [2, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]],
];
const FB_COLORS = ['#00c0c0', '#c0c000', '#a000c0', '#0000c0', '#c06000', '#00a000', '#c00000'];
let fb = null, fbTimer = null;
function fbNew() {
  clearInterval(fbTimer);
  fb = { grid: Array.from({ length: FB_H }, () => Array(FB_W).fill(-1)), piece: null, lines: 0, score: 0, over: false, running: false, msg: '' };
}
function fbSpawn() {
  const k = Math.floor(Math.random() * FB_PIECES.length);
  fb.piece = { k, cells: FB_PIECES[k].map(([x, y]) => [x + 3, y]) };
  if (!fbFits(fb.piece.cells)) fbEnd();
}
const fbFits = cells => cells.every(([x, y]) => x >= 0 && x < FB_W && y < FB_H && (y < 0 || fb.grid[y][x] < 0));
function fbMove(dx, dy) {
  if (!fb.running || !fb.piece) return false;
  const moved = fb.piece.cells.map(([x, y]) => [x + dx, y + dy]);
  if (fbFits(moved)) { fb.piece.cells = moved; return true; }
  if (dy) fbLock();
  return false;
}
function fbRotate() {
  if (!fb.running || !fb.piece || fb.piece.k === 1) return;
  const [cx, cy] = fb.piece.cells[1];
  const turned = fb.piece.cells.map(([x, y]) => [cx - (y - cy), cy + (x - cx)]);
  for (const kick of [0, -1, 1, -2, 2]) {
    const t = turned.map(([x, y]) => [x + kick, y]);
    if (fbFits(t)) { fb.piece.cells = t; return; }
  }
}
function fbDrop() { if (fb.running) { let g = 0; while (g++ < FB_H && fbMove(0, 1)); } }
function fbLock() {
  for (const [x, y] of fb.piece.cells) if (y >= 0) fb.grid[y][x] = fb.piece.k;
  const full = fb.grid.filter(r => r.every(c => c >= 0)).length;
  fb.grid = fb.grid.filter(r => r.some(c => c < 0));
  while (fb.grid.length < FB_H) fb.grid.unshift(Array(FB_W).fill(-1));
  if (full) { fb.lines += full; fb.score += [0, 100, 300, 500, 800][full]; Music.fx('save'); }
  S.os6.bestLines = Math.max(S.os6.bestLines, full === 4 ? 4 : S.os6.bestLines);
  fbSpawn();
}
function fbStart() {
  fbNew();
  fb.running = true;
  fbSpawn();
  fbTimer = setInterval(() => { if (fb.running) { fbMove(0, 1); fbDraw(); } }, 520);
  fbDraw();
}
function fbEnd() {
  fb.running = false; fb.over = true;
  clearInterval(fbTimer);
  if (fb.lines < 3) { fb.msg = `Game over: ${fb.lines} lines. Clear 3 or more for a reward.`; return; }
  const n = mini6Win('blocks', Math.min(1.5, fb.lines / 10));
  fb.msg = `Game over: ${fb.lines} lines, ${fb.score} points. ${n ? `+${fmtKB(n)}` : '(reward still recharging)'}`;
}
function fbDraw() {
  const cv = $('o6Fb');
  if (!cv || !fb) return;
  const g = cv.getContext('2d'), c = 12;
  g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
  const cell = (x, y, col) => { g.fillStyle = col; g.fillRect(x * c + 1, y * c + 1, c - 2, c - 2); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x * c + 1, y * c + 1, c - 2, 2); };
  fb.grid.forEach((r, y) => r.forEach((k, x) => { if (k >= 0) cell(x, y, FB_COLORS[k]); }));
  if (fb.piece) for (const [x, y] of fb.piece.cells) if (y >= 0) cell(x, y, FB_COLORS[fb.piece.k]);
  setText($('o6FbInfo'), fb.msg || (fb.running ? `Lines ${fb.lines} · ${fb.score} pts` : 'Arrows or the buttons: move, rotate, drop.'));
}

// ---------------------------------------------------------------- Date Bug Hunt
const BUG_LINES = [
  ['year = 99;', true], ['if (yy > 98) century = 19;', true], ['print("12/31/" + yy);', true], ['date = "01/01/00";', true],
  ['age = 99 - birth;', true], ['expires = yy + 1;', true], ['if (year == 00) panic();', true], ['sort(by: "yy")', true],
  ['year = 1999;', false], ['next = year + 1;  // 2000', false], ['print(dd + "/" + mm + "/" + yyyy);', false],
  ['if (yyyy >= 2000) party();', false], ['days = 365;', false], ['counter++;', false], ['name = player.line;', false], ['century = 20;', false],
];
let bug = null;
function bugNew() {
  const lines = [...BUG_LINES].sort(() => Math.random() - 0.5).slice(0, 8);
  if (!lines.some(l => l[1])) lines[0] = BUG_LINES[0];
  bug = { round: (bug && !bug.over ? bug.round : 0) + 1, lines: lines.map(([t, b]) => ({ t, b, hit: false })), mistakes: bug && !bug.over ? bug.mistakes : 0, found: bug && !bug.over ? bug.found : 0, over: false, msg: '' };
}
function bugClick(i) {
  const l = bug.lines[i];
  if (bug.over || l.hit) return;
  l.hit = true;
  if (l.b) bug.found++; else bug.mistakes++;
  if (bug.lines.every(x => !x.b || x.hit)) {
    if (bug.round >= 3) {
      bug.over = true;
      const n = bug.mistakes <= 2 ? mini6Win('bugs', Math.max(0.4, 1 - bug.mistakes * 0.2)) : 0;
      bug.msg = bug.mistakes <= 2 ? `All dates fixed with ${bug.mistakes} mistake(s). ${n ? `+${fmtKB(n)}` : '(reward still recharging)'}` : `Too many mistakes (${bug.mistakes}). Try again?`;
    } else { bugNew(); bug.msg = `Round ${bug.round} of 3.`; }
  }
}
function bugHTML() {
  return `<div class="mini-head"><span>Round ${bug.round}/3 · fixed ${bug.found} · mistakes ${bug.mistakes}</span>
      <button type="button" class="gbtn" data-o6="bugnew">New hunt</button></div>
    <div class="code">${bug.lines.map((l, i) => `<button type="button" class="cl${l.hit ? (l.b ? ' fixed' : ' wrong') : ''}" data-o6="bug:${i}">${esc(l.t)}</button>`).join('')}</div>
    <p class="mini-msg">${esc(bug.msg || 'Click every line that stores a year with only two digits. Leave the safe ones alone.')}</p>`;
}

// ---------------------------------------------------------------- Pop-up Storm
const POP_SECS = 30, POP_MAX = 10;
const POP_TEXT = ['It looks like you\'re closing pop-ups!', 'Did you know? Paperclips love you!', 'Tip: tips are helpful!', 'It looks like you need a tip!',
  'Would you like help with that?', 'Have you tried turning it off and on?', 'It looks like you\'re busy!', 'Fun fact: I am a paperclip!'];
let pop = null, popTimer = null;
function popNew() { clearInterval(popTimer); pop = { items: [], t: 0, next: 0, closed: 0, running: false, over: false, msg: '', id: 0 }; }
function popStart() {
  popNew();
  pop.running = true;
  popTimer = setInterval(() => {
    pop.t += 0.1;
    if (pop.t >= pop.next) {
      pop.items.push({ id: ++pop.id, x: Math.random() * 0.62, y: Math.random() * 0.7, text: pick(POP_TEXT) });
      pop.next = pop.t + Math.max(0.35, 1.3 - pop.t / 30);
    }
    if (pop.items.length > POP_MAX) popEnd(false);
    else if (pop.t >= POP_SECS) popEnd(true);
    mini6Draw('pops');
  }, 100);
}
function popEnd(won) {
  pop.running = false; pop.over = true;
  clearInterval(popTimer);
  if (!won) { pop.msg = 'Too many pop-ups! CLIPPO wins this round.'; return; }
  const n = mini6Win('pops', Math.min(1.3, 0.5 + pop.closed / 40));
  pop.msg = `You closed ${pop.closed} pop-ups! ${n ? `+${fmtKB(n)}` : '(reward still recharging)'}`;
}
function popClose(id) {
  if (!pop.running) return;
  const before = pop.items.length;
  pop.items = pop.items.filter(p => p.id !== id);
  if (pop.items.length < before) pop.closed++;
}
function popHTML() {
  return `<div class="mini-head"><span>${pop.running ? `${Math.ceil(POP_SECS - pop.t)}s · ${pop.items.length}/${POP_MAX} open · ${pop.closed} closed` : 'CLIPPO is feeling helpful.'}</span>
      <button type="button" class="gbtn" data-o6="popstart">${pop.running ? 'Restart' : 'Start'}</button></div>
    <div class="popbox">${pop.items.map(p => `<div class="popup" style="left:${(p.x * 100).toFixed(1)}%;top:${(p.y * 100).toFixed(1)}%">
      <div class="pp-title"><span>\u{1F4CE} Tip</span><button type="button" data-o6="pop:${p.id}" aria-label="Close">✕</button></div><p>${esc(p.text)}</p></div>`).join('')}</div>
    <p class="mini-msg">${esc(pop.msg || `Close the pop-ups with their ✕. More than ${POP_MAX} open at once and you lose.`)}</p>`;
}

const MINI6_HTML = { bugs: bugHTML, pops: popHTML };
function mini6Draw(id) {
  if (id === 'blocks') { fbDraw(); return; }
  const box = $(`o6-${id}-board`);
  if (box && os6Built) box.innerHTML = MINI6_HTML[id]();
}

// ---------------------------------------------------------------- the desktop
let os6Built = false, os6Shown = false, o6Bound = [];
const o6Sig = {};
let start6Open = false, clipMsg = '', clipMsgUntil = 0;
const os6Narrow = () => !!(window.matchMedia && matchMedia('(max-width: 700px)').matches);

const O6_TEXT = {
  kb: () => fmtKB(S.os6.kb),
  rate: () => `+${fmtKB(dlRate())}/s`,
  date: () => gameDate(),
  title: id => WIN6[id].title(),
  slot: i => { const s = S.os6.slots[i]; return s ? `${FILETYPES[s.type].name} · ${fmtKB(Math.min(s.done, FILETYPES[s.type].kb))} of ${fmtKB(FILETYPES[s.type].kb)} · ${fmtTime(Math.max(0, (FILETYPES[s.type].kb - s.done) / slotSpeed()))} left` : ''; },
  dlinfo: () => `${S.os6.slots.length} slot(s) on ${LINES6[S.os6.line].name} · ${fmtKB(slotSpeed())}/s each · ${fmtPx(S.os6.files)} files · ${fmtPx(S.os6.songs)} songs`,
  drop: () => lastDrop,
  slotbtn: () => (slotCost() === undefined ? 'All slots open' : `New slot · ${fmtKB(slotCost())}`),
  linebtn: () => (LINES6[S.os6.line + 1] ? `Get ${LINES6[S.os6.line + 1].name} · ${fmtKB(LINES6[S.os6.line + 1].cost)}` : 'Fastest line'),
  accelbtn: () => `Tune TCP/IP (lvl ${S.os6.accel}) · ${fmtKB(accelCost())}`,
  uc: id => (up6(id) ? '✓ Installed' : fmtKB(UP6.find(u => u.id === id).cost)),
  pc: id => (S.os6.patched[id] ? '✓ Y2K ready' : `Patch · ${fmtKB(SYSTEMS6.find(s => s.id === id).cost)}`),
  y2kinfo: () => `${Math.round(y2kReady() * 100)}% Y2K ready · each patch: downloads x${PATCH_X}`,
  midnight: () => (S.os6.y2k ? 'Happy new year! The counters held.' : midnightReady() ? 'Everything is patched. It is December 31st.' :
    `${gameDate()} · ${S.os6.chapter < 6 ? 'the story is still going' : dayOfYear() < 364 ? 'not December 31st yet' : 'patch every system first'}`),
  mini: id => (mini6Ready(id) ? `Win: +${fmtKB(mini6Reward(id))}` : `Reward recharging: ${fmtTime(Math.ceil(((S.os6.ready[id] || 0) - Date.now()) / 1000))}`),
  jb: () => { const k = JUKEBOX.findIndex(([id]) => id === S.os6.track); return `[${String(k + 1).padStart(2, '0')}] ${JUKEBOX[k][1]}`; },
  jbstate: () => (S.opts.music ? '▶' : '❚❚'),
  boost: () => (boostOn() ? `CLIPPO boost: x2 for ${fmtTime(Math.ceil((S.os6.boostUntil - Date.now()) / 1000))}` : ''),
};
const O6_DIS = {
  slot: () => slotCost() === undefined || S.os6.kb < slotCost(),
  line: () => !LINES6[S.os6.line + 1] || S.os6.kb < LINES6[S.os6.line + 1].cost,
  accel: () => S.os6.kb < accelCost(),
  up: id => up6(id) || S.os6.kb < UP6.find(u => u.id === id).cost,
  patch: id => !!S.os6.patched[id] || S.os6.kb < SYSTEMS6.find(s => s.id === id).cost,
  midnight: () => !midnightReady(),
};
const O6_W = {
  slot: i => { const s = S.os6.slots[i]; return s ? Math.min(1, s.done / FILETYPES[s.type].kb) : 0; },
  y2k: () => y2kReady(),
  year: () => dayOfYear() / 365,
};
function o6Bind() {
  o6Bound = [];
  for (const el of document.querySelectorAll('#os6 [data-x], #os6 [data-xd], #os6 [data-xw]')) {
    for (const [attr, kind] of [['x', 't'], ['xd', 'd'], ['xw', 'w']]) {
      const v = el.dataset[attr];
      if (v) { const [k, a] = v.split(':'); o6Bound.push([el, kind, k, argOf(a)]); }
    }
  }
}
function o6Refresh() {
  for (const [el, kind, k, a] of o6Bound) {
    if (kind === 't') setText(el, O6_TEXT[k](a));
    else if (kind === 'd') { const dis = !!O6_DIS[k](a); if (el.disabled !== dis) el.disabled = dis; }
    else { const w = pct(O6_W[k](a)); if (el.style.width !== w) el.style.width = w; }
  }
}
const icon6 = id => `<i class="i6 i6-${id}">${(THEMES6[S.os6.theme] || THEMES6.default).icons[id]}</i>`;

function win6Body(id) {
  switch (id) {
    case 'dl': return `<p class="dim" data-x="dlinfo"></p><div id="o6Slots"></div><p class="dropline" data-x="drop"></p>
      <div class="btnrow"><button type="button" class="gbtn" data-o6="slot" data-xd="slot" data-x="slotbtn"></button>
        <button type="button" class="gbtn" data-o6="line" data-xd="line" data-x="linebtn"></button>
        <button type="button" class="gbtn" data-o6="accel" data-xd="accel" data-x="accelbtn"></button></div>
      <p class="boostline" data-x="boost"></p>
      <fieldset class="cp"><legend>Programs</legend><div id="o6Ups"></div></fieldset>`;
    case 'y2k': return `<p data-x="y2kinfo"></p><div class="meter6"><i data-xw="y2k"></i></div>
      <div id="o6Sys"></div>
      <fieldset class="cp"><legend>1999</legend><div class="yearbar"><i data-xw="year"></i></div>
        <p data-x="midnight"></p><button type="button" class="gbtn big" data-o6="midnight" data-xd="midnight">Wait for midnight</button></fieldset>`;
    case 'lib': return `<div class="cd-led"><span data-x="jb"></span><span data-x="jbstate"></span></div>
      <div class="btnrow"><button type="button" class="gbtn" data-o6="trk:-1" aria-label="Previous">⏮</button>
        <button type="button" class="gbtn" data-o6="music" aria-label="Play or pause">⏯</button>
        <button type="button" class="gbtn" data-o6="trk:1" aria-label="Next">⏭</button></div>
      <p class="dim">Every 3 songs you download unlock a track.</p><div class="tracks" id="o6Tracks"></div>`;
    case 'disp': return `<div class="disp"><div class="monitor"><div class="mon-screen" id="o6Preview"><i></i><i></i></div><div class="mon-base"></div></div>
      <div class="themes" id="o6Themes"></div></div>
      <div class="btnrow"><button type="button" class="gbtn big" data-o6="apply" id="o6Apply">Apply</button>
        <button type="button" class="gbtn" data-o6="saver" id="o6SaverBtn">Screensaver</button></div>
      <p class="dim">Themes come from your process skins: unlock more with achievements. Applying one renames your processes too.</p>`;
    case 'blocks': return `<p class="mini-reward" data-x="mini:blocks"></p>
      <canvas id="o6Fb" width="${FB_W * 12}" height="${FB_H * 12}" aria-label="falling blocks"></canvas>
      <div class="fb-btns"><button type="button" class="gbtn" data-o6="fb:l">◀</button><button type="button" class="gbtn" data-o6="fb:r">↻</button>
        <button type="button" class="gbtn" data-o6="fb:d">▼</button><button type="button" class="gbtn" data-o6="fb:x">▶</button></div>
      <p class="mini-msg" id="o6FbInfo"></p><button type="button" class="gbtn" data-o6="fbstart">New game</button>`;
    case 'bugs': case 'pops': return `<p class="mini-reward" data-x="mini:${id}"></p><div id="o6-${id}-board"></div>`;
    case 'comp': return `<p>Drives</p><div class="drives">
      ${[['1', 'INCR10 (A:)', 'the terminal'], ['2', 'INCR20 (C:)', 'the graphical environment'], ['3', 'INCR30 (D:)', 'behind the door'], ['4', 'INCR40 (E:)', 'the modem'], ['5', 'INCR50 (F:)', 'the homepage']].map(([e, n, d]) =>
        `<button type="button" class="drive" data-o6="visit:${e}"><i class="i5 i-drive"></i><span>${n}</span><small>${d}</small></button>`).join('')}</div>
      <p class="dim">Every old era waits as you left it, and keeps running. Come back with /win6 or the "INCR.OS 6.0" button.</p>`;
  }
  return '';
}

function os6Build() {
  if (os6Built) return;
  os6Built = true;
  $('os6').innerHTML = `
    <div class="o6-desk" id="o6Desk">
      <div class="o6-icons" id="o6Icons"></div>
      ${WINS6.map(w => `
      <section class="w6win hidden" id="w6-${w.id}" data-win="${w.id}" aria-label="${w.label}">
        <div class="w6-title"><span class="w6-ico" data-ico="${w.id}"></span><span class="w6-name" data-x="title:${w.id}"></span>
          <button type="button" class="w6-btn" data-o6="min:${w.id}" aria-label="Minimize">_</button>
          <button type="button" class="w6-btn" data-o6="close:${w.id}" aria-label="Close">✕</button></div>
        <div class="w6-body">${win6Body(w.id)}</div>
      </section>`).join('')}
      <div class="pet6" id="o6Pet" data-o6="pet"><canvas width="16" height="14" id="o6PetSprite"></canvas><span class="pet-say hidden" id="o6PetSay"></span></div>
      <div class="clippo hidden" id="o6Clip"><div class="clip-art">\u{1F4CE}</div><div class="clip-bubble"><p id="o6ClipText"></p>
        <div class="btnrow" id="o6ClipBtns"><button type="button" class="gbtn" data-o6="clip:1">Yes, please</button><button type="button" class="gbtn" data-o6="clip:0">No thanks</button></div></div></div>
      <div id="o6Dlg" class="o6-dlg hidden" role="dialog" aria-live="polite">
        <div class="dlg-who" id="o6Who"></div><div class="dlg-text" id="o6Say"></div>
        <form class="dlg-ask hidden" id="o6Ask"><input id="o6Name" maxlength="20" autocomplete="off" placeholder="a name" aria-label="the voice's name">
          <button type="submit" class="gbtn">OK</button></form>
        <div class="dlg-next" id="o6Next">click to continue &#9660;</div>
      </div>
      <canvas id="o6Saver" class="o6-saver hidden" aria-hidden="true"></canvas>
      <div class="midnight hidden" id="o6Mid"><div id="o6MidText"></div></div>
    </div>
    <div class="startmenu6 hidden" id="o6Start">
      <div class="sm-side6">INCR.OS <b>6.0</b></div>
      <div class="sm-items" id="o6StartItems"></div>
    </div>
    <footer class="taskbar6">
      <button type="button" class="startbtn6" data-o6="start" id="o6StartBtn"><b>❖</b> Start</button>
      <div class="quick"><button type="button" data-o6="open:dl" title="Downloads" data-ico="dl"></button><button type="button" data-o6="open:lib" title="Jukebox" data-ico="lib"></button></div>
      <div class="tasks" id="o6Tasks"></div>
      <div class="tray6"><span class="tray-hits"><b data-x="kb"></b> <span data-x="rate"></span></span>
        <button type="button" class="traybtn" data-o6="music" id="o6Music" aria-label="Music on/off">&#9835;</button>
        <span class="tray-date" data-x="date" title="the computer's clock: two-digit year"></span></div>
    </footer>`;
  fbNew(); bugNew(); popNew();
  for (const id of ['bugs', 'pops']) mini6Draw(id);
  o6Bind();
}

// pets: the 5.0 daemon, or what the theme turns it into
function drawPet6() {
  const cv = $('o6PetSprite'), g = cv.getContext('2d');
  g.clearRect(0, 0, 16, 14);
  const kind = (THEMES6[S.os6.theme] || THEMES6.default).pet;
  if (PET_ART[kind]) {
    PET_ART[kind].forEach((row, y) => [...row.padEnd(16, '.')].slice(0, 16).forEach((ch, x) => {
      if (ch !== '.') { g.fillStyle = COLORS[parseInt(ch, 16)].hex; g.fillRect(x, y, 1, 1); }
    }));
    return;
  }
  const tint = DAEMON_TINT[kind] || {}, art = picArt(1);
  for (let y = 0; y < 14; y++) for (let x = 0; x < 16; x++) {
    let c = art[(y + 1) * PIC_W + x + 4].toString(16);
    if (c === '0') continue;
    c = tint[c] || c;
    g.fillStyle = COLORS[parseInt(c, 16)].hex;
    g.fillRect(x, y, 1, 1);
  }
}
let previewTheme = null;
function applyTheme6(key) {
  if (!THEMES6[key] || !skinOpen(key)) return false;
  S.os6.theme = key;
  S.skin = key; // the processes are renamed by the same skin
  return true;
}

// windows (same as 5.0)
function o6Top() {
  let best = null;
  for (const w of WINS6) {
    const l = S.os6.layout[w.id];
    if (l.open && !l.min && (!best || l.z > S.os6.layout[best].z)) best = w.id;
  }
  return best;
}
function o6Focus(id) {
  const l = S.os6.layout[id];
  l.min = false;
  if (o6Top() !== id || WINS6.some(w => w.id !== id && S.os6.layout[w.id].z >= l.z)) l.z = ++S.os6.zTop;
  o6Layout();
}
function o6Open(id) { S.os6.layout[id].open = true; o6Focus(id); if (id === 'blocks') fbDraw(); }
function o6Close(id) { S.os6.layout[id].open = false; o6Layout(); }
function o6Min(id) { S.os6.layout[id].min = true; o6Layout(); }
function o6Layout() {
  if (!os6Built) return;
  const area = $('o6Desk'), narrow = os6Narrow(), top = o6Top();
  $('os6').classList.toggle('narrow', narrow);
  for (const w of WINS6) {
    const el = $(`w6-${w.id}`), l = S.os6.layout[w.id];
    el.classList.toggle('hidden', !l.open || l.min);
    el.classList.toggle('active', w.id === top);
    el.style.zIndex = l.z;
    if (narrow || !l.open || l.min) { el.style.left = el.style.top = ''; continue; }
    const W = area.clientWidth, H = area.clientHeight;
    el.style.left = `${Math.max(0, Math.min(l.x * W, W - el.offsetWidth))}px`;
    el.style.top = `${Math.max(0, Math.min(l.y * H, H - 48))}px`;
  }
  const open = WINS6.filter(w => S.os6.layout[w.id].open);
  const sig = open.map(w => w.id + (w.id === top ? '*' : '')).join() + S.os6.theme;
  if (o6Sig.tasks !== sig) {
    o6Sig.tasks = sig;
    $('o6Tasks').innerHTML = open.map(w => `<button type="button" class="taskbtn${w.id === top ? ' on' : ''}" data-o6="task:${w.id}">${icon6(w.id)}<span>${w.label}</span></button>`).join('');
  }
}

function rebuild6(key, sig, box, html) {
  if (o6Sig[key] === sig || !box) return false;
  o6Sig[key] = sig;
  box.innerHTML = html();
  return true;
}
function os6Lists() {
  const o = S.os6;
  let changed = false;
  // the theme: wallpaper and colors (CSS), icons and pet (drawn here)
  if (o6Sig.theme !== o.theme) {
    o6Sig.theme = o.theme;
    $('os6').dataset.theme6 = o.theme;
    $('o6Icons').innerHTML = DESK6.map(id => `<button type="button" class="dicon" data-o6="open:${id}">${icon6(id)}<span>${WIN6[id].label}</span></button>`).join('');
    $('o6StartItems').innerHTML = ['dl', 'y2k', 'lib', 'disp', 'blocks', 'bugs', 'pops', 'comp'].map(id => `<button type="button" data-o6="open:${id}">${icon6(id)}<span>${WIN6[id].label}</span></button>`).join('') +
      `<hr><button type="button" data-o6="ach"><i class="i6">★</i><span>Achievements</span></button>
       <button type="button" data-o6="shutdown"><i class="i6">⏻</i><span>Shut Down...</span></button>`;
    for (const el of document.querySelectorAll('#os6 [data-ico]')) el.innerHTML = icon6(el.dataset.ico);
    drawPet6();
    o6Sig.tasks = '';
    changed = true;
  }
  const types = FILETYPES.map((_, t) => +typeOpen(t)).join('');
  changed = rebuild6('slots', `${o.slots.length}|${types}|${o.slots.map(s => s.type)}`, $('o6Slots'), () => o.slots.map((s, i) => `
    <div class="slot6"><div class="sl-top"><span data-x="slot:${i}"></span>
      <select data-slot="${i}" aria-label="file to download">${FILETYPES.map((f, t) => typeOpen(t) ? `<option value="${t}"${t === s.type ? ' selected' : ''}>${f.name} (${fmtKB(f.kb)}, x${f.x}${f.drop ? `, ${Math.round(f.drop * 100)}% drop` : ''})</option>` : '').join('')}</select></div>
      <div class="dlbar"><i data-xw="slot:${i}"></i></div></div>`).join('')) || changed;
  changed = rebuild6('ups', UP6.map(u => +up6(u.id)).join(''), $('o6Ups'), () => UP6.map(u => `
    <div class="prog"><div class="pg-info"><b>${u.name}</b><div class="dim">${u.desc}</div></div>
      <div class="pg-btns"><button type="button" class="gbtn" data-o6="up:${u.id}" data-xd="up:${u.id}" data-x="uc:${u.id}"></button></div></div>`).join('')) || changed;
  changed = rebuild6('sys', SYSTEMS6.map(s => +!!o.patched[s.id]).join(''), $('o6Sys'), () => SYSTEMS6.map(s => `
    <div class="prog sys6${o.patched[s.id] ? ' ok' : ''}"><div class="pg-info"><b>${s.name}</b> <span class="dim">${o.patched[s.id] ? '4-digit years' : 'stores 2-digit years'}</span></div>
      <div class="pg-btns"><button type="button" class="gbtn" data-o6="patch:${s.id}" data-xd="patch:${s.id}" data-x="pc:${s.id}"></button></div></div>`).join('')) || changed;
  changed = rebuild6('tracks', `${o.track}|${Math.min(JUKEBOX.length, Math.floor(o.songs / 3))}`, $('o6Tracks'), () => JUKEBOX.map(([id, name], k) => (o.songs >= trackNeeds(k)
    ? `<button type="button" class="trk${id === o.track ? ' on' : ''}" data-o6="track:${k}">${k + 1}. ${name}</button>`
    : `<button type="button" class="trk" disabled>${k + 1}. ??? (download ${trackNeeds(k)} songs)</button>`)).join('')) || changed;
  const sel = previewTheme || o.theme;
  rebuild6('themes', `${sel}|${o.theme}|${Object.keys(THEMES6).map(k => +skinOpen(k)).join('')}`, $('o6Themes'), () => Object.keys(THEMES6).map(k => {
    const open = skinOpen(k), ach = SKINS[k] && SKINS[k].unlock && ACH.find(a => a.id === SKINS[k].unlock);
    return `<button type="button" class="theme${k === sel ? ' on' : ''}" data-o6="theme:${k}"${open ? '' : ' disabled'}>${THEMES6[k].name}${k === o.theme ? ' (current)' : ''}${open ? '' : ` · locked: "${ach ? ach.name : '?'}"`}</button>`;
  }).join(''));
  $('o6Preview').dataset.theme6 = sel;
  $('o6Apply').disabled = sel === o.theme;
  if (changed) o6Bind();
}

function os6Render() {
  const on = os6On() && !setup6Running;
  const was = os6Shown;
  os6Shown = on;
  if (on) $('app').classList.add('hidden');
  if (on !== was) {
    $('os6').classList.toggle('hidden', !on);
    document.body.classList.toggle('os6-mode', on);
    if (on) { os6Build(); o6Layout(); }
    else if (!introRunning && !os3On() && !os4Live() && !os5Live()) $('app').classList.remove('hidden');
    if (!on) stopSaver6();
  }
  if (!on) return;
  os6Lists();
  o6Refresh();
  $('o6Music').classList.toggle('off', !S.opts.music);
  $('o6Start').classList.toggle('hidden', !start6Open);
  $('o6StartBtn').classList.toggle('on', start6Open);
  setText($('o6SaverBtn'), `Screensaver: ${S.os6.saver ? 'On' : 'Off'}`);
  pet6Tick();
  // CLIPPO pops up now and then
  clipOffer();
  const clip = $('o6Clip');
  const showMsg = Date.now() < clipMsgUntil;
  clip.classList.toggle('hidden', !(clipTip || showMsg) || !!dlg6);
  if (clipTip) { setText($('o6ClipText'), clipTip.text); $('o6ClipBtns').classList.remove('hidden'); }
  else if (showMsg) { setText($('o6ClipText'), clipMsg); $('o6ClipBtns').classList.add('hidden'); }
  saver6Check();
  const c = S.os6.chapter;
  const due = c === 0 || (c === 1 && S.os6.name) || (c >= 2 && c <= 5 && S.os6.total >= STAGES6[c]) || (c === 6 && S.os6.y2k);
  if (!dlg6 && !midRunning && c < CHAPTERS6.length && due) startChapter6(c);
}

// ---------------------------------------------------------------- the pet
const pet6 = { x: 200, dir: 1, sit: 0, sayUntil: 0 };
const PET6_LINES = {
  daemon: ['fork()!', 'happy 1999', 'is it 2000 yet?'], toaster: ['*ding*', 'toast?', 'i am warm'], alien: ['take me to your sysop', 'beep boop', '2000 is just a number'],
  dragon: ['rawr (politely)', 'i guard the hard drive', 'hoard: 0 bytes lost'], cat: ['meow', 'purr...', '*knocks paperclip off the desk*'], leet: ['h4ppy n3w y34r', '1337', 'r00t'],
};
function pet6Tick() {
  const el = $('o6Pet');
  const W = $('o6Desk').clientWidth;
  if (pet6.sit > 0) pet6.sit--;
  else {
    pet6.x += pet6.dir * 1.1;
    if (pet6.x < 4 || pet6.x > W - 40) pet6.dir *= -1;
    if (Math.random() < 0.006) pet6.sit = 40 + Math.random() * 80;
  }
  pet6.x = Math.max(4, Math.min(W - 40, pet6.x));
  el.style.transform = `translateX(${Math.round(pet6.x)}px)`;
  el.style.setProperty('--dir', pet6.dir);
  el.classList.toggle('walk', pet6.sit <= 0);
  if (Date.now() > pet6.sayUntil) $('o6PetSay').classList.add('hidden');
}
function pet6Say() {
  const box = $('o6PetSay');
  box.textContent = pick(PET6_LINES[(THEMES6[S.os6.theme] || THEMES6.default).pet] || PET6_LINES.daemon);
  box.classList.remove('hidden');
  pet6.sayUntil = Date.now() + 2500;
}

// ---------------------------------------------------------------- dialogue
let dlg6 = null;
function startChapter6(k) {
  if (!os6Built) return;
  dlg6 = { k, i: 0, text: '', n: 0, timer: null };
  $('o6Dlg').classList.remove('hidden');
  dlg6Show();
}
function dlg6Show() {
  const [who, t] = CHAPTERS6[dlg6.k][dlg6.i];
  dlg6.text = typeof t === 'function' ? t() : t;
  dlg6.n = 0;
  $('o6Dlg').className = `o6-dlg ${who === 'ask' ? 'sys' : who}`;
  setText($('o6Who'), { you: 'YOU', sys: voiceName(), ask: voiceName(), clip: clippoName, news: 'NEWS' }[who]);
  setText($('o6Say'), '');
  $('o6Ask').classList.add('hidden');
  $('o6Next').classList.remove('hidden');
  clearInterval(dlg6.timer);
  const fast = reduceMotion();
  dlg6.timer = setInterval(() => {
    dlg6.n = fast ? dlg6.text.length : dlg6.n + 1;
    setText($('o6Say'), dlg6.text.slice(0, dlg6.n));
    if (dlg6.n % 3 === 1 && dlg6.text[dlg6.n - 1] !== ' ') Music.fx(who === 'you' || who === 'clip' ? 'voice' : 'voice-sys');
    if (dlg6.n >= dlg6.text.length) dlg6Typed();
  }, 28);
}
function dlg6Typed() {
  clearInterval(dlg6.timer);
  dlg6.timer = null;
  setText($('o6Say'), dlg6.text);
  if (CHAPTERS6[dlg6.k][dlg6.i][0] === 'ask') {
    $('o6Ask').classList.remove('hidden');
    $('o6Next').classList.add('hidden');
    $('o6Name').focus();
  }
}
function dlg6Next() {
  if (!dlg6) return;
  if (dlg6.timer) { dlg6Typed(); return; }
  if (CHAPTERS6[dlg6.k][dlg6.i][0] === 'ask') return;
  if (++dlg6.i < CHAPTERS6[dlg6.k].length) { dlg6Show(); return; }
  S.os6.chapter = dlg6.k + 1;
  closeDialogue6();
  save(true);
}
function closeDialogue6() {
  if (!dlg6) return;
  clearInterval(dlg6.timer);
  dlg6 = null;
  $('o6Dlg').classList.add('hidden');
}

// ---------------------------------------------------------------- midnight
// a countdown, then every era flickers past with its counter rolling to 00, then 2000
let midRunning = false;
const MID_ERAS = [
  ['mid-term', 'BYTES 99 → 00'], ['mid-win1', 'INCR.OS 2.0 · KERNELS 99 → 00'], ['mid-os3', 'PIXELS 99 → 00'],
  ['mid-os4', 'SIGNAL 99 → 00'], ['mid-os5', 'HITS 0000099 → 0000000'], ['mid-os6', 'DOWNLOADS 99 → 00'],
];
function playMidnight() {
  if (midRunning || !midnightReady()) return;
  midRunning = true;
  closeAchMenu();
  const box = $('o6Mid'), txt = $('o6MidText');
  box.classList.remove('hidden');
  box.className = 'midnight';
  Music.hold(true);
  const fast = reduceMotion();
  let n = 10;
  const count = () => {
    setText(txt, `12/31/99 23:59:${String(60 - n).padStart(2, '0')}\n${n}`);
    Music.fx('voice-sys');
    if (n-- > 0) { setTimeout(count, fast ? 50 : 900); return; }
    let k = 0;
    const flick = () => {
      if (k < MID_ERAS.length) {
        box.className = `midnight ${MID_ERAS[k][0]}`;
        setText(txt, MID_ERAS[k][1]);
        Music.fx('voice');
        k++;
        setTimeout(flick, fast ? 50 : 420);
        return;
      }
      box.className = 'midnight mid-2000';
      setText(txt, '01/01/2000\n00:00:00');
      Music.fx('start5');
      setTimeout(() => {
        box.classList.add('hidden');
        S.os6.y2k = true;
        S.os6.track = 'y2k';
        midRunning = false;
        Music.hold(false);
        checkAch();
        save(true);
      }, fast ? 300 : 3200);
    };
    flick();
  };
  count();
}

// ---------------------------------------------------------------- screensaver: flying windows
let saver6Raf = null, lastInput6 = Date.now();
function saver6Check() {
  if (!saver6On && S.os6.saver && !dlg6 && !midRunning && !achMenu && !(fb && fb.running) && !(pop && pop.running) && Date.now() - lastInput6 > SAVER_IDLE * 1000) startSaver6();
}
function startSaver6() {
  if (saver6On) return;
  saver6On = true;
  const cv = $('o6Saver');
  cv.classList.remove('hidden');
  cv.width = cv.clientWidth || 640; cv.height = cv.clientHeight || 400;
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  const flyers = Array.from({ length: 40 }, () => ({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: Math.random() * 4 + 0.2 }));
  const COLS = ['#c00000', '#00a000', '#0000c0', '#c0c000'];
  const frame = () => {
    if (!saver6On) return;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    for (const f of flyers) {
      f.z -= 0.025;
      if (f.z < 0.1) { f.x = (Math.random() - 0.5) * 2; f.y = (Math.random() - 0.5) * 2; f.z = 4; }
      const s = 1 / f.z, px = W / 2 + f.x * s * W * 0.3, py = H / 2 + f.y * s * H * 0.3, size = 10 * s;
      for (let q = 0; q < 4; q++) { g.fillStyle = COLS[q]; g.fillRect(px + (q % 2) * size * 0.55, py + Math.floor(q / 2) * size * 0.55, size * 0.5, size * 0.5); }
    }
    saver6Raf = requestAnimationFrame(frame);
  };
  frame();
}
function stopSaver6() {
  if (!saver6On) return;
  saver6On = false;
  cancelAnimationFrame(saver6Raf);
  $('o6Saver').classList.add('hidden');
}

// ---------------------------------------------------------------- actions
function os6Act(act) {
  const [k, a] = act.split(':');
  const i = +a;
  if (k !== 'start') start6Open = false;
  switch (k) {
    case 'start': start6Open = !start6Open; break;
    case 'open': o6Open(a); break;
    case 'close': o6Close(a); break;
    case 'min': o6Min(a); break;
    case 'task': if (o6Top() === a) o6Min(a); else o6Focus(a); break;
    case 'slot': buySlot(); break;
    case 'line': buyLine(); break;
    case 'accel': buyAccel(); break;
    case 'up': buyUp6(a); break;
    case 'patch': if (patch(a)) Music.fx('save'); break;
    case 'midnight': playMidnight(); break;
    case 'theme': previewTheme = a; break;
    case 'apply': if (previewTheme && applyTheme6(previewTheme)) { previewTheme = null; Music.chime(); } break;
    case 'saver': S.os6.saver = !S.os6.saver; break;
    case 'track': S.os6.track = JUKEBOX[i][0]; if (!S.opts.music) $('musicBtn').click(); break;
    case 'trk': {
      const open = JUKEBOX.filter((_, k2) => S.os6.songs >= trackNeeds(k2));
      const n = open.findIndex(([id]) => id === S.os6.track);
      S.os6.track = open[(n + i + open.length) % open.length][0];
      break;
    }
    case 'music': $('musicBtn').click(); break;
    case 'pet': pet6Say(); break;
    case 'clip': {
      const r = clipAnswer(a === '1');
      clipMsg = r === 'reset' ? `${voiceName()} closes the dialog before you can blink. "NOT TODAY, ${clippoName}."` : r || 'Okay! Maybe later!';
      clipMsgUntil = Date.now() + 3500;
      break;
    }
    case 'fb': if (a === 'l') fbMove(-1, 0); else if (a === 'x') fbMove(1, 0); else if (a === 'r') fbRotate(); else fbDrop(); fbDraw(); break;
    case 'fbstart': fbStart(); break;
    case 'bug': bugClick(i); mini6Draw('bugs'); break;
    case 'bugnew': bug = null; bugNew(); mini6Draw('bugs'); break;
    case 'pop': popClose(i); mini6Draw('pops'); break;
    case 'popstart': popStart(); mini6Draw('pops'); break;
    case 'shutdown': // the orange "safe to turn off" screen, for a moment
      $('o6Mid').className = 'midnight mid-off';
      setText($('o6MidText'), "It's now safe to turn off\nyour computer.");
      setTimeout(() => $('o6Mid').classList.add('hidden'), 2500);
      break;
    case 'visit': os6Visit(a); break;
    case 'ach': openAchMenu(); break;
  }
  os6Render();
}
function os6Visit(era) {
  S.os6.on = false;
  closeDialogue6();
  S.os5.on = era === '5';
  if (era !== '5') {
    S.os4.on = era === '4';
    if (era !== '4') {
      S.os3.on = era === '3';
      if (era !== '3') {
        if (era === '1') S.gui.on = false;
        else { S.gui.win1 = true; S.gui.on = true; S.gui.declined = false; }
        log(`INCR.OS ${era}.0 loaded. everything is where you left it.`, 'ok');
        out('downloads keep going meanwhile. /win6 takes you back.', 'dim');
      }
    }
  }
  guiFlash();
  setPrompt();
  save(true);
}
function os6Return() {
  if (!S.os6.unlocked) return;
  S.os6.on = true;
  guiFlash();
  save(true);
}

function wireOs6() {
  const root = $('os6');
  os6Build();
  root.addEventListener('click', e => {
    if (e.target.closest('#o6Ask')) return;
    if (e.target.closest('#o6Dlg')) { dlg6Next(); return; }
    const win = e.target.closest('.w6win');
    const el = e.target.closest('[data-o6]');
    if (win && !(el && /^(close|min):/.test(el.dataset.o6))) o6Focus(win.dataset.win);
    if (el && !el.disabled) os6Act(el.dataset.o6);
    else if (start6Open && !e.target.closest('#o6Start')) { start6Open = false; os6Render(); }
  });
  root.addEventListener('change', e => {
    const s = e.target.closest('select[data-slot]');
    if (s) { setSlotType(+s.dataset.slot, +s.value); os6Render(); }
  });
  $('o6Ask').addEventListener('submit', e => {
    e.preventDefault();
    if (!dlg6 || !nameVoice($('o6Name').value)) return;
    S.os6.chapter = dlg6.k + 1;
    closeDialogue6();
    save(true);
    os6Render();
  });
  // Falling Blocks keys
  document.addEventListener('keydown', e => {
    if (!os6On() || !fb || !fb.running || o6Top() !== 'blocks') return;
    const k = e.key;
    if (k === 'ArrowLeft') fbMove(-1, 0); else if (k === 'ArrowRight') fbMove(1, 0);
    else if (k === 'ArrowUp') fbRotate(); else if (k === 'ArrowDown') fbMove(0, 1); else if (k === ' ') fbDrop(); else return;
    e.preventDefault();
    fbDraw();
  });
  // drag windows by their title bar
  let drag = null;
  root.addEventListener('pointerdown', e => {
    const bar = e.target.closest('.w6-title');
    if (!bar || e.target.closest('[data-o6]') || os6Narrow()) return;
    const win = bar.parentElement, area = $('o6Desk').getBoundingClientRect(), r = win.getBoundingClientRect();
    o6Focus(win.dataset.win);
    drag = { id: win.dataset.win, dx: e.clientX - r.left, dy: e.clientY - r.top, area };
    bar.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  root.addEventListener('pointermove', e => {
    if (!drag) return;
    const l = S.os6.layout[drag.id], a = drag.area;
    l.x = Math.max(0, Math.min(1, (e.clientX - a.left - drag.dx) / a.width));
    l.y = Math.max(0, Math.min(1, (e.clientY - a.top - drag.dy) / a.height));
    o6Layout();
  });
  const stop = () => { drag = null; };
  root.addEventListener('pointerup', stop);
  root.addEventListener('pointercancel', stop);
  window.addEventListener('resize', o6Layout);
  const wake = () => { lastInput6 = Date.now(); stopSaver6(); };
  for (const type of ['pointerdown', 'keydown', 'wheel', 'touchstart']) window.addEventListener(type, wake, { passive: true, capture: true });
  document.addEventListener('keydown', e => {
    if (dlg6 && os6On() && !achMenu && (e.key === 'Enter' || e.key === ' ') && e.target.id !== 'o6Name' && o6Top() !== 'blocks') { e.preventDefault(); dlg6Next(); }
  });
}

// ---------------------------------------------------------------- from 5.0 to 6.0: the setup wizard
let setup6Running = false;
const setup6Ready = () => !!S.os5 && S.os5.unlocked && S.os5.chapter >= CHAPTERS5.length && !S.os6.unlocked;
const SETUP6_STEPS = ['Preparing to run Setup', 'Collecting information about your computer', 'Copying INCR.OS files to your computer',
  'Restarting your computer', 'Setting up hardware and finalizing settings'];
function playSetup6() {
  if (setup6Running || !setup6Ready() || !$('setup6')) return;
  setup6Running = true;
  closeAchMenu();
  closeDialogue5();
  Music.hold(true);
  const box = $('setup6'), list = $('setup6Steps'), eta = $('setup6Eta');
  box.classList.remove('hidden');
  const fast = reduceMotion();
  let i = 0, mins = 39;
  const next = () => {
    list.innerHTML = SETUP6_STEPS.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}">${s}</li>`).join('');
    setText(eta, i < SETUP6_STEPS.length ? `Estimated time remaining: ${mins} minutes` : 'Done.');
    mins = Math.max(1, Math.round(mins * 0.55));
    Music.fx('voice-sys');
    if (i++ < SETUP6_STEPS.length) { setTimeout(next, fast ? 40 : 850); return; }
    box.classList.add('hidden');
    $('start6').classList.remove('hidden');
    Music.fx('start5');
    setTimeout(() => {
      $('start6').classList.add('hidden');
      S.os6.unlocked = true;
      S.os6.on = true;
      setup6Running = false;
      Music.hold(false);
      lastInput6 = Date.now();
      document.body.classList.add('os6-opening');
      setTimeout(() => document.body.classList.remove('os6-opening'), 1400);
      checkAch();
      save(true);
    }, fast ? 300 : 3600);
  };
  next();
}
