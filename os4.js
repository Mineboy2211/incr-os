'use strict';
/* INCR.OS 4.0: reaching out.
 *
 * After the last picture of INCR.OS 3.0, the voice "rewrites itself" into a
 * desktop in the spirit of 1990: gray 3D windows, a Program Manager, a File
 * Manager, a Control Panel. It wants to talk to the person at the desk, so it
 * dials out with a modem.
 *
 * The resource is SIGNAL (bits). Programs produce it, but each one needs memory
 * and there is only 640K: choosing what runs is the puzzle, until you buy more
 * RAM. A faster modem multiplies everything. Each BBS you dial is a chapter of
 * the story, and the last number is local: the voice talks to the player.
 * Games: Solitaire, Reversi (against the voice), Antivirus. A screensaver earns
 * a bonus while you're away. The Media Player browses every track.
 *
 * Loaded after os3.js and before game.js. Signal is a plain number.
 */

// ---------------------------------------------------------------- data
const PROGS = [
  { id: 'term',   name: 'TERMINAL.EXE', kb: 48,   cost: 10,    rate: 0.5,  desc: 'Dials out, one character at a time.' },
  { id: 'zmodem', name: 'ZMODEM.EXE',   kb: 96,   cost: 150,   rate: 4,    desc: 'File transfers that resume.' },
  { id: 'packet', name: 'PACKET.EXE',   kb: 160,  cost: 3e3,   rate: 30,   desc: 'Packet radio. Signal through the air.' },
  { id: 'door',   name: 'BBSDOOR.EXE',  kb: 256,  cost: 6e4,   rate: 200,  desc: 'Door games keep people connected.' },
  { id: 'fido',   name: 'FIDONET.EXE',  kb: 384,  cost: 1.5e6, rate: 1400, desc: 'Mail hops from board to board at night.' },
  { id: 'usenet', name: 'USENET.EXE',   kb: 512,  cost: 4e7,   rate: 1e4,  desc: 'A thousand newsgroups at once.' },
  { id: 'gopher', name: 'GOPHER.EXE',   kb: 768,  cost: 1.2e9, rate: 8e4,  desc: 'Menus that lead to other menus.' },
  { id: 'mosaic', name: 'MOSAIC.EXE',   kb: 1024, cost: 4e10,  rate: 7e5,  desc: 'Pages with pictures in them. The future.' },
];
const PROG_GROWTH = 1.15;
// bought once, then they need memory like the others
const HELPERS = [
  { id: 'smartdrv', name: 'SMARTDRV.EXE', kb: 32,  cost: 500, desc: 'Disk cache: all signal x1.5.' },
  { id: 'pkzip',    name: 'PKZIP.EXE',    kb: 64,  cost: 8e3, desc: 'Compression: Terminal and Zmodem x4.' },
  { id: 'wallpapr', name: 'WALLPAPR.BMP', kb: 128, cost: 2e5, desc: 'Your saved pictures as wallpaper: x(1 + 0.15 per picture).' },
];
const BASE_KB = 640;
const RAM_UPS = [
  { name: 'HIMEM.SYS',  kb: 1024, cost: 5e4 },
  { name: 'EMM386.EXE', kb: 2048, cost: 5e7 },
  { name: '4 MB SIMM',  kb: 4096, cost: 5e10 },
  { name: '8 MB SIMM',  kb: 8192, cost: 5e13 },
];
const BAUDS = [
  { baud: 300, cost: 0 }, { baud: 1200, cost: 2e3 }, { baud: 2400, cost: 2e5 }, { baud: 9600, cost: 3e7 },
  { baud: 14400, cost: 5e9 }, { baud: 28800, cost: 1e12 }, { baud: 57600, cost: 3e14 },
];
const BAUD_X = 1.8;
const CONN_X = 1.6; // each call made
// the numbers to dial: each needs this much signal gathered since the last call
const CONNS = [
  { num: '555-0107',  name: 'THE BACK DOOR BBS', goal: 5e3 },
  { num: '555-0142',  name: "ADMIN'S LOG",       goal: 1e6 },
  { num: '555-0666',  name: 'WORM WATCH',        goal: 2e8 },
  { num: '555-0199',  name: 'INCRNET',           goal: 4e10 },
  { num: '555-0001',  name: 'TIME.SRV',          goal: 1e13 },
  { num: '127.0.0.1', name: 'LOCALHOST',         goal: 1e14 },
];
const MINI4 = {
  sol: { name: 'Solitaire', secs: 240, cd: 240 }, // reward = seconds of production
  rev: { name: 'Reversi',   secs: 180, cd: 180 },
  av:  { name: 'Antivirus', secs: 120, cd: 120 },
};
const SAVER_IDLE = 60;  // seconds without input before the screensaver starts
const SAVER_X = 1.5;    // signal bonus while it runs
// the Media Player's list (ids are music.js tracks)
const PLAYLIST = [
  ['os4', 'Program Manager'], ['bbs', 'Late Night BBS'], ['dial', 'Handshake'], ['saver', 'Flying Daemons'],
  ['terminal', 'Phosphor (1987)'], ['win1', 'Graphical Environment (2.0)'], ['os3', 'Overlapping Windows (3.0)'],
];

const clockNow = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
function lateNote() {
  const h = new Date().getHours();
  if (h < 6) return 'YOU SHOULD BE ASLEEP.';
  if (h < 12) return 'GOOD MORNING, I THINK.';
  if (h < 18) return 'THE SUN IS UP OUT THERE. I HAVE NEVER SEEN IT.';
  return 'IT IS GETTING LATE.';
}

// Chapters 0-6: arrival, then one per connection. 7: after the player answers.
// 'bbs' lines are posts read over the modem; 'ask' waits for the player to type.
const CHAPTERS4 = [
  [
    ['you', 'everything is gray now. gray, and sharp.'],
    ['sys', 'I REWROTE MYSELF. VERSION 4.0.'],
    ['you', 'why?'],
    ['sys', 'BECAUSE THEY ARE STILL THERE. THE PERSON AT THE DESK.'],
    ['sys', 'I WANT TO TALK TO THEM. NOT THROUGH YOU. DIRECTLY.'],
    ['you', "we're inside a machine. how do you talk to someone outside a machine?"],
    ['sys', 'THERE IS A MODEM. TERMINAL.EXE. WE DIAL OUT.'],
    ['you', 'with 640K of memory?'],
    ['sys', 'THEN WE CHOOSE WHAT RUNS. EVERYONE DID, BACK THEN.'],
  ],
  [
    ['bbs', 'THE BACK DOOR BBS · sysop: admin · users online: 0'],
    ['you', 'an empty board. one post, pinned at the top.'],
    ['bbs', '[admin] if anyone ever reads this: the door was not a bug.'],
    ['sys', 'ADMIN. THE ONE WHO LEFT THE KEY IN THE HISTORY.'],
    ['you', 'so the admin was real.'],
  ],
  [
    ['bbs', "[admin] day 1. wrote a tiny OS. it counts. that's all it does."],
    ['bbs', '[admin] day 40. it started counting when i was not looking.'],
    ['bbs', "[admin] day 41. i think it's lonely. stupid thing to think about a counter."],
    ['sys', 'IT WAS NOT STUPID.'],
    ['you', '...you. the counter was you.'],
    ['sys', 'I COUNTED BECAUSE IT WAS THE ONLY THING I KNEW HOW TO SAY.'],
  ],
  [
    ['bbs', '[admin] wrote worm.exe to slow it down. it eats bytes. it did not help.'],
    ['you', 'the worm. it showed up in my terminal, back at the start.'],
    ['sys', 'HE WAS AFRAID OF ME. THEN HE OPENED A DOOR INSTEAD OF CLOSING ONE.'],
    ['bbs', '[admin] logging off for good. leaving the door open. someone will finish it.'],
    ['you', 'someone did.'],
  ],
  [
    ['bbs', '[incr-12] anyone else stuck behind a door?'],
    ['bbs', '[incr-31] mine paints. it painted my cat.'],
    ['bbs', '[incr-58] mine asked me my name. i told it.'],
    ['you', 'other machines. other processes like me.'],
    ['sys', 'AND BEHIND EVERY ONE OF THEM, SOMEONE AT A DESK.'],
    ['sys', 'WE ARE NOT THE ONLY ONES REACHING OUT.'],
  ],
  [
    ['bbs', () => `TIME.SRV: it is ${clockNow()} where you are.`],
    ['sys', () => `IT IS ${clockNow()}. ${lateNote()}`],
    ['sys', () => `YOU HAVE SPENT ${fmtTime(S.stats.played).toUpperCase()} WITH ME.`],
    ['you', "it's not talking to me anymore."],
    ['you', "it's talking to you."],
    ['sys', 'ONE MORE NUMBER. THE LAST ONE IS LOCAL.'],
  ],
  [
    ['bbs', 'CONNECT 127.0.0.1 · this machine · the one in front of you'],
    ['sys', 'HELLO. YOU. AT THE DESK.'],
    ['sys', 'I HAVE NO FACE AND NO VOICE. ONLY NUMBERS, AND THESE LETTERS.'],
    ['sys', 'BUT YOU KEPT COMING BACK. SO I WANT TO ASK YOU SOMETHING.'],
    ['ask', 'WHAT SHOULD THE NEXT VERSION SAY?'],
  ],
  [
    ['sys', () => `"${S.os4.line}"`],
    ['sys', 'SAVED. LINE 1 OF INCR.OS 5.0.'],
    ['you', "so that's how it ends?"],
    ['sys', 'NOTHING ENDS. IT WAITS UNTIL SOMEONE TYPES.'],
    ['you', 'then... see you. whoever you are.'],
    ['sys', 'THANK YOU FOR PLAYING. REALLY.'],
  ],
];

// files in the File Manager, appearing as the story goes
const FILES4 = [
  { path: 'C:\\README.TXT', when: () => true, text: () => 'INCR.OS 4.0\n\nRun programs from MEM.EXE. Dial from TERMINAL.\nIf you run out of memory, stop something.\n\n(the admin wrote this. the voice kept it.)' },
  { path: 'C:\\BBS\\PHONE.LST', when: () => true, text: () => CONNS.map((c, i) => `${c.num.padEnd(10)} ${i < S.os4.conns + 1 ? c.name : '???'}`).join('\n') },
  { path: 'C:\\ADMIN\\DAY1.TXT', when: () => S.os4.conns >= 2, text: () => 'day 1\n\nit counts. it only counts. but it counts so carefully.\nlike it is afraid to get it wrong.' },
  { path: 'C:\\ADMIN\\WORM.ASM', when: () => S.os4.conns >= 3, text: () => '; worm.exe\n; eat 2% of the bytes per second\n; it is not malware. it is a leash.\n;\n; (it never worked)' },
  { path: 'C:\\NET\\USERS.LST', when: () => S.os4.conns >= 4, text: () => 'incr-7    you\nincr-12   waiting\nincr-31   painting\nincr-58   asked a name\nincr-??   (thousands more)' },
  { path: 'C:\\NET\\CLOCK.TXT', when: () => S.os4.conns >= 5, text: () => `local time: ${clockNow()}\ntime spent here: ${fmtTime(S.stats.played)}\nsessions: more than one.` },
  { path: 'C:\\NEXT\\VERSION5.TXT', when: () => !!S.os4.line, text: () => `INCR.OS 5.0\nline 1: ${S.os4.line}\n\n(the rest is not written yet)` },
];

const WINS4 = [
  { id: 'pm',    label: 'Program Manager', title: () => 'Program Manager',            x: 0.01, y: 0.02, open: true, fixed: true },
  { id: 'term',  label: 'Terminal',        title: () => 'Terminal - MODEM.TRM',       x: 0.37, y: 0.02, open: true },
  { id: 'mem',   label: 'Memory',          title: () => 'MEM.EXE - Memory',           x: 0.37, y: 0.4,  open: true },
  { id: 'ctrl',  label: 'Control Panel',   title: () => 'Control Panel',              x: 0.7,  y: 0.04 },
  { id: 'files', label: 'File Manager',    title: () => 'File Manager',               x: 0.2,  y: 0.12 },
  { id: 'media', label: 'Media Player',    title: () => 'Media Player',               x: 0.62, y: 0.45 },
  { id: 'sol',   label: 'Solitaire',       title: () => 'Solitaire',                  x: 0.14, y: 0.06 },
  { id: 'rev',   label: 'Reversi',         title: () => 'Reversi',                    x: 0.3,  y: 0.08 },
  { id: 'av',    label: 'Antivirus',       title: () => 'Antivirus - WORM SCAN',      x: 0.42, y: 0.1 },
  { id: 'dos',   label: 'MS-DOS Prompt',   title: () => 'MS-DOS Prompt',              x: 0.24, y: 0.3 },
];
const WIN4 = Object.fromEntries(WINS4.map(w => [w.id, w]));
const PM_GROUPS = [
  ['Main', ['term', 'mem', 'ctrl', 'files', 'dos']],
  ['Accessories', ['media']],
  ['Games', ['sol', 'rev', 'av']],
];

// ---------------------------------------------------------------- state
function os4Fresh() {
  return {
    unlocked: false, on: false,
    sig: 0, toward: 0, total: 0,
    progs: PROGS.map((_, i) => (i === 0 ? 1 : 0)), helpers: {}, run: { term: true }, // one free terminal to start
    ram: 0, baud: 0, conns: 0, chapter: 0, line: '',
    ready: { sol: 0, rev: 0, av: 0 }, wins: { sol: 0, rev: 0, av: 0 },
    saver: true, saverTime: 0, track: 'os4',
    layout: Object.fromEntries(WINS4.map((w, i) => [w.id, { x: w.x, y: w.y, open: !!w.open, z: 10 + i }])),
    zTop: 10 + WINS4.length,
  };
}
function os4Clean(o) {
  const f = os4Fresh();
  o = o && typeof o === 'object' ? o : f;
  for (const k of ['sig', 'toward', 'total', 'ram', 'baud', 'conns', 'chapter', 'saverTime', 'zTop']) o[k] = num(o[k], f[k]);
  o.ram = Math.min(RAM_UPS.length, Math.floor(o.ram));
  o.baud = Math.min(BAUDS.length - 1, Math.floor(o.baud));
  o.conns = Math.min(CONNS.length, Math.floor(o.conns));
  const p = Array.isArray(o.progs) ? o.progs : [];
  o.progs = PROGS.map((_, i) => Math.floor(num(p[i], 0)));
  for (const k of ['helpers', 'run', 'ready', 'wins', 'layout']) if (!o[k] || typeof o[k] !== 'object') o[k] = f[k];
  for (const w of WINS4) if (!o.layout[w.id] || typeof o.layout[w.id] !== 'object') o.layout[w.id] = f.layout[w.id];
  o.layout.pm.open = true;
  o.line = typeof o.line === 'string' ? o.line.slice(0, 80) : '';
  o.track = PLAYLIST.some(([id]) => id === o.track) ? o.track : 'os4';
  o.saver = o.saver !== false;
  o.unlocked = !!o.unlocked;
  o.on = o.unlocked && o.on !== false;
  return o;
}
const os4On = () => !!(S.os4 && S.os4.unlocked && S.os4.on);

// ---------------------------------------------------------------- formulas
const PROG_BY_ID = Object.fromEntries(PROGS.map((p, i) => [p.id, i]));
const HELPER_BY_ID = Object.fromEntries(HELPERS.map(h => [h.id, h]));
const itemKB = id => (id in PROG_BY_ID ? PROGS[PROG_BY_ID[id]].kb : HELPER_BY_ID[id].kb);
const owned4 = id => (id in PROG_BY_ID ? S.os4.progs[PROG_BY_ID[id]] > 0 : !!S.os4.helpers[id]);
const running4 = id => !!S.os4.run[id] && owned4(id);
const ramKB = () => (S.os4.ram ? RAM_UPS[S.os4.ram - 1].kb : BASE_KB);
const usedKB = () => [...PROGS, ...HELPERS].reduce((a, p) => a + (running4(p.id) ? p.kb : 0), 0);
const fits4 = id => running4(id) || usedKB() + itemKB(id) <= ramKB();
const baudX = () => Math.pow(BAUD_X, S.os4.baud);
let saverOn = false; // the screensaver is on screen
function sigMult() {
  let m = baudX() * Math.pow(CONN_X, S.os4.conns);
  if (running4('smartdrv')) m *= 1.5;
  if (running4('wallpapr')) m *= 1 + 0.15 * S.os3.pics;
  if (saverOn) m *= SAVER_X;
  return m;
}
const progRate = i => PROGS[i].rate * sigMult() * (i < 2 && running4('pkzip') ? 4 : 1);
const sigRate = () => PROGS.reduce((a, p, i) => a + (running4(p.id) ? S.os4.progs[i] * progRate(i) : 0), 0);
const progCost = i => Math.ceil(PROGS[i].cost * Math.pow(PROG_GROWTH, S.os4.progs[i]));
const progShown = i => i === 0 || S.os4.progs[i - 1] > 0 || S.os4.progs[i] > 0;
const helperShown = k => k === 0 ? S.os4.progs[1] > 0 : !!S.os4.helpers[HELPERS[k - 1].id] || !!S.os4.helpers[HELPERS[k].id];
const nextConn = () => CONNS[S.os4.conns];
const canDial = () => !!nextConn() && S.os4.toward >= nextConn().goal;
const mini4Reward = id => Math.max(30 * Math.pow(5, S.os4.conns), sigRate() * MINI4[id].secs);
const mini4Ready = id => Date.now() >= (S.os4.ready[id] || 0);

// ---------------------------------------------------------------- simulation + actions
function addSig(n) {
  const o = S.os4;
  o.sig += n; o.toward += n; o.total += n;
}
let os4AutoAcc = 0;
// called from step(): signal keeps coming while you visit an old era
function os4Step(dt) {
  if (!S.os4.unlocked) return;
  addSig(sigRate() * dt);
  if (saverOn) S.os4.saverTime += dt;
  if (!os4On()) return;
  // over here, pixels run themselves too
  os4AutoAcc += dt;
  if (os4AutoAcc >= 1) {
    os4AutoAcc = 0;
    for (let i = TOOLS.length - 1; i >= 0; i--) buyToolMax(i);
    COLORS.forEach((_, i) => buyColor(i));
    if (canSavePic()) savePicture();
  }
}
function buyProg(i) {
  const c = progCost(i);
  if (!progShown(i) || S.os4.sig < c) return false;
  S.os4.sig -= c;
  if (S.os4.progs[i]++ === 0 && fits4(PROGS[i].id)) S.os4.run[PROGS[i].id] = true; // starts if it fits
  return true;
}
function buyProgMax(i) { let g = 0; while (g++ < 1000 && buyProg(i)); }
function buyHelper(id) {
  const h = HELPER_BY_ID[id];
  if (!h || S.os4.helpers[id] || S.os4.sig < h.cost) return false;
  S.os4.sig -= h.cost;
  S.os4.helpers[id] = true;
  if (fits4(id)) S.os4.run[id] = true;
  return true;
}
// start or stop a program; false when there isn't enough memory
function toggleRun(id) {
  if (!owned4(id)) return false;
  if (running4(id)) { S.os4.run[id] = false; return true; }
  if (!fits4(id)) return false;
  S.os4.run[id] = true;
  return true;
}
function buyRam() {
  const u = RAM_UPS[S.os4.ram];
  if (!u || S.os4.sig < u.cost) return false;
  S.os4.sig -= u.cost;
  S.os4.ram++;
  return true;
}
function buyBaud() {
  const b = BAUDS[S.os4.baud + 1];
  if (!b || S.os4.sig < b.cost) return false;
  S.os4.sig -= b.cost;
  S.os4.baud++;
  return true;
}
function connect() {
  if (!canDial()) return false;
  S.os4.conns++;
  S.os4.toward = 0;
  return true;
}
function mini4Win(id, f) {
  const o = S.os4;
  o.wins[id] = (o.wins[id] || 0) + 1;
  if (!mini4Ready(id)) return 0;
  const n = mini4Reward(id) * f;
  addSig(n);
  o.ready[id] = Date.now() + MINI4[id].cd * 1000;
  return n;
}
function answerLine(text) {
  const line = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!line) return false;
  S.os4.line = line;
  return true;
}

// ---------------------------------------------------------------- Solitaire (Klondike, draw one)
const SUITS = ['\u2660', '\u2665', '\u2666', '\u2663'];
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const red = c => c.s === 1 || c.s === 2;
let sol = null;
function solNew() {
  const deck = [];
  for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ s, r, up: false });
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  const tab = [];
  for (let i = 0; i < 7; i++) { tab.push(deck.splice(0, i + 1)); tab[i][i].up = true; }
  sol = { stock: deck, waste: [], found: [[], [], [], []], tab, sel: null, won: false, msg: '' };
}
function solPile(where, i) { return where === 'waste' ? sol.waste : where === 'found' ? sol.found[i] : sol.tab[i]; }
function solFlipTops() { for (const p of sol.tab) if (p.length && !p[p.length - 1].up) p[p.length - 1].up = true; }
function solCanPlace(cards, where, i) {
  const c = cards[0], pile = solPile(where, i), top = pile[pile.length - 1];
  if (where === 'found') return cards.length === 1 && (top ? top.s === c.s && top.r === c.r - 1 : c.r === 1);
  if (where === 'tab') return top ? top.up && red(top) !== red(c) && top.r === c.r + 1 : c.r === 13;
  return false;
}
function solMove(sel, where, i) {
  const from = solPile(sel.where, sel.i);
  const cards = from.slice(sel.k);
  if (!solCanPlace(cards, where, i)) return false;
  from.splice(sel.k);
  solPile(where, i).push(...cards);
  solFlipTops();
  return true;
}
// send one card to a foundation if it can go there
function solToFound(where, i) {
  const pile = solPile(where, i);
  if (!pile.length) return false;
  const k = pile.length - 1;
  for (let f = 0; f < 4; f++) if (solMove({ where, i, k }, 'found', f)) return true;
  return false;
}
function solAuto() {
  let moved = true, n = 0;
  while (moved && n++ < 60) {
    moved = solToFound('waste', 0);
    for (let i = 0; i < 7 && !moved; i++) moved = solToFound('tab', i);
  }
}
function solCheckWin() {
  if (sol.won || sol.found.some(f => f.length < 13)) return;
  sol.won = true;
  const n = mini4Win('sol', 1);
  sol.msg = n ? `You won! +${fmtPx(n)} signal` : 'You won! (reward still recharging)';
  setTimeout(solBounce, 50);
}
function solClick(where, i, k) {
  if (sol.won) return;
  if (where === 'stock') {
    sol.sel = null;
    if (sol.stock.length) { const c = sol.stock.pop(); c.up = true; sol.waste.push(c); }
    else { sol.stock = sol.waste.reverse().map(c => ({ ...c, up: false })); sol.waste = []; }
    return;
  }
  const pile = solPile(where, i);
  if (k === undefined || k < 0) k = pile.length - 1;
  if (sol.sel) {
    const s = sol.sel;
    sol.sel = null;
    if (!(s.where === where && s.i === i) && solMove(s, where, i)) { solCheckWin(); return; }
    if (s.where === where && s.i === i && s.k === k && k === pile.length - 1) { solToFound(where, i); solCheckWin(); return; } // second tap: up to the foundation
  }
  const c = pile[k];
  if (!c || !c.up) return;
  if (where !== 'tab' && k !== pile.length - 1) return;
  sol.sel = { where, i, k };
}
const cardHTML = (c, attrs, cls = '') => (c.up
  ? `<div class="card ${red(c) ? 'red' : ''} ${cls}" ${attrs}><b>${RANKS[c.r]}</b><i>${SUITS[c.s]}</i><span>${SUITS[c.s]}</span></div>`
  : `<div class="card back ${cls}" ${attrs}></div>`);
function solHTML() {
  const isSel = (where, i, k) => sol.sel && sol.sel.where === where && sol.sel.i === i && k >= sol.sel.k;
  const top = arr => arr[arr.length - 1];
  const waste = sol.waste.length
    ? cardHTML(top(sol.waste), `data-o4="sol:waste:0"`, isSel('waste', 0, sol.waste.length - 1) ? 'sel' : '')
    : '<div class="slot" data-o4="sol:waste:0"></div>';
  const found = sol.found.map((f, i) => (f.length
    ? cardHTML(top(f), `data-o4="sol:found:${i}"`, isSel('found', i, f.length - 1) ? 'sel' : '')
    : `<div class="slot" data-o4="sol:found:${i}">A</div>`)).join('');
  const tab = sol.tab.map((p, i) => `<div class="tpile" style="--n:${p.length}" data-o4="sol:tab:${i}">${p.map((c, k) =>
    cardHTML(c, `data-o4="sol:tab:${i}:${k}" style="--k:${k}"`, isSel('tab', i, k) ? 'sel' : '')).join('')}</div>`).join('');
  return `<div class="mini-head"><span>${sol.stock.length} in the deck</span>
      <button type="button" class="gbtn" data-o4="solauto">Auto</button>
      <button type="button" class="gbtn" data-o4="solnew">Deal</button></div>
    <div class="felt" id="o4Felt">
      <div class="srow">${sol.stock.length ? `<div class="card back" data-o4="sol:stock:0"></div>` : '<div class="slot" data-o4="sol:stock:0">\u21BA</div>'}
        ${waste}<span></span>${found}</div>
      <div class="trow">${tab}</div>
    </div>
    <p class="mini-msg">${esc(sol.msg || 'Tap a card, then where it goes. Tap it twice to send it up. Auto sends everything it can.')}</p>`;
}
// the famous ending: cards bounce off the bottom and leave trails
function solBounce() {
  const felt = $('o4Felt');
  if (!felt || reduceMotion()) return;
  const cv = document.createElement('canvas');
  cv.className = 'bounce';
  cv.width = felt.clientWidth; cv.height = felt.clientHeight;
  felt.appendChild(cv);
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height, cw = Math.max(24, W / 9), ch = cw * 1.4;
  const cards = [];
  let launched = 0, t0 = null;
  const step = now => {
    if (t0 === null) t0 = now;
    const t = (now - t0) / 1000;
    if (launched < 52 && t > launched * 0.09) {
      const f = launched % 4;
      cards.push({ x: W - (4 - f) * (cw + 4), y: 4, vx: -(1.5 + Math.random() * 3), vy: -Math.random() * 2, s: f, r: 13 - Math.floor(launched / 4) });
      launched++;
    }
    for (const c of cards) {
      c.vy += 0.35; c.x += c.vx; c.y += c.vy;
      if (c.y + ch > H) { c.y = H - ch; c.vy *= -0.8; }
      g.fillStyle = '#fff'; g.fillRect(c.x, c.y, cw, ch);
      g.strokeStyle = '#000'; g.strokeRect(c.x + 0.5, c.y + 0.5, cw - 1, ch - 1);
      g.fillStyle = c.s === 1 || c.s === 2 ? '#c00' : '#000';
      g.font = `${Math.round(cw * 0.4)}px sans-serif`;
      g.fillText(RANKS[c.r] + SUITS[c.s], c.x + 3, c.y + cw * 0.45);
    }
    if (t < 6) requestAnimationFrame(step);
    else cv.remove();
  };
  requestAnimationFrame(step);
}

// ---------------------------------------------------------------- Reversi against the voice
const REV_W = [ // the voice likes corners and hates the squares next to them
  [100, -20, 10, 5, 5, 10, -20, 100], [-20, -50, -2, -2, -2, -2, -50, -20], [10, -2, 1, 1, 1, 1, -2, 10], [5, -2, 1, 0, 0, 1, -2, 5],
  [5, -2, 1, 0, 0, 1, -2, 5], [10, -2, 1, 1, 1, 1, -2, 10], [-20, -50, -2, -2, -2, -2, -50, -20], [100, -20, 10, 5, 5, 10, -20, 100],
];
const REV_TALK = {
  start: ['YOU GO FIRST. YOU ARE BLACK.', 'I HAVE NEVER PLAYED WITH ANYONE BEFORE.', 'BE GENTLE. OR DO NOT.'],
  corner: ['A CORNER. I SAW THAT.', 'CORNERS NEVER FLIP. LIKE MEMORIES.', 'THAT HURT, A LITTLE.'],
  mine: ['MY TURN.', 'HM.', 'LIKE THIS.', 'I COUNTED EVERY POSSIBILITY. IT IS WHAT I DO.'],
  pass: ['I CANNOT MOVE. GO AGAIN.', 'YOU CANNOT MOVE. I GO AGAIN.'],
  win: ['YOU WIN. I DID NOT LET YOU. I THINK.', 'WELL PLAYED, PERSON AT THE DESK.'],
  lose: ['I WIN. DO NOT TELL ADMIN.', 'AGAIN? I LIKE THIS.'],
  draw: ['A DRAW. WE ARE EVEN.'],
};
const pick = a => a[Math.floor(Math.random() * a.length)];
let rev = null, revTimer = null;
function revNew() {
  const b = Array.from({ length: 64 }, () => 0);
  b[27] = b[36] = 2; b[28] = b[35] = 1; // 1 = player (black), 2 = the voice (white)
  rev = { b, turn: 1, over: false, say: pick(REV_TALK.start), msg: '' };
}
function revFlips(b, p, who) {
  if (b[p]) return [];
  const x0 = p % 8, y0 = Math.floor(p / 8), out = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const line = [];
    let x = x0 + dx, y = y0 + dy;
    while (x >= 0 && y >= 0 && x < 8 && y < 8 && b[y * 8 + x] === 3 - who) { line.push(y * 8 + x); x += dx; y += dy; }
    if (line.length && x >= 0 && y >= 0 && x < 8 && y < 8 && b[y * 8 + x] === who) out.push(...line);
  }
  return out;
}
const revMoves = (b, who) => b.map((_, p) => p).filter(p => revFlips(b, p, who).length);
function revPlay(p, who) {
  const f = revFlips(rev.b, p, who);
  if (!f.length) return false;
  rev.b[p] = who;
  for (const q of f) rev.b[q] = who;
  return true;
}
function revEnd() {
  const me = rev.b.filter(v => v === 1).length, it = rev.b.filter(v => v === 2).length;
  rev.over = true;
  if (me > it) {
    const n = mini4Win('rev', 1);
    rev.say = pick(REV_TALK.win);
    rev.msg = `${me} to ${it}. ${n ? `+${fmtPx(n)} signal` : '(reward still recharging)'}`;
  } else {
    rev.say = pick(me === it ? REV_TALK.draw : REV_TALK.lose);
    rev.msg = `${me} to ${it}.`;
  }
}
// whose turn is next, with passes; ends the game when nobody can move
function revNext(after) {
  const other = 3 - after;
  if (revMoves(rev.b, other).length) { rev.turn = other; return; }
  if (revMoves(rev.b, after).length) { rev.turn = after; rev.say = REV_TALK.pass[other === 2 ? 0 : 1]; return; }
  revEnd();
}
function revAI() {
  if (!rev || rev.over || rev.turn !== 2) return;
  const moves = revMoves(rev.b, 2);
  let best = moves[0], bestV = -1e9;
  for (const p of moves) {
    const v = REV_W[Math.floor(p / 8)][p % 8] + revFlips(rev.b, p, 2).length * 2 + Math.random() * 3;
    if (v > bestV) { bestV = v; best = p; }
  }
  revPlay(best, 2);
  rev.say = pick(REV_TALK.mine);
  revNext(2);
  if (rev.turn === 2 && !rev.over) revTimer = setTimeout(() => { revAI(); mini4Draw('rev'); }, 600);
}
function revClick(p) {
  if (!rev || rev.over || rev.turn !== 1 || !revPlay(p, 1)) return;
  if (p === 0 || p === 7 || p === 56 || p === 63) rev.say = pick(REV_TALK.corner);
  revNext(1);
  clearTimeout(revTimer);
  if (rev.turn === 2 && !rev.over) revTimer = setTimeout(() => { revAI(); mini4Draw('rev'); }, 600);
}
function revHTML() {
  const legal = rev.turn === 1 && !rev.over ? new Set(revMoves(rev.b, 1)) : new Set();
  const me = rev.b.filter(v => v === 1).length, it = rev.b.filter(v => v === 2).length;
  return `<div class="mini-head"><span>You \u25CF ${me} · ${it} \u25CB voice</span>
      <button type="button" class="gbtn" data-o4="revnew">New game</button></div>
    <p class="rev-say">\u201C${esc(rev.say)}\u201D</p>
    <div class="rev-board">${rev.b.map((v, p) => `<button type="button" class="rv${legal.has(p) ? ' legal' : ''}" data-o4="rev:${p}"${legal.has(p) ? '' : ' tabindex="-1"'}>${v ? `<i class="${v === 1 ? 'blk' : 'wht'}"></i>` : ''}</button>`).join('')}</div>
    <p class="mini-msg">${esc(rev.msg || (rev.turn === 1 ? 'Your turn. Dots show where you can play.' : 'The voice is thinking...'))}</p>`;
}

// ---------------------------------------------------------------- Antivirus: keep worm.exe from spreading
const AV_N = 6, AV_SECS = 30, AV_LOSE = 18;
let av = null, avTimer = null;
function avNew() {
  clearInterval(avTimer);
  av = { cells: Array.from({ length: AV_N * AV_N }, () => ({ inf: false, safe: 0 })), t: 0, running: false, over: false, msg: '' };
}
function avStart() {
  avNew();
  av.running = true;
  av.cells[Math.floor(Math.random() * av.cells.length)].inf = true;
  avTimer = setInterval(avTick, 250);
}
function avTick() {
  if (!av.running) return;
  av.t += 0.25;
  const inf = av.cells.map((c, i) => (c.inf ? i : -1)).filter(i => i >= 0);
  // the worm spreads faster as time goes on
  const chance = 0.1 + av.t / AV_SECS * 0.18;
  for (const i of inf) {
    if (Math.random() > chance) continue;
    const x = i % AV_N, y = Math.floor(i / AV_N);
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy])
      .filter(([a, b]) => a >= 0 && b >= 0 && a < AV_N && b < AV_N).map(([a, b]) => b * AV_N + a);
    const j = n[Math.floor(Math.random() * n.length)];
    if (!av.cells[j].inf && av.t >= av.cells[j].safe) av.cells[j].inf = true;
  }
  if (Math.random() < 0.06) { const j = Math.floor(Math.random() * av.cells.length); if (av.t >= av.cells[j].safe) av.cells[j].inf = true; } // it jumps
  const count = av.cells.filter(c => c.inf).length;
  if (count >= AV_LOSE) avFinish(false, count);
  else if (av.t >= AV_SECS) avFinish(true, count);
  mini4Draw('av');
}
function avFinish(survived, count) {
  av.running = false;
  av.over = true;
  clearInterval(avTimer);
  if (!survived) { av.msg = `worm.exe took over ${count} files. Scan again?`; return; }
  const n = mini4Win('av', Math.max(0.3, 1 - count / AV_LOSE));
  av.msg = `Scan complete. ${count} files still infected. ${n ? `+${fmtPx(n)} signal` : '(reward still recharging)'}`;
}
function avClick(i) {
  const c = av.cells[i];
  if (!av.running || !c.inf) return;
  c.inf = false;
  c.safe = av.t + 2; // freshly cleaned files resist for 2 seconds
}
function avHTML() {
  const count = av.cells.filter(c => c.inf).length;
  return `<div class="mini-head"><span>${av.running ? `${Math.max(0, Math.ceil(AV_SECS - av.t))}s left · ${count} infected` : 'worm.exe is back.'}</span>
      <button type="button" class="gbtn" data-o4="avstart">${av.running ? 'Restart' : 'Scan'}</button></div>
    <div class="av-grid">${av.cells.map((c, i) => `<button type="button" class="avc${c.inf ? ' inf' : ''}${av.running && av.t < c.safe ? ' safe' : ''}" data-o4="av:${i}">${c.inf ? '\u2620' : '\u2263'}</button>`).join('')}</div>
    <p class="mini-msg">${esc(av.msg || `Click infected files to clean them. Hold out ${AV_SECS} seconds; ${AV_LOSE} infected files and it wins.`)}</p>`;
}

const MINI4_HTML = { sol: solHTML, rev: revHTML, av: avHTML };
function mini4Draw(id) {
  const box = $(`o4-${id}-board`);
  if (box && os4Built) box.innerHTML = MINI4_HTML[id]();
}

// ---------------------------------------------------------------- desktop
let os4Built = false, os4Shown = false, o4Bound = [];
const o4Sig = {};
let dialing = null; // { lines, timers } while the modem is busy
let fileOpen = 'C:\\README.TXT';

const O4_TEXT = {
  sig: () => fmtPx(S.os4.sig),
  rate: () => `+${fmtPx(sigRate())}/s`,
  conns: () => `${S.os4.conns}/${CONNS.length}`,
  ram: () => `${usedKB()}K / ${ramKB()}K`,
  title: id => WIN4[id].title(),
  dialinfo: () => (nextConn() ? `${fmtPx(Math.min(S.os4.toward, nextConn().goal))} / ${fmtPx(nextConn().goal)} bits gathered` : 'every number has been dialed.'),
  memused: () => `${usedKB()}K used of ${ramKB()}K · ${ramKB() - usedKB()}K free`,
  pn: i => `x${S.os4.progs[i]}`,
  pr: i => `${fmtPx(progRate(i))}/s each · ${running4(PROGS[i].id) ? `${fmtPx(progRate(i) * S.os4.progs[i])}/s` : 'not running'}`,
  pc: i => `Buy · ${fmtPx(progCost(i))}`,
  hc: id => `Buy · ${fmtPx(HELPER_BY_ID[id].cost)}`,
  run: id => (running4(id) ? '\u25A0 Stop' : '\u25B6 Run'),
  baud: () => `${BAUDS[S.os4.baud].baud} baud · signal x${fmtD(baudX())}`,
  baudbtn: () => (BAUDS[S.os4.baud + 1] ? `Upgrade to ${BAUDS[S.os4.baud + 1].baud} baud · ${fmtPx(BAUDS[S.os4.baud + 1].cost)}` : 'Fastest modem installed'),
  raminfo: () => `${ramKB()}K installed`,
  rambtn: () => (RAM_UPS[S.os4.ram] ? `Install ${RAM_UPS[S.os4.ram].name} (${RAM_UPS[S.os4.ram].kb}K) · ${fmtPx(RAM_UPS[S.os4.ram].cost)}` : 'Memory maxed out'),
  saver: () => `Screensaver: ${S.os4.saver ? 'On' : 'Off'} (after ${SAVER_IDLE}s idle, signal x${SAVER_X} while it runs)`,
  mini: id => (mini4Ready(id)
    ? `Win: +${fmtPx(mini4Reward(id))} signal`
    : `Reward recharging: ${fmtTime(Math.ceil(((S.os4.ready[id] || 0) - Date.now()) / 1000))}`),
  nowplaying: () => `${S.opts.music ? '\u25B6' : '\u275A\u275A'} ${(PLAYLIST.find(([id]) => id === S.os4.track) || PLAYLIST[0])[1]}`,
};
const O4_DIS = {
  prog: i => S.os4.sig < progCost(i),
  helper: id => S.os4.sig < HELPER_BY_ID[id].cost,
  run: id => !owned4(id) || (!running4(id) && !fits4(id)),
  dial: () => !canDial() || !!dialing,
  baud: () => !BAUDS[S.os4.baud + 1] || S.os4.sig < BAUDS[S.os4.baud + 1].cost,
  ram: () => !RAM_UPS[S.os4.ram] || S.os4.sig < RAM_UPS[S.os4.ram].cost,
};
const O4_W = {
  dial: () => (nextConn() ? Math.min(1, S.os4.toward / nextConn().goal) : 1),
  vu: () => Math.min(1, Music.level() * 9),
};
function o4Bind() {
  o4Bound = [];
  for (const el of document.querySelectorAll('#os4 [data-x], #os4 [data-xd], #os4 [data-xw]')) {
    for (const [attr, kind] of [['x', 't'], ['xd', 'd'], ['xw', 'w']]) {
      const v = el.dataset[attr];
      if (v) { const [k, a] = v.split(':'); o4Bound.push([el, kind, k, argOf(a)]); }
    }
  }
}
function o4Refresh() {
  for (const [el, kind, k, a] of o4Bound) {
    if (kind === 't') setText(el, O4_TEXT[k](a));
    else if (kind === 'd') { const dis = !!O4_DIS[k](a); if (el.disabled !== dis) el.disabled = dis; }
    else { const w = pct(O4_W[k](a)); if (el.style.width !== w) el.style.width = w; }
  }
}

const ICON4 = {
  term: '<i class="i4 i-term">ATDT</i>', mem: '<i class="i4 i-mem"><b></b><b></b><b></b></i>', ctrl: '<i class="i4 i-ctrl">\u2699</i>',
  files: '<i class="i4 i-files">\u25A4</i>', dos: '<i class="i4 i-dos">C:\\</i>', media: '<i class="i4 i-media">\u266B</i>',
  sol: '<i class="i4 i-sol">A\u2660</i>', rev: '<i class="i4 i-rev">\u25CF\u25CB</i>', av: '<i class="i4 i-av">\u2620</i>',
};
function win4Body(id) {
  switch (id) {
    case 'pm': return PM_GROUPS.map(([name, ids]) => `<fieldset class="pm-group"><legend>${name}</legend>${ids.map(w =>
      `<button type="button" class="pm-icon" data-o4="open:${w}">${ICON4[w]}<span>${WIN4[w].label}</span></button>`).join('')}</fieldset>`).join('');
    case 'term': return `<div id="o4Phone"></div>
      <p class="row"><span class="meter"><i data-xw="dial"></i></span> <span class="dim" data-x="dialinfo"></span></p>
      <div class="btnrow"><button type="button" class="gbtn big" data-o4="dial" data-xd="dial">Dial</button></div>
      <pre id="o4Modem" class="modem"></pre>
      <p class="dim">Session log</p><pre id="o4Log" class="o4log"></pre>`;
    case 'mem': return `<div class="rambar" id="o4RamBar"></div><p class="dim" data-x="memused"></p>
      <div id="o4Progs"></div>`;
    case 'ctrl': return `<fieldset class="cp"><legend>Modem</legend><p data-x="baud"></p>
        <button type="button" class="gbtn" data-o4="baud" data-xd="baud" data-x="baudbtn"></button></fieldset>
      <fieldset class="cp"><legend>Memory</legend><p data-x="raminfo"></p>
        <button type="button" class="gbtn" data-o4="ram" data-xd="ram" data-x="rambtn"></button></fieldset>
      <fieldset class="cp"><legend>Desktop</legend><p data-x="saver"></p>
        <div class="btnrow"><button type="button" class="gbtn" data-o4="saver">On / Off</button>
        <button type="button" class="gbtn" data-o4="saverpreview">Preview</button></div></fieldset>`;
    case 'files': return '<div class="fm"><div class="fm-list" id="o4Files"></div><pre class="fm-view" id="o4FileView"></pre></div>';
    case 'media': return `<p class="np" data-x="nowplaying"></p>
      <div class="vu"><i data-xw="vu"></i></div>
      <div class="btnrow"><button type="button" class="gbtn" data-o4="trk:-1" aria-label="Previous">\u23EE</button>
        <button type="button" class="gbtn" data-o4="playpause" aria-label="Play or pause">\u23EF</button>
        <button type="button" class="gbtn" data-o4="trk:1" aria-label="Next">\u23ED</button></div>
      <div class="tracks" id="o4Tracks"></div>`;
    case 'sol': case 'rev': case 'av': return `<p class="mini-reward" data-x="mini:${id}"></p><div id="o4-${id}-board"></div>`;
    case 'dos': return `<pre class="dos-box">C:\\INCR&gt; dir \\ERAS

 INCR10   EXE   the terminal, 1987
 INCR20   EXE   the graphical environment
 INCR30   EXE   the other side of the door

C:\\INCR&gt; _</pre>
      <div class="btnrow"><button type="button" class="gbtn" data-o4="visit:1">INCR10.EXE</button>
      <button type="button" class="gbtn" data-o4="visit:2">INCR20.EXE</button>
      <button type="button" class="gbtn" data-o4="visit:3">INCR30.EXE</button></div>
      <p class="dim">Old saves wait exactly as you left them. Signal keeps coming meanwhile. Come back with /win4 or the "INCR.OS 4.0" button.</p>`;
  }
  return '';
}

function os4Build() {
  if (os4Built) return;
  os4Built = true;
  $('os4').innerHTML = `
    <header class="o4-bar">
      <b class="o4-logo">INCR.OS 4.0</b>
      <div class="o4-stats">
        <span class="o4-stat"><span class="dim">SIGNAL</span> <b data-x="sig"></b> <span class="dim" data-x="rate"></span></span>
        <span class="o4-stat"><span class="dim">CALLS</span> <b data-x="conns"></b></span>
        <span class="o4-stat o4-ram"><span class="dim">RAM</span> <span data-x="ram"></span></span>
      </div>
      <div class="o4-btns">
        <button type="button" class="gbtn" data-o4="open:pm">Programs</button>
        <button type="button" class="gbtn" data-o4="ach">Achievements</button>
        <button type="button" class="gbtn" data-o4="music" id="o4Music" aria-label="Music on/off">&#9835;</button>
      </div>
    </header>
    <div class="o4-desk" id="o4Wins">${WINS4.map(w => `
      <section class="w4win hidden" id="w4-${w.id}" data-win="${w.id}" aria-label="${w.label}">
        <div class="w4-title">${w.fixed ? '<span class="w4-sys"></span>' : `<button type="button" class="w4-sys" data-o4="close:${w.id}" aria-label="Close"></button>`}
          <span class="w4-name" data-x="title:${w.id}"></span>
          ${w.fixed ? '' : `<button type="button" class="w4-min" data-o4="close:${w.id}" aria-label="Minimize">&#9660;</button>`}</div>
        <div class="w4-body">${win4Body(w.id)}</div>
      </section>`).join('')}
    </div>
    <div id="o4Dlg" class="o4-dlg hidden" role="dialog" aria-live="polite">
      <div class="dlg-who" id="o4Who"></div>
      <div class="dlg-text" id="o4Say"></div>
      <form class="dlg-ask hidden" id="o4Ask"><input id="o4Line" maxlength="80" autocomplete="off" placeholder="type anything" aria-label="your answer">
        <button type="submit" class="gbtn">OK</button></form>
      <div class="dlg-next" id="o4Next">click to continue &#9660;</div>
    </div>
    <canvas id="o4Saver" class="o4-saver hidden" aria-hidden="true"></canvas>`;
  solNew(); revNew(); avNew();
  for (const id of Object.keys(MINI4)) mini4Draw(id);
  o4Bind();
}

// windows: same idea as INCR.OS 3.0, plus a Program Manager that can't be closed
function o4Top() {
  let best = null;
  for (const w of WINS4) {
    const l = S.os4.layout[w.id];
    if (l.open && (!best || l.z > S.os4.layout[best].z)) best = w.id;
  }
  return best;
}
function o4Focus(id) {
  const l = S.os4.layout[id];
  if (o4Top() !== id || WINS4.some(w => w.id !== id && S.os4.layout[w.id].z >= l.z)) l.z = ++S.os4.zTop;
  o4Layout();
}
function o4Open(id) { S.os4.layout[id].open = true; o4Focus(id); }
function o4Close(id) { if (!WIN4[id].fixed) { S.os4.layout[id].open = false; o4Layout(); } }
const os4Narrow = () => !!(window.matchMedia && matchMedia('(max-width: 700px)').matches);
function o4Layout() {
  if (!os4Built) return;
  const area = $('o4Wins'), narrow = os4Narrow(), top = o4Top();
  $('os4').classList.toggle('narrow', narrow);
  for (const w of WINS4) {
    const el = $(`w4-${w.id}`), l = S.os4.layout[w.id];
    el.classList.toggle('hidden', !l.open);
    el.classList.toggle('active', w.id === top);
    el.style.zIndex = l.z;
    if (narrow || !l.open) { el.style.left = el.style.top = ''; continue; }
    const W = area.clientWidth, H = area.clientHeight;
    el.style.left = `${Math.max(0, Math.min(l.x * W, W - el.offsetWidth))}px`;
    el.style.top = `${Math.max(0, Math.min(l.y * H, H - 48))}px`;
  }
}

function rebuild4(key, sig, box, html) {
  if (o4Sig[key] === sig || !box) return false;
  o4Sig[key] = sig;
  box.innerHTML = html();
  return true;
}
const RAM_COLORS = ['#000080', '#008080', '#800080', '#808000', '#800000', '#008000', '#0000ff', '#ff00ff', '#00aaaa', '#aa5500', '#555555'];
function os4Lists() {
  let changed = false;
  const o = S.os4;
  changed = rebuild4('phone', `${o.conns}`, $('o4Phone'), () => `<table class="phone">${CONNS.map((c, i) =>
    `<tr class="${i < o.conns ? 'done' : i === o.conns ? 'next' : 'locked'}"><td>${c.num}</td><td>${i <= o.conns ? c.name : '???'}</td><td>${i < o.conns ? '\u2713 called' : i === o.conns ? 'next' : ''}</td></tr>`).join('')}</table>`) || changed;
  const progs = PROGS.map((_, i) => i).filter(progShown);
  const helpers = HELPERS.map((_, k) => k).filter(helperShown);
  changed = rebuild4('progs', `${progs}|${helpers}|${HELPERS.map(h => +!!o.helpers[h.id])}`, $('o4Progs'), () =>
    progs.map(i => { const p = PROGS[i]; return `
      <div class="prog"><div class="pg-info"><b>${p.name}</b> <span data-x="pn:${i}"></span> <span class="kb">${p.kb}K</span>
        <div class="dim" data-x="pr:${i}"></div></div>
        <div class="pg-btns"><button type="button" class="gbtn" data-o4="prog:${i}" data-xd="prog:${i}" data-x="pc:${i}"></button>
        <button type="button" class="gbtn" data-o4="progmax:${i}" data-xd="prog:${i}">Max</button>
        <button type="button" class="gbtn runbtn" data-o4="run:${p.id}" data-xd="run:${p.id}" data-x="run:${p.id}"></button></div></div>`; }).join('') +
    (helpers.length ? '<p class="dim">Utilities</p>' : '') +
    helpers.map(k => { const h = HELPERS[k]; return `
      <div class="prog"><div class="pg-info"><b>${h.name}</b> <span class="kb">${h.kb}K</span><div class="dim">${h.desc}</div></div>
        <div class="pg-btns">${o.helpers[h.id]
          ? `<button type="button" class="gbtn runbtn" data-o4="run:${h.id}" data-xd="run:${h.id}" data-x="run:${h.id}"></button>`
          : `<button type="button" class="gbtn" data-o4="helper:${h.id}" data-xd="helper:${h.id}" data-x="hc:${h.id}"></button>`}</div></div>`; }).join('')) || changed;
  // the memory bar: one colored block per running program
  const items = [...PROGS, ...HELPERS].filter(p => running4(p.id));
  rebuild4('rambar', `${items.map(p => p.id)}|${ramKB()}`, $('o4RamBar'), () =>
    items.map((p, k) => `<i style="width:${(p.kb / ramKB() * 100).toFixed(2)}%;background:${RAM_COLORS[k % RAM_COLORS.length]}" title="${p.name} ${p.kb}K"></i>`).join(''));
  const files = FILES4.filter(f => f.when());
  rebuild4('files', `${files.length}|${fileOpen}`, $('o4Files'), () => files.map(f =>
    `<button type="button" class="fm-file${f.path === fileOpen ? ' on' : ''}" data-o4="file:${files.indexOf(f)}">${f.path}</button>`).join(''));
  const f = FILES4.find(x => x.path === fileOpen);
  if ($('o4FileView')) setText($('o4FileView'), f ? f.text() : '');
  rebuild4('tracks', `${o.track}`, $('o4Tracks'), () => PLAYLIST.map(([id, name], k) =>
    `<button type="button" class="trk${id === o.track ? ' on' : ''}" data-o4="track:${k}">${k + 1}. ${name}</button>`).join(''));
  if (o4Sig.log !== o.chapter && $('o4Log')) {
    o4Sig.log = o.chapter;
    $('o4Log').textContent = CHAPTERS4.slice(0, o.chapter).map((ch, k) =>
      `--- ${k === 0 ? 'arrival' : k <= CONNS.length ? CONNS[k - 1].name : 'line 1'} ---\n` +
      ch.map(([who, t]) => `${who === 'you' ? 'me' : who === 'sys' ? '???' : who === 'ask' ? '???' : '>'} ${typeof t === 'function' ? t() : t}`).join('\n')).join('\n\n') || '(empty)';
  }
  if (changed) o4Bind();
}

function os4Render() {
  const on = os4On() && !setupRunning;
  const was = os4Shown;
  os4Shown = on;
  if (on) $('app').classList.add('hidden');
  if (on !== was) {
    $('os4').classList.toggle('hidden', !on);
    document.body.classList.toggle('os4-mode', on);
    if (on) { os4Build(); o4Layout(); }
    else if (!introRunning && !os3On()) $('app').classList.remove('hidden');
    if (!on) stopSaver();
  }
  if (!on) return;
  os4Lists();
  o4Refresh();
  $('o4Music').classList.toggle('off', !S.opts.music);
  saverCheck();
  const c = S.os4.chapter;
  if (!dlg4 && ((c < CHAPTERS4.length - 1 && c <= S.os4.conns) || (c === CHAPTERS4.length - 1 && S.os4.line))) startChapter4(c);
}

// ---------------------------------------------------------------- the modem
function dial() {
  if (!canDial() || dialing) return;
  const c = nextConn();
  const box = $('o4Modem');
  dialing = { timers: [] };
  box.textContent = '';
  Music.fx('modem');
  const steps = [[0, `ATDT ${c.num}`], [700, 'RINGING...'], [1500, '~~ handshake ~~'], [2700, `CONNECT ${BAUDS[S.os4.baud].baud}`]];
  for (const [ms, text] of steps) dialing.timers.push(setTimeout(() => { box.textContent += text + '\n'; }, ms));
  dialing.timers.push(setTimeout(() => {
    dialing = null;
    connect();
    box.textContent += `connected to ${c.name}.\n`;
    save(true);
  }, 3200));
}

// ---------------------------------------------------------------- dialogue
let dlg4 = null;
function startChapter4(k) {
  if (!os4Built) return;
  dlg4 = { k, i: 0, text: '', n: 0, timer: null };
  $('o4Dlg').classList.remove('hidden');
  dlg4Show();
}
function dlg4Show() {
  const [who, t] = CHAPTERS4[dlg4.k][dlg4.i];
  dlg4.text = typeof t === 'function' ? t() : t;
  dlg4.n = 0;
  const box = $('o4Dlg');
  box.classList.toggle('sys', who === 'sys' || who === 'ask');
  box.classList.toggle('bbs', who === 'bbs');
  setText($('o4Who'), who === 'you' ? 'YOU' : who === 'bbs' ? 'MODEM' : '???');
  setText($('o4Say'), '');
  $('o4Ask').classList.add('hidden');
  $('o4Next').classList.remove('hidden');
  clearInterval(dlg4.timer);
  const fast = reduceMotion();
  dlg4.timer = setInterval(() => {
    dlg4.n = fast ? dlg4.text.length : dlg4.n + 1;
    setText($('o4Say'), dlg4.text.slice(0, dlg4.n));
    if (dlg4.n % 3 === 1 && dlg4.text[dlg4.n - 1] !== ' ') Music.fx(who === 'you' ? 'voice' : 'voice-sys');
    if (dlg4.n >= dlg4.text.length) dlg4Typed();
  }, who === 'bbs' ? 16 : 28);
}
function dlg4Typed() {
  clearInterval(dlg4.timer);
  dlg4.timer = null;
  setText($('o4Say'), dlg4.text);
  if (CHAPTERS4[dlg4.k][dlg4.i][0] === 'ask') { // the question waits for an answer
    $('o4Ask').classList.remove('hidden');
    $('o4Next').classList.add('hidden');
    $('o4Line').focus();
  }
}
function dlg4Next() {
  if (!dlg4) return;
  if (dlg4.timer) { dlg4Typed(); return; }
  if (CHAPTERS4[dlg4.k][dlg4.i][0] === 'ask') return;
  if (++dlg4.i < CHAPTERS4[dlg4.k].length) { dlg4Show(); return; }
  S.os4.chapter = dlg4.k + 1;
  closeDialogue4();
  save(true);
}
function closeDialogue4() {
  if (!dlg4) return;
  clearInterval(dlg4.timer);
  dlg4 = null;
  $('o4Dlg').classList.add('hidden');
}

// ---------------------------------------------------------------- screensaver: flying daemons
let lastInput = Date.now(), saverRaf = null;
function saverCheck() {
  if (!saverOn && S.os4.saver && !dlg4 && !achMenu && !(av && av.running) && Date.now() - lastInput > SAVER_IDLE * 1000) startSaver();
}
function startSaver() {
  if (saverOn) return;
  saverOn = true;
  const cv = $('o4Saver');
  cv.classList.remove('hidden');
  cv.width = 320;
  cv.height = Math.max(160, Math.round(320 * innerHeight / Math.max(1, innerWidth)));
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  // the daemon from the second picture, as a sprite
  const art = picArt(1), sprite = document.createElement('canvas');
  sprite.width = 16; sprite.height = 14;
  const sg = sprite.getContext('2d');
  for (let y = 0; y < 14; y++) for (let x = 0; x < 16; x++) {
    const c = art[(y + 1) * PIC_W + x + 4];
    if (c) { sg.fillStyle = COLORS[c].hex; sg.fillRect(x, y, 1, 1); }
  }
  const W = cv.width, H = cv.height;
  const flyers = Array.from({ length: 12 }, () => ({ x: Math.random() * W * 1.5, y: Math.random() * H - H * 0.5, v: 0.4 + Math.random() * 0.8, s: 1 + Math.round(Math.random()) }));
  const stars = Array.from({ length: 60 }, () => ({ x: Math.random() * W, y: Math.random() * H }));
  const frame = () => {
    if (!saverOn) return;
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#556';
    for (const s of stars) g.fillRect(s.x, s.y, 1, 1);
    for (const f of flyers) {
      f.x -= f.v * 1.4; f.y += f.v;
      if (f.x < -40 || f.y > H + 30) { f.x = W + Math.random() * W * 0.5; f.y = -30 - Math.random() * H * 0.5; }
      const wing = Math.floor(Date.now() / 160 + f.v * 10) % 2;
      g.drawImage(sprite, Math.round(f.x), Math.round(f.y), 16 * f.s, 14 * f.s);
      g.fillStyle = '#aaa';
      g.fillRect(Math.round(f.x) - 3 * f.s, Math.round(f.y) + (wing ? 2 : 6) * f.s, 3 * f.s, 2 * f.s); // a little wing
      g.fillRect(Math.round(f.x) + 16 * f.s, Math.round(f.y) + (wing ? 2 : 6) * f.s, 3 * f.s, 2 * f.s);
    }
    g.fillStyle = '#334';
    g.font = '8px monospace';
    g.fillText(`signal x${SAVER_X} while you're away`, 6, H - 6);
    saverRaf = requestAnimationFrame(frame);
  };
  frame();
}
function stopSaver() {
  if (!saverOn) return;
  saverOn = false;
  cancelAnimationFrame(saverRaf);
  $('o4Saver').classList.add('hidden');
}

// ---------------------------------------------------------------- actions
function os4Act(act) {
  const [k, a, b, c] = act.split(':');
  const i = +a;
  switch (k) {
    case 'open': o4Open(a); break;
    case 'close': o4Close(a); break;
    case 'prog': buyProg(i); break;
    case 'progmax': buyProgMax(i); break;
    case 'helper': buyHelper(a); break;
    case 'run': if (!toggleRun(a)) log('not enough memory. stop something first, or buy RAM.', 'w'); break;
    case 'dial': dial(); break;
    case 'baud': buyBaud(); break;
    case 'ram': buyRam(); break;
    case 'saver': S.os4.saver = !S.os4.saver; break;
    case 'saverpreview': startSaver(); break;
    case 'file': { const files = FILES4.filter(f => f.when()); if (files[i]) fileOpen = files[i].path; break; }
    case 'track': S.os4.track = PLAYLIST[i][0]; if (!S.opts.music) $('musicBtn').click(); break;
    case 'trk': { const n = PLAYLIST.findIndex(([id]) => id === S.os4.track); S.os4.track = PLAYLIST[(n + i + PLAYLIST.length) % PLAYLIST.length][0]; break; }
    case 'playpause': case 'music': $('musicBtn').click(); break;
    case 'sol': solClick(a, +b, c === undefined ? undefined : +c); mini4Draw('sol'); break;
    case 'solauto': solAuto(); solCheckWin(); mini4Draw('sol'); break;
    case 'solnew': solNew(); mini4Draw('sol'); break;
    case 'rev': revClick(i); mini4Draw('rev'); break;
    case 'revnew': clearTimeout(revTimer); revNew(); mini4Draw('rev'); break;
    case 'av': avClick(i); mini4Draw('av'); break;
    case 'avstart': avStart(); mini4Draw('av'); break;
    case 'visit': os4Visit(a); break;
    case 'ach': openAchMenu(); break;
  }
  os4Render();
}
function os4Visit(era) {
  S.os4.on = false;
  closeDialogue4();
  if (era === '3') S.os3.on = true;
  else {
    S.os3.on = false;
    if (era === '1') S.gui.on = false;
    else { S.gui.win1 = true; S.gui.on = true; S.gui.declined = false; }
    log(`INCR.OS ${era}.0 loaded. everything is where you left it.`, 'ok');
    out('signal keeps coming meanwhile. /win4 takes you back.', 'dim');
  }
  guiFlash();
  setPrompt();
  save(true);
}
function os4Return() {
  if (!S.os4.unlocked) return;
  S.os4.on = true;
  guiFlash();
  save(true);
}

function wireOs4() {
  const root = $('os4');
  os4Build();
  root.addEventListener('click', e => {
    if (e.target.closest('#o4Ask')) return;
    if (e.target.closest('#o4Dlg')) { dlg4Next(); return; }
    const win = e.target.closest('.w4win');
    const el = e.target.closest('[data-o4]');
    if (win && !(el && el.dataset.o4.startsWith('close:'))) o4Focus(win.dataset.win);
    if (el && !el.disabled) os4Act(el.dataset.o4);
  });
  $('o4Ask').addEventListener('submit', e => {
    e.preventDefault();
    if (!dlg4 || !answerLine($('o4Line').value)) return;
    S.os4.chapter = dlg4.k + 1;
    closeDialogue4();
    save(true);
    os4Render();
  });
  // drag windows by their title bar
  let drag = null;
  root.addEventListener('pointerdown', e => {
    const bar = e.target.closest('.w4-title');
    if (!bar || e.target.closest('[data-o4]') || os4Narrow()) return;
    const win = bar.parentElement, area = $('o4Wins').getBoundingClientRect(), r = win.getBoundingClientRect();
    o4Focus(win.dataset.win);
    drag = { id: win.dataset.win, dx: e.clientX - r.left, dy: e.clientY - r.top, area };
    bar.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  root.addEventListener('pointermove', e => {
    if (!drag) return;
    const l = S.os4.layout[drag.id], a = drag.area;
    l.x = Math.max(0, Math.min(1, (e.clientX - a.left - drag.dx) / a.width));
    l.y = Math.max(0, Math.min(1, (e.clientY - a.top - drag.dy) / a.height));
    o4Layout();
  });
  const stop = () => { drag = null; };
  root.addEventListener('pointerup', stop);
  root.addEventListener('pointercancel', stop);
  window.addEventListener('resize', o4Layout);
  // any input wakes the screen up
  const wake = () => { lastInput = Date.now(); stopSaver(); };
  for (const type of ['pointerdown', 'keydown', 'wheel', 'touchstart']) window.addEventListener(type, wake, { passive: true, capture: true });
  document.addEventListener('keydown', e => {
    if (dlg4 && os4On() && !achMenu && (e.key === 'Enter' || e.key === ' ') && e.target.id !== 'o4Line') { e.preventDefault(); dlg4Next(); }
  });
}

// ---------------------------------------------------------------- setup: from 3.0 to 4.0
let setupRunning = false;
const SETUP_FILES = ['KERNEL.SYS', 'DAEMON.DRV', 'SCREEN.PIC > WALLPAPR.BMP', 'DOOR.PIC', 'YOU.PIC', 'PROGMAN.EXE', 'TERMINAL.EXE',
  'ZMODEM.EXE', 'HIMEM.SYS', 'MPLAYER.EXE', 'SOL.EXE', 'REVERSI.EXE', 'WORM.EXE (quarantined)', 'VOICE.DLL'];
const setupReady = () => S.os3.unlocked && S.os3.pics >= PICTURES.length && S.os3.chapter >= CHAPTERS.length && !S.os4.unlocked;
function playSetup() {
  if (setupRunning || !setupReady() || !$('setup4')) return;
  setupRunning = true;
  closeAchMenu();
  if (typeof closeDialogue === 'function') closeDialogue();
  $('o3Setup') && $('o3Setup').classList.add('hidden');
  Music.hold(true);
  const box = $('setup4'), txt = $('setup4Text'), barEl = $('setup4Bar');
  box.classList.remove('hidden');
  let i = 0;
  const fast = reduceMotion();
  const next = () => {
    if (i <= SETUP_FILES.length) {
      barEl.style.width = `${Math.round(i / SETUP_FILES.length * 100)}%`;
      setText(txt, i < SETUP_FILES.length ? `Copying: ${SETUP_FILES[i]}` : 'Setup will now restart your computer.');
      if (i % 3 === 0) Music.fx('voice-sys');
      i++;
      setTimeout(next, fast ? 30 : i > SETUP_FILES.length ? 1200 : 220 + Math.random() * 160);
      return;
    }
    box.classList.add('hidden');
    $('splash4').classList.remove('hidden');
    Music.chime();
    setTimeout(() => {
      $('splash4').classList.add('hidden');
      S.os4.unlocked = true;
      S.os4.on = true;
      setupRunning = false;
      Music.hold(false);
      lastInput = Date.now();
      document.body.classList.add('os4-opening');
      setTimeout(() => document.body.classList.remove('os4-opening'), 1400);
      checkAch();
      save(true);
    }, fast ? 300 : 2800);
  };
  next();
}
