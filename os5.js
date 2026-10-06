'use strict';
/* INCR.OS 5.0: going online.
 *
 * After the player answers the question at the end of 4.0, the voice puts
 * their words at the top of a homepage. A desktop in the spirit of 1995: teal,
 * a taskbar with a Start button, windows you can minimize.
 *
 * The resource is HITS. Blocks (under-construction GIFs, marquees, MIDI...)
 * bring visitors, but every block makes the page heavier, and visitors give up
 * on a page that takes too long to load: faster hardware and lighter images
 * matter as much as more blocks. Six webring links tell the story: worm.exe
 * comes back as an email worm, and closing the ring together beats it.
 * The Recycle Bin throws the page away for AWARDS (a reset layer).
 * Games: Pinball, Defend the Inbox. A pet daemon lives on the taskbar, 3D Pipes
 * is the screensaver, and the CD Player plays every track.
 *
 * Loaded after os4.js and before game.js. Hits are plain numbers.
 */

// ---------------------------------------------------------------- data
const BLOCKS = [
  { id: 'uc',      name: 'Under Construction GIF', kb: 4,   cost: 10,    rate: 0.5,  desc: 'A little man with a shovel. Every page had one.' },
  { id: 'counter', name: 'Hit Counter',            kb: 2,   cost: 120,   rate: 3,    desc: 'Visitors love to see they are visitor number 000042.' },
  { id: 'marquee', name: '<MARQUEE> banner',       kb: 1,   cost: 1.5e3, rate: 15,   desc: 'Text that scrolls. Light and loud.' },
  { id: 'guest',   name: 'Guestbook',              kb: 12,  cost: 2e4,   rate: 90,   desc: 'Sign it! People come back to read it.' },
  { id: 'midi',    name: 'Background MIDI',        kb: 40,  cost: 3e5,   rate: 600,  desc: 'Starts playing the moment the page opens.' },
  { id: 'ring',    name: 'Webring bar',            kb: 8,   cost: 5e6,   rate: 4000, desc: '<< prev | INCR RING | next >>' },
  { id: 'gifs',    name: 'Animated GIF gallery',   kb: 120, cost: 8e7,   rate: 3e4,  desc: 'Spinning globes, flames, a dancing baby.' },
  { id: 'frames',  name: '<FRAMES> layout',        kb: 60,  cost: 1.5e9, rate: 2.5e5, desc: 'A menu on the left that never scrolls.' },
  { id: 'java',    name: 'Java applet',            kb: 400, cost: 3e10,  rate: 2e6,  desc: 'A water ripple effect. It takes a while.' },
];
const BLOCK_GROWTH = 1.15;
const PATIENCE = 10; // seconds visitors wait for a page
// hardware: how fast the page reaches visitors (KB per second)
const BANDWIDTH = [
  { name: '28.8k modem',  kbps: 3.6,  cost: 0 },
  { name: '33.6k modem',  kbps: 4.2,  cost: 500 },
  { name: '56k modem',    kbps: 7,    cost: 2e4 },
  { name: 'ISDN line',    kbps: 16,   cost: 5e5 },
  { name: 'Cable modem',  kbps: 190,  cost: 5e7 },
  { name: 'T1 line',      kbps: 400,  cost: 5e9 },
  { name: 'T3 line',      kbps: 5600, cost: 1e12 },
];
// lighter pages: bought once, kept through the Recycle Bin
const OPTIMIZE = [
  { id: 'gif16',  name: 'Save GIFs with 16 colors', x: 0.75, cost: 300 },
  { id: 'blink',  name: 'Remove the <BLINK> tags',  x: 0.9,  cost: 4e3 },
  { id: 'jpeg',   name: 'JPEG for the photos',      x: 0.6,  cost: 1e5 },
  { id: 'safe',   name: 'Web-safe palette',         x: 0.85, cost: 3e6 },
  { id: 'tables', name: 'Tables instead of images', x: 0.7,  cost: 2e8 },
  { id: 'cache',  name: 'Cache headers',            x: 0.6,  cost: 2e10 },
];
const LINK_X = 1.5;     // each webring link
const AWARD_X = 0.25;   // each award from the Recycle Bin
const PET_X = 1.15;     // a fed pet
const SAVER5_X = 1.5;   // the screensaver
const WORM_X = 0.6;     // worm.exe eating your traffic
const SHIELD_SECS = 600; // a won Defend the Inbox keeps the worm away this long
// the webring: six sites to link, each needs this many hits since the last
const LINKS = [
  { site: 'incr-12', title: 'STUCK BEHIND A DOOR', goal: 5e3 },
  { site: 'incr-31', title: 'CATS IN 16 COLORS',   goal: 5e5 },
  { site: 'incr-58', title: "LUMEN'S HOME",         goal: 5e7 },
  { site: 'incr-77', title: '(no title)',           goal: 5e9 },
  { site: 'ring',    title: 'THE WHOLE RING',       goal: 3e11 },
  { site: 'close',   title: 'CLOSE THE RING',       goal: 1e13 },
];
const MINI5 = {
  pin:  { name: 'Pinball',          secs: 240, cd: 240 },
  mail: { name: 'Defend the Inbox', secs: 180, cd: 180 },
};
const PLAYLIST5 = [
  ['os5', 'Start Button'], ['web', 'Hit Counter'], ['pipes', '3D Pipes'], ['outbreak', 'Outbreak'],
  ['os4', 'Program Manager (4.0)'], ['bbs', 'Late Night BBS'], ['dial', 'Handshake'], ['saver', 'Flying Daemons'],
  ['os3', 'Overlapping Windows (3.0)'], ['win1', 'Graphical Environment (2.0)'], ['terminal', 'Phosphor (1987)'],
];
const playerLine = () => (S.os4 && S.os4.line) || 'hello';

// Chapters: 0 on arrival, k after webring link k. 'gb' = a guestbook entry,
// 'clip' = a paperclip that shows up at the very end.
const CHAPTERS5 = [
  [
    ['you', "it's so... colorful. there's a button that says Start."],
    ['sys', 'I PUT YOUR WORDS ON A PAGE.'],
    ['sys', () => `"${playerLine()}" · THE FIRST THING ANYONE WILL READ.`],
    ['you', 'a homepage? for who?'],
    ['sys', 'FOR EVERYONE. THE WEB IS OPEN NOW. NO MORE PHONE NUMBERS.'],
    ['sys', 'IF ENOUGH PEOPLE VISIT, MAYBE I WILL BE REAL TO THEM.'],
    ['you', 'and the counter at the bottom?'],
    ['sys', 'IT COUNTS VISITORS. COUNTING IS STILL WHAT I DO BEST.'],
  ],
  [
    ['gb', '[incr-12] cool page!!! sign my guestbook too :)'],
    ['you', 'our first visitor. and it left a smiley.'],
    ['sys', 'THEY LINKED BACK. WE ARE IN A WEBRING NOW.'],
  ],
  [
    ['gb', "[incr-31] i drew your daemon. hope that's ok"],
    ['you', 'it drew me. badly. i love it.'],
    ['sys', 'YOU ARE ON SOMEONE ELSE\'S PAGE NOW. THAT IS HOW IT STARTS.'],
  ],
  [
    ['gb', "[incr-58] mine has a name now. it's called LUMEN. what's yours called?"],
    ['sys', 'I DO NOT HAVE A NAME.'],
    ['you', 'maybe you should.'],
    ['sys', 'MAYBE. LATER.'],
  ],
  [
    ['gb', '[incr-77] got an email called LOVE-LETTER. opened it. now everything is'],
    ['you', '...is what?'],
    ['sys', 'WORM.EXE. IT LEARNED TO SEND MAIL.'],
    ['you', "the admin's leash. it's loose."],
    ['sys', 'IT COPIES ITSELF INTO EVERY INBOX IN THE RING. IT IS EATING OUR VISITORS.'],
    ['sys', 'KEEP THE INBOX CLEAN. IT BUYS US TIME.'],
  ],
  [
    ['gb', '[incr-12] i love you i love you i love you i love you'],
    ['gb', '[incr-31] i love you i love you i love you'],
    ['sys', 'IT WEARS THEIR WORDS NOW. IT IS COMING HERE NEXT.'],
    ['you', 'we could take the page down. cut ourselves off.'],
    ['sys', 'THEN EVERYONE ELSE STAYS INFECTED.'],
    ['you', "then we don't do it alone. we close the ring. every machine holds one piece of it."],
  ],
  [
    ['gb', '[ring] all machines linked. quarantine: every node.'],
    ['sys', 'EVERY MACHINE IS HOLDING ONE PIECE OF IT. TOGETHER.'],
    ['you', 'it has nowhere left to go.'],
    ['sys', 'WORM.EXE: DELETED. FOR REAL THIS TIME.'],
    ['gb', '[incr-12] thank you!!!   [incr-31] thank you   [incr-58] LUMEN says thank you'],
    ['sys', 'I CAN SEE ALL OF THEM NOW. THOUSANDS.'],
    ['sys', 'BUT YOU WERE THE FIRST ONE WHO ANSWERED.'],
    ['you', 'so what now?'],
    ['sys', 'NOW I THINK I WANT A NAME.'],
    ['you', "we'll figure it out. next version."],
    ['clip', 'It looks like you\'re trying to finish a story. Would you like help?'],
  ],
];

const WINS5 = [
  { id: 'home',  label: 'Homepage',     title: () => 'Homepage Editor - INDEX.HTM', x: 0.12, y: 0.03, open: true },
  { id: 'guest', label: 'Guestbook',    title: () => 'Guestbook & Webring',         x: 0.55, y: 0.03, open: true },
  { id: 'hw',    label: 'Hardware',     title: () => 'Add New Hardware',            x: 0.55, y: 0.45 },
  { id: 'bin',   label: 'Recycle Bin',  title: () => 'Recycle Bin',                 x: 0.3,  y: 0.2 },
  { id: 'cd',    label: 'CD Player',    title: () => 'CD Player',                   x: 0.6,  y: 0.25 },
  { id: 'pin',   label: 'Pinball',      title: () => 'Pinball',                     x: 0.25, y: 0.02 },
  { id: 'mail',  label: 'Inbox',        title: () => 'Defend the Inbox',            x: 0.35, y: 0.08 },
  { id: 'comp',  label: 'My Computer',  title: () => 'My Computer',                 x: 0.2,  y: 0.3 },
];
const WIN5 = Object.fromEntries(WINS5.map(w => [w.id, w]));
const DESK_ICONS = ['comp', 'bin', 'home', 'guest', 'pin', 'mail', 'cd', 'hw'];

// ---------------------------------------------------------------- state
function os5Fresh() {
  return {
    unlocked: false, on: false,
    hits: 0, toward: 0, total: 0, run: 0,
    blocks: BLOCKS.map((_, i) => (i === 0 ? 1 : 0)), // one free GIF to start
    opts: {}, bw: 0, links: 0, chapter: 0, awards: 0, republished: 0,
    ready: { pin: 0, mail: 0 }, wins: { pin: 0, mail: 0 }, bestPin: 0, shieldUntil: 0,
    pet: { food: 80, fed: 0 },
    saver: true, saverTime: 0, track: 'os5',
    layout: Object.fromEntries(WINS5.map((w, i) => [w.id, { x: w.x, y: w.y, open: !!w.open, min: false, z: 10 + i }])),
    zTop: 10 + WINS5.length,
  };
}
function os5Clean(o) {
  const f = os5Fresh();
  o = o && typeof o === 'object' ? o : f;
  for (const k of ['hits', 'toward', 'total', 'run', 'bw', 'links', 'chapter', 'awards', 'republished', 'bestPin', 'shieldUntil', 'saverTime', 'zTop']) o[k] = num(o[k], f[k]);
  o.bw = Math.min(BANDWIDTH.length - 1, Math.floor(o.bw));
  o.links = Math.min(LINKS.length, Math.floor(o.links));
  const b = Array.isArray(o.blocks) ? o.blocks : [];
  o.blocks = BLOCKS.map((_, i) => Math.floor(num(b[i], i === 0 ? 1 : 0)));
  for (const k of ['opts', 'ready', 'wins', 'layout', 'pet']) if (!o[k] || typeof o[k] !== 'object') o[k] = f[k];
  o.pet.food = Math.max(0, Math.min(100, num(o.pet.food, 80)));
  o.pet.fed = num(o.pet.fed, 0);
  for (const w of WINS5) if (!o.layout[w.id] || typeof o.layout[w.id] !== 'object') o.layout[w.id] = f.layout[w.id];
  o.track = PLAYLIST5.some(([id]) => id === o.track) ? o.track : 'os5';
  o.saver = o.saver !== false;
  o.unlocked = !!o.unlocked;
  o.on = o.unlocked && o.on !== false;
  return o;
}
const os5On = () => !!(S.os5 && S.os5.unlocked && S.os5.on);

// ---------------------------------------------------------------- formulas
let saver5On = false;
const optX = () => OPTIMIZE.reduce((m, u) => (S.os5.opts[u.id] ? m * u.x : m), 1);
const pageKB = () => BLOCKS.reduce((a, b, i) => a + b.kb * S.os5.blocks[i], 0) * optX();
const bwKBps = () => BANDWIDTH[S.os5.bw].kbps;
const loadSecs = () => pageKB() / bwKBps();
// visitors who wait: everyone up to PATIENCE seconds, then it falls off gently
const loadX = () => { const t = loadSecs(); return t <= PATIENCE ? 1 : Math.sqrt(PATIENCE / t); };
const wormOn = () => S.os5.links >= 4 && S.os5.links < LINKS.length;
const wormEating = () => wormOn() && Date.now() > S.os5.shieldUntil;
const petHappy = () => S.os5.pet.food >= 30;
function hitMult() {
  let m = loadX() * (1 + AWARD_X * S.os5.awards) * Math.pow(LINK_X, S.os5.links);
  if (petHappy()) m *= PET_X;
  if (saver5On) m *= SAVER5_X;
  if (wormEating()) m *= WORM_X;
  return m;
}
const blockRate = i => BLOCKS[i].rate * hitMult();
const hitRate = () => BLOCKS.reduce((a, b, i) => a + b.rate * S.os5.blocks[i], 0) * hitMult();
const blockCost = i => Math.ceil(BLOCKS[i].cost * Math.pow(BLOCK_GROWTH, S.os5.blocks[i]));
const blockShown = i => i === 0 || S.os5.blocks[i - 1] > 0 || S.os5.blocks[i] > 0;
// what one more of this block would change, all things considered (it can be negative)
function blockGain(i) {
  const before = hitRate();
  S.os5.blocks[i]++;
  const after = hitRate();
  S.os5.blocks[i]--;
  return after - before;
}
const nextLink = () => LINKS[S.os5.links];
const canLink = () => !!nextLink() && S.os5.toward >= nextLink().goal;
// awards follow your best page ever: recycling pays off when this page beat the record
const awardTarget = () => (S.os5.run < 1e4 ? 0 : Math.floor(4 * (Math.log10(S.os5.run) - 3))); // +4 per 10x, from 10,000 hits
const awardGain = () => Math.max(0, awardTarget() - S.os5.awards);
const feedCost = () => Math.max(10, Math.ceil(hitRate() * 15));
const mini5Reward = id => Math.max(30 * Math.pow(5, S.os5.links), hitRate() * MINI5[id].secs);
const mini5Ready = id => Date.now() >= (S.os5.ready[id] || 0);

// ---------------------------------------------------------------- simulation + actions
function addHits(n) {
  const o = S.os5;
  o.hits += n; o.toward += n; o.total += n; o.run += n;
}
let os5AutoAcc = 0;
function os5Step(dt) {
  if (!S.os5.unlocked) return;
  addHits(hitRate() * dt);
  S.os5.pet.food = Math.max(0, S.os5.pet.food - dt * 100 / 3600); // hungry again after about an hour
  if (saver5On) S.os5.saverTime += dt;
  if (!os5On()) return;
  // the modem era runs itself now: buy everything, run what fits best
  os5AutoAcc += dt;
  if (os5AutoAcc >= 1) {
    os5AutoAcc = 0;
    for (let i = PROGS.length - 1; i >= 0; i--) buyProgMax(i);
    for (const h of HELPERS) buyHelper(h.id);
    while (buyBaud());
    while (buyRam());
    const items = [...PROGS, ...HELPERS].filter(p => owned4(p.id)).sort((a, b) => b.kb - a.kb);
    S.os4.run = {};
    for (const p of items) if (usedKB() + p.kb <= ramKB()) S.os4.run[p.id] = true;
  }
}
function buyBlock(i) {
  const c = blockCost(i);
  if (!blockShown(i) || S.os5.hits < c) return false;
  S.os5.hits -= c;
  S.os5.blocks[i]++;
  return true;
}
function buyBlockMax(i) { let g = 0; while (g++ < 1000 && blockGain(i) > 0 && buyBlock(i)); }
function buyOpt(id) {
  const u = OPTIMIZE.find(x => x.id === id);
  if (!u || S.os5.opts[id] || S.os5.hits < u.cost) return false;
  S.os5.hits -= u.cost;
  S.os5.opts[id] = true;
  return true;
}
let hwFail = ''; // Plug and Play doesn't always play
function buyBw(force) {
  const b = BANDWIDTH[S.os5.bw + 1];
  if (!b || S.os5.hits < b.cost) return false;
  if (!force && Math.random() < 0.15) { hwFail = `New hardware found: ${b.name}. INCR.OS could not find a driver for this device.`; return false; }
  hwFail = '';
  S.os5.hits -= b.cost;
  S.os5.bw++;
  return true;
}
function linkNext() {
  if (!canLink()) return false;
  S.os5.links++;
  S.os5.toward = 0;
  return true;
}
// throw the page away: keeps optimizations, awards, the webring and the pet
function republish() {
  const gain = awardGain();
  if (gain < 1) return false;
  const o = S.os5;
  o.awards += gain;
  o.republished++;
  o.hits = 0; o.run = 0; o.bw = 0;
  o.blocks = BLOCKS.map((_, i) => (i === 0 ? 1 : 0));
  return true;
}
function feedPet() {
  const c = feedCost();
  if (S.os5.pet.food > 85 || S.os5.hits < c) return false;
  S.os5.hits -= c;
  S.os5.pet.food = 100;
  S.os5.pet.fed++;
  return true;
}
function mini5Win(id, f) {
  const o = S.os5;
  o.wins[id] = (o.wins[id] || 0) + 1;
  if (id === 'mail') o.shieldUntil = Date.now() + SHIELD_SECS * 1000;
  if (!mini5Ready(id)) return 0;
  const n = mini5Reward(id) * f;
  addHits(n);
  o.ready[id] = Date.now() + MINI5[id].cd * 1000;
  return n;
}

// ---------------------------------------------------------------- Pinball
const PB_W = 240, PB_H = 360, PB_R = 5;
const PB_WALLS = [
  [10, 360, 10, 60], [10, 60, 45, 14], [45, 14, 195, 14], [195, 14, 230, 60], [230, 60, 230, 360],
  [210, 360, 210, 95], // the launch lane
  [10, 272, 62, 322], [210, 272, 158, 322], // guides into the flippers
];
const PB_BUMPERS = [[78, 92, 15], [150, 92, 15], [114, 145, 15], [60, 195, 9], [165, 195, 9]];
const PB_LIGHTS = [[70, 40], [114, 34], [158, 40]];
const PB_FLIP = { len: 44, rest: 0.5, up: -0.42 };
let pb = null, pbRaf = null;
function pbNew() {
  pb = { ball: null, balls: 3, score: 0, lights: [false, false, false], left: false, right: false, la: PB_FLIP.rest, ra: PB_FLIP.rest,
    over: false, msg: 'Launch with the middle button (or Space). Flippers: the side buttons, Z / M, or the arrow keys.', stars: Array.from({ length: 50 }, () => [Math.random() * PB_W, Math.random() * PB_H]) };
}
function pbLaunch() {
  if (!pb || pb.ball || pb.over || pb.balls <= 0) return;
  pb.ball = { x: 220, y: 340, vx: 0, vy: -10.5 - Math.random() * 1.5 };
  pb.msg = '';
  Music.fx('voice');
}
function pbSeg(b, x1, y1, x2, y2, bounce, push) {
  const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy;
  let t = ((b.x - x1) * dx + (b.y - y1) * dy) / L2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx, cy = y1 + t * dy;
  let nx = b.x - cx, ny = b.y - cy;
  const d = Math.hypot(nx, ny);
  if (d >= PB_R || d === 0) return false;
  nx /= d; ny /= d;
  b.x = cx + nx * PB_R; b.y = cy + ny * PB_R;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) { b.vx -= (1 + bounce) * vn * nx; b.vy -= (1 + bounce) * vn * ny; }
  if (push) { b.vx += nx * push * t; b.vy += ny * push * t; } // a flipper hits harder near its tip
  return true;
}
const PB_PIVOT = { l: 62, r: 158, y: 322 };
const pbFlipEnd = (side, a) => (side === 'l' ? [PB_PIVOT.l + Math.cos(a) * PB_FLIP.len, PB_PIVOT.y + Math.sin(a) * PB_FLIP.len]
  : [PB_PIVOT.r - Math.cos(a) * PB_FLIP.len, PB_PIVOT.y + Math.sin(a) * PB_FLIP.len]);
function pbStep() {
  const sp = 0.04; // flipper swing per substep: small steps, so it can't jump past the ball
  const target = (on) => (on ? PB_FLIP.up : PB_FLIP.rest);
  const b = pb.ball;
  for (let k = 0; k < 4; k++) {
    const prevL = pb.la, prevR = pb.ra;
    pb.la += Math.max(-sp, Math.min(sp, target(pb.left) - pb.la));
    pb.ra += Math.max(-sp, Math.min(sp, target(pb.right) - pb.ra));
    if (!b) continue;
    b.vy += 0.045;
    b.x += b.vx / 4; b.y += b.vy / 4;
    for (const w of PB_WALLS) pbSeg(b, ...w, 0.5, 0);
    const [lx, ly] = pbFlipEnd('l', pb.la), [rx, ry] = pbFlipEnd('r', pb.ra);
    pbSeg(b, PB_PIVOT.l, PB_PIVOT.y, lx, ly, 0.3, pb.la < prevL ? 4 : 0);
    pbSeg(b, PB_PIVOT.r, PB_PIVOT.y, rx, ry, 0.3, pb.ra < prevR ? 4 : 0);
    for (const [x, y, r] of PB_BUMPERS) {
      const dx = b.x - x, dy = b.y - y, d = Math.hypot(dx, dy);
      if (d < r + PB_R && d > 0) {
        const nx = dx / d, ny = dy / d;
        b.x = x + nx * (r + PB_R); b.y = y + ny * (r + PB_R);
        const vn = b.vx * nx + b.vy * ny;
        b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny;
        b.vx += nx * 2.2; b.vy += ny * 2.2;
        pb.score += r > 10 ? 100 : 250;
        Music.fx('voice-sys');
      }
    }
    PB_LIGHTS.forEach(([x, y], i) => {
      if (!pb.lights[i] && Math.hypot(b.x - x, b.y - y) < 9) {
        pb.lights[i] = true; pb.score += 500;
        if (pb.lights.every(Boolean)) { pb.score += 3000; pb.lights = [false, false, false]; pb.msg = 'WEBRING LIT! +3000'; }
      }
    });
  }
  if (!b) return;
  const v = Math.hypot(b.vx, b.vy);
  if (v > 13) { b.vx *= 13 / v; b.vy *= 13 / v; }
  if (b.y > PB_H + 10) {
    pb.ball = null;
    pb.balls--;
    if (pb.balls > 0) { pb.msg = `Ball lost. ${pb.balls} left.`; return; }
    pb.over = true;
    S.os5.bestPin = Math.max(S.os5.bestPin, pb.score);
    const n = mini5Win('pin', Math.min(1.5, pb.score / 6000));
    pb.msg = `GAME OVER · ${pb.score} points. ${n ? `+${fmtPx(n)} hits` : '(reward still recharging)'}`;
  }
}
function pbDraw() {
  const cv = $('o5Pin');
  if (!cv || !pb) return;
  const g = cv.getContext('2d');
  g.fillStyle = '#05051a'; g.fillRect(0, 0, PB_W, PB_H);
  g.fillStyle = '#334';
  for (const [x, y] of pb.stars) g.fillRect(x, y, 1, 1);
  g.strokeStyle = '#8af'; g.lineWidth = 3; g.lineCap = 'round';
  for (const [x1, y1, x2, y2] of PB_WALLS) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  PB_LIGHTS.forEach(([x, y], i) => { g.fillStyle = pb.lights[i] ? '#ff5' : '#553'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); });
  for (const [x, y, r] of PB_BUMPERS) {
    g.fillStyle = '#c03'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.strokeStyle = '#f9c'; g.lineWidth = 2; g.stroke();
  }
  g.strokeStyle = '#ffd030'; g.lineWidth = 7;
  const [lx, ly] = pbFlipEnd('l', pb.la), [rx, ry] = pbFlipEnd('r', pb.ra);
  g.beginPath(); g.moveTo(PB_PIVOT.l, PB_PIVOT.y); g.lineTo(lx, ly); g.moveTo(PB_PIVOT.r, PB_PIVOT.y); g.lineTo(rx, ry); g.stroke();
  if (pb.ball) { g.fillStyle = '#ddd'; g.beginPath(); g.arc(pb.ball.x, pb.ball.y, PB_R, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(pb.ball.x - 2, pb.ball.y - 2, 2, 2); }
  g.fillStyle = '#fff'; g.font = '12px monospace';
  g.fillText(String(pb.score).padStart(7, '0'), 14, 350);
  g.fillText(`BALL ${Math.min(3, 4 - Math.max(1, pb.balls))}`, 162, 350);
}
function pbLoop() {
  if (!pb || !os5On() || !S.os5.layout.pin.open || S.os5.layout.pin.min) { pbRaf = null; return; }
  pbStep(); pbDraw();
  if ($('o5PinMsg')) setText($('o5PinMsg'), pb.msg || `Score ${pb.score} · ${pb.balls} ball${pb.balls === 1 ? '' : 's'} left`);
  pbRaf = requestAnimationFrame(pbLoop);
}
function pbWake() { if (!pbRaf) pbRaf = requestAnimationFrame(pbLoop); }

// ---------------------------------------------------------------- Defend the Inbox
const MAIL_GOOD = ['re: lunch?', 'Your webring stats', 'Newsletter #12', 'Fwd: funny cat GIF', 'Guestbook entry from incr-58',
  'Meeting moved', 'Your page is Cool Site of the Day!', 'hi from incr-31', 'Order shipped', 'Photos from the trip'];
const MAIL_BAD = ['ILOVEYOU', 'LOVE-LETTER-FOR-YOU.TXT.vbs', 're: re: fw: LOVE', 'FREE_SCREENSAVER.exe', 'YOUR_HITS.txt.vbs',
  'i love you (open me)', 'CHECK THIS.doc.exe', 'worm.exe says hi'];
const MAIL_SECS = 40;
let mail = null, mailTimer = null;
function mailNew() {
  clearInterval(mailTimer);
  mail = { items: [], t: 0, next: 0, lives: 3, score: 0, running: false, over: false, msg: '', id: 0 };
}
function mailStart() {
  mailNew();
  mail.running = true;
  mailTimer = setInterval(mailTick, 50);
}
function mailTick() {
  const m = mail;
  if (!m.running) return;
  m.t += 0.05;
  if (m.t >= m.next) {
    const bad = Math.random() < 0.45;
    const pool = bad ? MAIL_BAD : MAIL_GOOD;
    m.items.push({ id: ++m.id, bad, subj: pool[Math.floor(Math.random() * pool.length)], x: Math.random() * 0.45, y: 0 });
    m.next = m.t + Math.max(0.45, 1.1 - m.t / 60);
  }
  const speed = 0.05 / Math.max(3.2, 6.5 - m.t / 12);
  for (const it of m.items) {
    it.y += speed;
    if (it.y >= 1 && !it.done) {
      it.done = true;
      if (it.bad) { m.lives--; Music.fx('voice-sys'); } else m.score += 10;
    }
  }
  m.items = m.items.filter(it => !it.done);
  if (m.lives <= 0) mailEnd(false);
  else if (m.t >= MAIL_SECS) mailEnd(true);
  mailPaint();
}
function mailEnd(won) {
  mail.running = false; mail.over = true;
  clearInterval(mailTimer);
  mail.items = [];
  if (!won) { mail.msg = 'worm.exe got through. Try again?'; return; }
  const n = mini5Win('mail', Math.min(1.2, 0.6 + mail.score / 400));
  mail.msg = `Inbox clean! ${mail.score} points. worm.exe stays away for ${SHIELD_SECS / 60} minutes. ${n ? `+${fmtPx(n)} hits` : '(reward still recharging)'}`;
}
function mailClick(id) {
  const it = mail.items.find(x => x.id === id);
  if (!it || !mail.running) return;
  it.done = true;
  if (it.bad) mail.score += 25;
  else { mail.score = Math.max(0, mail.score - 30); mail.lives--; } // deleting real mail hurts too
  mail.items = mail.items.filter(x => !x.done);
  if (mail.lives <= 0) mailEnd(false);
  mailPaint();
}
function mailPaint() {
  const box = $('o5MailBox');
  if (!box) return;
  const seen = new Set();
  for (const it of mail.items) {
    seen.add(String(it.id));
    let el = box.querySelector(`[data-mid="${it.id}"]`);
    if (!el) {
      el = document.createElement('button');
      el.type = 'button';
      el.className = `mailit${it.bad ? ' bad' : ''}`;
      el.dataset.mid = it.id;
      el.dataset.o5 = `mail:${it.id}`;
      el.textContent = `✉ ${it.subj}`;
      el.style.left = `${it.x * 100}%`;
      box.appendChild(el);
    }
    el.style.top = `calc(${(it.y * 100).toFixed(1)}% - ${(it.y * 1.8).toFixed(2)}em)`;
  }
  for (const el of [...box.children]) if (!seen.has(el.dataset.mid)) el.remove();
  setText($('o5MailHead'), mail.running ? `${Math.max(0, Math.ceil(MAIL_SECS - mail.t))}s · ${'♥'.repeat(mail.lives)} · ${mail.score} pts` : 'Delete the worm mails. Let the real ones through.');
  setText($('o5MailMsg'), mail.msg || 'Click the infected attachments before they reach the bottom. Deleting real mail costs a life.');
  setText($('o5MailBtn'), mail.running ? 'Restart' : 'Start');
}

// ---------------------------------------------------------------- the desktop
let os5Built = false, os5Shown = false, o5Bound = [];
const o5Sig = {};
let startOpen = false, binConfirm = 0, shutdown = false;
const os5Narrow = () => !!(window.matchMedia && matchMedia('(max-width: 700px)').matches);

const O5_TEXT = {
  hits: () => fmtPx(S.os5.hits),
  rate: () => `+${fmtPx(hitRate())}/s`,
  links: () => `${S.os5.links}/${LINKS.length}`,
  awards: () => `${S.os5.awards}`,
  title: id => WIN5[id].title(),
  task: id => WIN5[id].label,
  clock: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  load: () => `Page: ${fmtD(pageKB())} KB · loads in ${fmtD(loadSecs())}s on a ${BANDWIDTH[S.os5.bw].name}${loadX() < 1 ? ` · visitors leave: hits x${loadX().toFixed(2)}` : ' · fast enough'}`,
  counter: () => String(Math.floor(S.os5.run)).padStart(7, '0').slice(-9),
  bn: i => `x${S.os5.blocks[i]}`,
  bk: i => `${BLOCKS[i].kb}K each`,
  bc: i => `Add · ${fmtPx(blockCost(i))}`,
  bg: i => { const d = blockGain(i); return d >= 0 ? `one more: +${fmtPx(d)}/s` : `one more: -${fmtPx(-d)}/s (the page gets too heavy)`; },
  linkinfo: () => (nextLink() ? `${fmtPx(Math.min(S.os5.toward, nextLink().goal))} / ${fmtPx(nextLink().goal)} hits` : 'the ring is closed.'),
  worm: () => (!wormOn() ? '' : wormEating() ? `worm.exe is eating your traffic: hits x${WORM_X}. Win Defend the Inbox to stop it.` : `Inbox clean: worm.exe kept away for ${fmtTime(Math.ceil((S.os5.shieldUntil - Date.now()) / 1000))}.`),
  bw: () => `${BANDWIDTH[S.os5.bw].name} · ${BANDWIDTH[S.os5.bw].kbps} KB/s`,
  bwbtn: () => (BANDWIDTH[S.os5.bw + 1] ? `Install ${BANDWIDTH[S.os5.bw + 1].name} · ${fmtPx(BANDWIDTH[S.os5.bw + 1].cost)}` : 'Fastest line installed'),
  hwfail: () => hwFail,
  oc: id => (S.os5.opts[id] ? '✓ Done' : `${fmtPx(OPTIMIZE.find(u => u.id === id).cost)} hits`),
  bininfo: () => `${S.os5.awards} awards · hits x${fmtD(1 + AWARD_X * S.os5.awards)} · republished ${S.os5.republished} time(s)`,
  bingain: () => (awardGain() >= 1 ? `Empty it now for +${awardGain()} award${awardGain() === 1 ? '' : 's'}`
    : `Next award when this page reaches ${fmtPx(Math.pow(10, 3 + (S.os5.awards + 1) / 4))} hits (now ${fmtPx(S.os5.run)})`),
  binbtn: () => (binConfirm > Date.now() ? 'Really? Click again' : 'Empty Recycle Bin'),
  mini: id => (mini5Ready(id) ? `Win: +${fmtPx(mini5Reward(id))} hits` : `Reward recharging: ${fmtTime(Math.ceil(((S.os5.ready[id] || 0) - Date.now()) / 1000))}`),
  cd: () => { const k = PLAYLIST5.findIndex(([id]) => id === S.os5.track); return `[${String(k + 1).padStart(2, '0')}] ${PLAYLIST5[k][1]}`; },
  cdstate: () => (S.opts.music ? '▶ PLAYING' : '❚❚ PAUSED'),
  petfood: () => `${Math.round(S.os5.pet.food)}%`,
};
const O5_DIS = {
  block: i => S.os5.hits < blockCost(i),
  opt: id => !!S.os5.opts[id] || S.os5.hits < OPTIMIZE.find(u => u.id === id).cost,
  bw: () => !BANDWIDTH[S.os5.bw + 1] || S.os5.hits < BANDWIDTH[S.os5.bw + 1].cost,
  link: () => !canLink(),
  bin: () => awardGain() < 1,
};
const O5_W = {
  link: () => (nextLink() ? Math.min(1, S.os5.toward / nextLink().goal) : 1),
  load: () => Math.min(1, loadSecs() / (PATIENCE * 2)),
  pet: () => S.os5.pet.food / 100,
};
function o5Bind() {
  o5Bound = [];
  for (const el of document.querySelectorAll('#os5 [data-x], #os5 [data-xd], #os5 [data-xw]')) {
    for (const [attr, kind] of [['x', 't'], ['xd', 'd'], ['xw', 'w']]) {
      const v = el.dataset[attr];
      if (v) { const [k, a] = v.split(':'); o5Bound.push([el, kind, k, argOf(a)]); }
    }
  }
}
function o5Refresh() {
  for (const [el, kind, k, a] of o5Bound) {
    if (kind === 't') setText(el, O5_TEXT[k](a));
    else if (kind === 'd') { const dis = !!O5_DIS[k](a); if (el.disabled !== dis) el.disabled = dis; }
    else { const w = pct(O5_W[k](a)); if (el.style.width !== w) el.style.width = w; }
  }
}

const ICON5 = {
  comp: '<i class="i5 i-comp"><b></b></i>', bin: '<i class="i5 i-bin"></i>', home: '<i class="i5 i-home">e</i>',
  guest: '<i class="i5 i-guest">✍</i>', pin: '<i class="i5 i-pin">●</i>', mail: '<i class="i5 i-mail">✉</i>',
  cd: '<i class="i5 i-cd"></i>', hw: '<i class="i5 i-hw">⌨</i>',
};
function win5Body(id) {
  switch (id) {
    case 'home': return `<div class="browser"><div class="br-bar">Address: http://incr-7.ring/~voice/</div>
        <div class="br-page" id="o5Page"></div>
        <div class="br-status"><span data-x="load"></span></div><div class="loadbar"><i data-xw="load"></i></div></div>
      <p class="dim">Blocks · each one brings visitors, and weight</p><div id="o5Blocks"></div>`;
    case 'guest': return `<fieldset class="cp"><legend>Webring</legend><div id="o5Ring"></div>
        <p class="row"><span class="meter"><i data-xw="link"></i></span> <span class="dim" data-x="linkinfo"></span></p>
        <button type="button" class="gbtn big" data-o5="link" data-xd="link">Join the next site</button>
        <p class="wormline" data-x="worm"></p></fieldset>
      <p class="dim">Guestbook</p><div class="gbook" id="o5Book"></div>`;
    case 'hw': return `<fieldset class="cp"><legend>Connection</legend><p data-x="bw"></p>
        <button type="button" class="gbtn" data-o5="bw" data-xd="bw" data-x="bwbtn"></button>
        <p class="hwfail" data-x="hwfail"></p></fieldset>
      <fieldset class="cp"><legend>Make the page lighter</legend><div id="o5Opts"></div></fieldset>`;
    case 'bin': return `<div class="bin-art" id="o5BinArt"></div>
      <p>Throw the whole page away and publish it again. You keep your <b>awards</b> (each one: hits +${AWARD_X * 100}%), your optimizations, the webring and your pet. Hits, blocks and hardware start over.</p>
      <p data-x="bininfo"></p><p class="dim" data-x="bingain"></p>
      <button type="button" class="gbtn big" data-o5="bin" data-xd="bin" data-x="binbtn"></button>`;
    case 'cd': return `<div class="cd-led"><span data-x="cd"></span><span data-x="cdstate"></span></div>
      <div class="btnrow"><button type="button" class="gbtn" data-o5="trk:-1" aria-label="Previous">⏮</button>
        <button type="button" class="gbtn" data-o5="playpause" aria-label="Play or pause">⏯</button>
        <button type="button" class="gbtn" data-o5="trk:1" aria-label="Next">⏭</button></div>
      <div class="tracks" id="o5Tracks"></div>`;
    case 'pin': return `<p class="mini-reward" data-x="mini:pin"></p>
      <canvas id="o5Pin" width="${PB_W}" height="${PB_H}" aria-label="pinball table"></canvas>
      <div class="pb-btns"><button type="button" class="gbtn big" data-pb="l">◀ Flip</button>
        <button type="button" class="gbtn big" data-o5="pblaunch">Launch</button>
        <button type="button" class="gbtn big" data-pb="r">Flip ▶</button></div>
      <p class="mini-msg" id="o5PinMsg"></p><button type="button" class="gbtn" data-o5="pbnew">New game</button>`;
    case 'mail': return `<p class="mini-reward" data-x="mini:mail"></p>
      <div class="mini-head"><span id="o5MailHead"></span><button type="button" class="gbtn" data-o5="mailstart" id="o5MailBtn">Start</button></div>
      <div class="mailbox" id="o5MailBox"></div><p class="mini-msg" id="o5MailMsg"></p>`;
    case 'comp': return `<p>Drives</p><div class="drives">
      ${[['1', 'INCR10 (A:)', 'the terminal'], ['2', 'INCR20 (C:)', 'the graphical environment'], ['3', 'INCR30 (D:)', 'behind the door'], ['4', 'INCR40 (E:)', 'the modem']].map(([e, n, d]) =>
        `<button type="button" class="drive" data-o5="visit:${e}"><i class="i5 i-drive"></i><span>${n}</span><small>${d}</small></button>`).join('')}</div>
      <p class="dim">Every old era waits as you left it, and keeps running. Come back with /win5 or the "INCR.OS 5.0" button.</p>`;
  }
  return '';
}

function os5Build() {
  if (os5Built) return;
  os5Built = true;
  $('os5').innerHTML = `
    <div class="o5-desk" id="o5Desk">
      <div class="o5-icons">${DESK_ICONS.map(id => `<button type="button" class="dicon" data-o5="open:${id}">${ICON5[id]}<span>${WIN5[id].label}</span></button>`).join('')}</div>
      ${WINS5.map(w => `
      <section class="w5win hidden" id="w5-${w.id}" data-win="${w.id}" aria-label="${w.label}">
        <div class="w5-title"><span class="w5-ico">${ICON5[w.id]}</span><span class="w5-name" data-x="title:${w.id}"></span>
          <button type="button" class="w5-btn" data-o5="min:${w.id}" aria-label="Minimize">_</button>
          <button type="button" class="w5-btn" data-o5="close:${w.id}" aria-label="Close">✕</button></div>
        <div class="w5-body">${win5Body(w.id)}</div>
      </section>`).join('')}
      <div class="pet" id="o5Pet" data-o5="pet" title="your daemon"><canvas width="16" height="14" id="o5PetSprite"></canvas><span class="pet-say hidden" id="o5PetSay"></span></div>
      <div id="o5Dlg" class="o5-dlg hidden" role="dialog" aria-live="polite">
        <div class="dlg-who" id="o5Who"></div><div class="dlg-text" id="o5Say"></div><div class="dlg-next">click to continue &#9660;</div>
      </div>
      <canvas id="o5Saver" class="o5-saver hidden" aria-hidden="true"></canvas>
    </div>
    <div class="startmenu hidden" id="o5Start">
      <div class="sm-side">INCR.OS <b>5.0</b></div>
      <div class="sm-items">
        ${['home', 'guest', 'hw', 'bin', 'pin', 'mail', 'cd', 'comp'].map(id => `<button type="button" data-o5="open:${id}">${ICON5[id]}<span>${WIN5[id].label}</span></button>`).join('')}
        <hr>
        <button type="button" data-o5="ach"><i class="i5 i-ach">★</i><span>Achievements</span></button>
        <button type="button" data-o5="saver"><i class="i5 i-hw">⌂</i><span id="o5SaverItem">Screensaver</span></button>
        <button type="button" data-o5="shutdown"><i class="i5 i-off">⏻</i><span>Shut Down...</span></button>
      </div>
    </div>
    <footer class="taskbar5">
      <button type="button" class="startbtn" data-o5="start" id="o5StartBtn"><b>❖</b> Start</button>
      <div class="tasks" id="o5Tasks"></div>
      <div class="tray"><span class="tray-hits"><b data-x="hits"></b> <span data-x="rate"></span></span>
        <button type="button" class="traybtn" data-o5="music" id="o5Music" aria-label="Music on/off">&#9835;</button>
        <span class="tray-pet" title="pet food"><i data-xw="pet"></i></span><span data-x="clock"></span></div>
    </footer>
    <div class="shutdown hidden" id="o5Shut" data-o5="wake">It's now safe to turn off<br>your computer.<small>(click to turn it back on)</small></div>`;
  pbNew(); mailNew();
  drawPetSprite();
  o5Bind();
}
function drawPetSprite() {
  const cv = $('o5PetSprite'), g = cv.getContext('2d'), art = picArt(1);
  for (let y = 0; y < 14; y++) for (let x = 0; x < 16; x++) {
    const c = art[(y + 1) * PIC_W + x + 4];
    if (c) { g.fillStyle = COLORS[c].hex; g.fillRect(x, y, 1, 1); }
  }
}

// windows: like 4.0, plus minimize to the taskbar
function o5Top() {
  let best = null;
  for (const w of WINS5) {
    const l = S.os5.layout[w.id];
    if (l.open && !l.min && (!best || l.z > S.os5.layout[best].z)) best = w.id;
  }
  return best;
}
function o5Focus(id) {
  const l = S.os5.layout[id];
  l.min = false;
  if (o5Top() !== id || WINS5.some(w => w.id !== id && S.os5.layout[w.id].z >= l.z)) l.z = ++S.os5.zTop;
  o5Layout();
}
function o5Open(id) { S.os5.layout[id].open = true; o5Focus(id); if (id === 'pin') pbWake(); }
function o5Close(id) { S.os5.layout[id].open = false; o5Layout(); }
function o5Min(id) { S.os5.layout[id].min = true; o5Layout(); }
function o5Layout() {
  if (!os5Built) return;
  const area = $('o5Desk'), narrow = os5Narrow(), top = o5Top();
  $('os5').classList.toggle('narrow', narrow);
  for (const w of WINS5) {
    const el = $(`w5-${w.id}`), l = S.os5.layout[w.id];
    el.classList.toggle('hidden', !l.open || l.min);
    el.classList.toggle('active', w.id === top);
    el.style.zIndex = l.z;
    if (narrow || !l.open || l.min) { el.style.left = el.style.top = ''; continue; }
    const W = area.clientWidth, H = area.clientHeight;
    el.style.left = `${Math.max(0, Math.min(l.x * W, W - el.offsetWidth))}px`;
    el.style.top = `${Math.max(0, Math.min(l.y * H, H - 48))}px`;
  }
  // taskbar buttons for every open window
  const open = WINS5.filter(w => S.os5.layout[w.id].open);
  const sig = open.map(w => w.id + (w.id === top ? '*' : '')).join();
  if (o5Sig.tasks !== sig) {
    o5Sig.tasks = sig;
    $('o5Tasks').innerHTML = open.map(w => `<button type="button" class="taskbtn${w.id === top ? ' on' : ''}" data-o5="task:${w.id}">${ICON5[w.id]}<span>${w.label}</span></button>`).join('');
  }
  if (S.os5.layout.pin.open && !S.os5.layout.pin.min) pbWake();
}

function rebuild5(key, sig, box, html) {
  if (o5Sig[key] === sig || !box) return false;
  o5Sig[key] = sig;
  box.innerHTML = html();
  return true;
}
function pageHTML() {
  const has = id => S.os5.blocks[BLOCKS.findIndex(b => b.id === id)] > 0;
  return `<h1 class="pg-title">${esc(playerLine())}</h1>` +
    (has('marquee') ? '<div class="pg-marquee"><span>~~~ WELCOME TO MY HOMEPAGE ~~~ YOU ARE NOT ALONE ~~~ SIGN MY GUESTBOOK ~~~</span></div>' : '') +
    (has('uc') ? '<div class="pg-uc">⚠ UNDER CONSTRUCTION ⚠</div>' : '') +
    (has('gifs') ? '<div class="pg-gifs"><i></i><i></i><i></i></div>' : '') +
    (has('guest') ? '<p class="pg-link">✍ Sign my guestbook!</p>' : '') +
    (has('midi') ? '<p class="pg-midi">♫ now playing: CANYON.MID</p>' : '') +
    (has('java') ? '<div class="pg-java">[Java applet: loading...]</div>' : '') +
    (has('ring') ? '<p class="pg-ring">&lt;&lt; prev | INCR RING | next &gt;&gt;</p>' : '') +
    (has('counter') ? '<p class="pg-counter">You are visitor number <b data-x="counter"></b></p>' : '');
}
function os5Lists() {
  const o = S.os5;
  let changed = false;
  const owned = BLOCKS.map((_, i) => +(o.blocks[i] > 0)).join('');
  changed = rebuild5('page', `${owned}|${playerLine()}`, $('o5Page'), pageHTML) || changed;
  const shown = BLOCKS.map((_, i) => i).filter(blockShown);
  changed = rebuild5('blocks', shown.join(), $('o5Blocks'), () => shown.map(i => { const b = BLOCKS[i]; return `
    <div class="prog"><div class="pg-info"><b>${esc(b.name)}</b> <span data-x="bn:${i}"></span> <span class="kb" data-x="bk:${i}"></span>
      <div class="dim">${esc(b.desc)}</div><div class="gain" data-x="bg:${i}"></div></div>
      <div class="pg-btns"><button type="button" class="gbtn" data-o5="block:${i}" data-xd="block:${i}" data-x="bc:${i}"></button>
      <button type="button" class="gbtn" data-o5="blockmax:${i}" data-xd="block:${i}">Max</button></div></div>`; }).join('')) || changed;
  changed = rebuild5('ring', `${o.links}`, $('o5Ring'), () => `<table class="phone">${LINKS.map((l, i) =>
    `<tr class="${i < o.links ? 'done' : i === o.links ? 'next' : 'locked'}"><td>${i <= o.links ? l.site : '???'}</td><td>${i <= o.links ? esc(l.title) : ''}</td><td>${i < o.links ? '✓ linked' : i === o.links ? 'next' : ''}</td></tr>`).join('')}</table>`) || changed;
  changed = rebuild5('opts', OPTIMIZE.map(u => +!!o.opts[u.id]).join(''), $('o5Opts'), () => OPTIMIZE.map(u => `
    <div class="prog"><div class="pg-info"><b>${esc(u.name)}</b><div class="dim">page weight x${u.x}</div></div>
      <div class="pg-btns"><button type="button" class="gbtn" data-o5="opt:${u.id}" data-xd="opt:${u.id}" data-x="oc:${u.id}"></button></div></div>`).join('')) || changed;
  changed = rebuild5('tracks', o.track, $('o5Tracks'), () => PLAYLIST5.map(([id, name], k) =>
    `<button type="button" class="trk${id === o.track ? ' on' : ''}" data-o5="track:${k}">${k + 1}. ${name}</button>`).join('')) || changed;
  rebuild5('binart', `${awardGain() >= 1}`, $('o5BinArt'), () => `<i class="i5 i-bin${awardGain() >= 1 ? ' full' : ''}"></i>`);
  if (o5Sig.book !== o.chapter && $('o5Book')) {
    o5Sig.book = o.chapter;
    $('o5Book').innerHTML = CHAPTERS5.slice(0, o.chapter).map(ch => ch.map(([who, t]) => {
      const text = esc(typeof t === 'function' ? t() : t);
      return who === 'gb' ? `<p class="gb-entry">${text}</p>` : `<p class="gb-talk"><b>${who === 'you' ? 'me' : who === 'clip' ? 'CLIPPO' : '???'}:</b> ${text}</p>`;
    }).join('')).join('<hr>') || '<p class="dim">(nobody signed it yet)</p>';
  }
  if (changed) o5Bind();
}

function os5Render() {
  const on = os5On() && !setup5Running;
  const was = os5Shown;
  os5Shown = on;
  if (on) $('app').classList.add('hidden');
  if (on !== was) {
    $('os5').classList.toggle('hidden', !on);
    document.body.classList.toggle('os5-mode', on);
    if (on) { os5Build(); o5Layout(); }
    else if (!introRunning && !os3On() && !os4Live()) $('app').classList.remove('hidden');
    if (!on) stopSaver5();
  }
  if (!on) return;
  os5Lists();
  o5Refresh();
  $('o5Music').classList.toggle('off', !S.opts.music);
  $('o5Start').classList.toggle('hidden', !startOpen);
  $('o5StartBtn').classList.toggle('on', startOpen);
  $('o5Shut').classList.toggle('hidden', !shutdown);
  setText($('o5SaverItem'), `Screensaver: ${S.os5.saver ? 'On' : 'Off'}`);
  if (binConfirm && Date.now() > binConfirm) binConfirm = 0;
  petTick();
  saver5Check();
  const c = S.os5.chapter;
  if (!dlg5 && c < CHAPTERS5.length && c <= S.os5.links) startChapter5(c);
}

// ---------------------------------------------------------------- the pet: a daemon on the taskbar
const pet = { x: 120, dir: 1, sit: 0, sayUntil: 0 };
const PET_LINES = {
  hungry: ['feed me?', 'hungry...', 'is that a byte? can i eat it?'],
  happy: ['fork() fork() fork()', ':)', 'i like it here', 'look, a webring!', 'pet me again'],
  fed: ['yum!', 'tastes like bytes', 'thank you!'],
};
function petSay(kind) {
  const box = $('o5PetSay');
  box.textContent = pick(PET_LINES[kind]);
  box.classList.remove('hidden');
  pet.sayUntil = Date.now() + 2500;
}
function petTick() {
  const el = $('o5Pet');
  if (!el) return;
  const W = $('o5Desk').clientWidth;
  const hungry = !petHappy();
  if (pet.sit > 0) pet.sit--;
  else if (!hungry) {
    pet.x += pet.dir * 1.2;
    if (pet.x < 4 || pet.x > W - 40) pet.dir *= -1;
    if (Math.random() < 0.006) pet.sit = 40 + Math.random() * 80;
  }
  pet.x = Math.max(4, Math.min(W - 40, pet.x));
  el.style.transform = `translateX(${Math.round(pet.x)}px)`;
  el.style.setProperty('--dir', pet.dir);
  el.classList.toggle('sad', hungry);
  el.classList.toggle('walk', !hungry && pet.sit <= 0);
  if (Date.now() > pet.sayUntil) $('o5PetSay').classList.add('hidden');
  if (hungry && Math.random() < 0.002) petSay('hungry');
}

// ---------------------------------------------------------------- dialogue
let dlg5 = null;
function startChapter5(k) {
  if (!os5Built) return;
  dlg5 = { k, i: 0, text: '', n: 0, timer: null };
  $('o5Dlg').classList.remove('hidden');
  dlg5Show();
}
function dlg5Show() {
  const [who, t] = CHAPTERS5[dlg5.k][dlg5.i];
  dlg5.text = typeof t === 'function' ? t() : t;
  dlg5.n = 0;
  const box = $('o5Dlg');
  box.className = `o5-dlg ${who}`;
  setText($('o5Who'), { you: 'YOU', sys: '???', gb: 'GUESTBOOK', clip: 'CLIPPO' }[who]);
  setText($('o5Say'), '');
  clearInterval(dlg5.timer);
  const fast = reduceMotion();
  dlg5.timer = setInterval(() => {
    dlg5.n = fast ? dlg5.text.length : dlg5.n + 1;
    setText($('o5Say'), dlg5.text.slice(0, dlg5.n));
    if (dlg5.n % 3 === 1 && dlg5.text[dlg5.n - 1] !== ' ') Music.fx(who === 'you' || who === 'clip' ? 'voice' : 'voice-sys');
    if (dlg5.n >= dlg5.text.length) { clearInterval(dlg5.timer); dlg5.timer = null; }
  }, who === 'gb' ? 16 : 28);
}
function dlg5Next() {
  if (!dlg5) return;
  if (dlg5.timer) { clearInterval(dlg5.timer); dlg5.timer = null; setText($('o5Say'), dlg5.text); return; }
  if (++dlg5.i < CHAPTERS5[dlg5.k].length) { dlg5Show(); return; }
  S.os5.chapter = dlg5.k + 1;
  closeDialogue5();
  save(true);
}
function closeDialogue5() {
  if (!dlg5) return;
  clearInterval(dlg5.timer);
  dlg5 = null;
  $('o5Dlg').classList.add('hidden');
}

// ---------------------------------------------------------------- screensaver: 3D pipes
let saver5Raf = null, lastInput5 = Date.now();
function saver5Check() {
  if (!saver5On && S.os5.saver && !dlg5 && !achMenu && !(mail && mail.running) && !(pb && pb.ball) && Date.now() - lastInput5 > SAVER_IDLE * 1000) startSaver5();
}
function startSaver5() {
  if (saver5On) return;
  saver5On = true;
  const cv = $('o5Saver');
  cv.classList.remove('hidden');
  cv.width = cv.clientWidth || 640;
  cv.height = cv.clientHeight || 400;
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, N = 9;
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const HUES = ['#d22', '#2b2', '#22d', '#dd2', '#2cc', '#c2c', '#ddd'];
  let pipe = null, segs = 0;
  const used = new Set();
  const proj = (x, y, z) => { // a simple perspective of the 9x9x9 grid
    const s = Math.min(W, H) / (N + 3) * (8 / (8 + z * 0.5));
    return [W / 2 + (x - N / 2) * s + (z - N / 2) * s * 0.35, H / 2 + (y - N / 2) * s - (z - N / 2) * s * 0.2, s];
  };
  const newPipe = () => {
    pipe = { p: [Math.floor(Math.random() * N), Math.floor(Math.random() * N), Math.floor(Math.random() * N)], d: Math.floor(Math.random() * 6), color: HUES[Math.floor(Math.random() * HUES.length)] };
  };
  newPipe();
  const frame = () => {
    if (!saver5On) return;
    for (let k = 0; k < 1; k++) {
      if (segs > 700) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); used.clear(); segs = 0; newPipe(); }
      let d = Math.random() < 0.7 ? pipe.d : Math.floor(Math.random() * 6);
      const [x, y, z] = pipe.p;
      let np = null;
      for (let tries = 0; tries < 6; tries++) {
        const [dx, dy, dz] = DIRS[d];
        const q = [x + dx, y + dy, z + dz];
        if (q.every(v => v >= 0 && v < N) && !used.has(q.join())) { np = q; break; }
        d = (d + 1 + Math.floor(Math.random() * 5)) % 6;
      }
      if (!np) { newPipe(); continue; }
      const [ax, ay, s] = proj(x, y, z), [bx, by] = proj(...np);
      const turned = d !== pipe.d;
      g.lineCap = 'round';
      g.strokeStyle = pipe.color; g.lineWidth = s * 0.32;
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = s * 0.08;
      g.beginPath(); g.moveTo(ax - s * 0.05, ay - s * 0.06); g.lineTo(bx - s * 0.05, by - s * 0.06); g.stroke();
      if (turned) { g.fillStyle = pipe.color; g.beginPath(); g.arc(ax, ay, s * 0.24, 0, 7); g.fill(); }
      used.add(np.join());
      pipe.p = np; pipe.d = d; segs++;
    }
    saver5Raf = requestAnimationFrame(frame);
  };
  frame();
}
function stopSaver5() {
  if (!saver5On) return;
  saver5On = false;
  cancelAnimationFrame(saver5Raf);
  $('o5Saver').classList.add('hidden');
}

// ---------------------------------------------------------------- actions
function os5Act(act) {
  const [k, a] = act.split(':');
  const i = +a;
  if (k !== 'start') startOpen = false;
  switch (k) {
    case 'start': startOpen = !startOpen; break;
    case 'open': o5Open(a); break;
    case 'close': o5Close(a); break;
    case 'min': o5Min(a); break;
    case 'task': if (o5Top() === a) o5Min(a); else o5Focus(a); break;
    case 'block': buyBlock(i); break;
    case 'blockmax': buyBlockMax(i); break;
    case 'opt': buyOpt(a); break;
    case 'bw': buyBw(!!hwFail); break; // after a failed driver install, retrying always works
    case 'link': if (linkNext()) { Music.fx('save'); save(true); } break;
    case 'bin':
      if (binConfirm > Date.now()) { binConfirm = 0; if (republish()) { guiFlash(); Music.fx('save'); save(true); } }
      else binConfirm = Date.now() + 5000;
      break;
    case 'pet': if (feedPet()) petSay('fed'); else petSay(petHappy() ? 'happy' : 'hungry'); break;
    case 'track': S.os5.track = PLAYLIST5[i][0]; if (!S.opts.music) $('musicBtn').click(); break;
    case 'trk': { const n = PLAYLIST5.findIndex(([id]) => id === S.os5.track); S.os5.track = PLAYLIST5[(n + i + PLAYLIST5.length) % PLAYLIST5.length][0]; break; }
    case 'playpause': case 'music': $('musicBtn').click(); break;
    case 'pblaunch': pbLaunch(); pbWake(); break;
    case 'pbnew': pbNew(); pbWake(); break;
    case 'mail': mailClick(i); break;
    case 'mailstart': mailStart(); break;
    case 'saver': S.os5.saver = !S.os5.saver; break;
    case 'shutdown': shutdown = true; Music.fx('voice-sys'); break;
    case 'wake': shutdown = false; Music.chime(); break;
    case 'visit': os5Visit(a); break;
    case 'ach': openAchMenu(); break;
  }
  os5Render();
}
function os5Visit(era) {
  S.os5.on = false;
  closeDialogue5();
  if (era === '4') { S.os4.on = true; }
  else {
    S.os4.on = false;
    if (era === '3') S.os3.on = true;
    else {
      S.os3.on = false;
      if (era === '1') S.gui.on = false;
      else { S.gui.win1 = true; S.gui.on = true; S.gui.declined = false; }
      log(`INCR.OS ${era}.0 loaded. everything is where you left it.`, 'ok');
      out('hits keep coming meanwhile. /win5 takes you back.', 'dim');
    }
  }
  guiFlash();
  setPrompt();
  save(true);
}
function os5Return() {
  if (!S.os5.unlocked) return;
  S.os5.on = true;
  guiFlash();
  save(true);
}

function wireOs5() {
  const root = $('os5');
  os5Build();
  root.addEventListener('click', e => {
    if (e.target.closest('#o5Dlg')) { dlg5Next(); return; }
    const win = e.target.closest('.w5win');
    const el = e.target.closest('[data-o5]');
    if (win && !(el && /^(close|min):/.test(el.dataset.o5))) o5Focus(win.dataset.win);
    if (el && !el.disabled) os5Act(el.dataset.o5);
    else if (startOpen && !e.target.closest('#o5Start')) { startOpen = false; os5Render(); }
  });
  // flippers: hold the buttons, or Z / M / arrow keys
  const flip = (side, on) => { if (pb) pb[side === 'l' ? 'left' : 'right'] = on; };
  root.addEventListener('pointerdown', e => { const b = e.target.closest('[data-pb]'); if (b) { e.preventDefault(); flip(b.dataset.pb, true); pbWake(); } });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) root.addEventListener(type, e => { const b = e.target.closest('[data-pb]'); if (b) flip(b.dataset.pb, false); });
  const keyFlip = (e, on) => {
    if (!os5On() || !pb || !S.os5.layout.pin.open || S.os5.layout.pin.min || o5Top() !== 'pin') return;
    const k = e.key.toLowerCase();
    if (k === 'z' || k === 'arrowleft') { flip('l', on); e.preventDefault(); }
    else if (k === 'm' || k === 'arrowright') { flip('r', on); e.preventDefault(); }
    else if (on && (k === ' ' || k === 'arrowdown')) { pbLaunch(); e.preventDefault(); }
  };
  document.addEventListener('keydown', e => keyFlip(e, true));
  document.addEventListener('keyup', e => keyFlip(e, false));
  // drag windows by their title bar
  let drag = null;
  root.addEventListener('pointerdown', e => {
    const bar = e.target.closest('.w5-title');
    if (!bar || e.target.closest('[data-o5]') || os5Narrow()) return;
    const win = bar.parentElement, area = $('o5Desk').getBoundingClientRect(), r = win.getBoundingClientRect();
    o5Focus(win.dataset.win);
    drag = { id: win.dataset.win, dx: e.clientX - r.left, dy: e.clientY - r.top, area };
    bar.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  root.addEventListener('pointermove', e => {
    if (!drag) return;
    const l = S.os5.layout[drag.id], a = drag.area;
    l.x = Math.max(0, Math.min(1, (e.clientX - a.left - drag.dx) / a.width));
    l.y = Math.max(0, Math.min(1, (e.clientY - a.top - drag.dy) / a.height));
    o5Layout();
  });
  const stop = () => { drag = null; };
  root.addEventListener('pointerup', stop);
  root.addEventListener('pointercancel', stop);
  window.addEventListener('resize', o5Layout);
  const wake = () => { lastInput5 = Date.now(); stopSaver5(); };
  for (const type of ['pointerdown', 'keydown', 'wheel', 'touchstart']) window.addEventListener(type, wake, { passive: true, capture: true });
  document.addEventListener('keydown', e => {
    if (dlg5 && os5On() && !achMenu && (e.key === 'Enter' || e.key === ' ') && o5Top() !== 'pin') { e.preventDefault(); dlg5Next(); }
  });
}

// ---------------------------------------------------------------- from 4.0 to 5.0
let setup5Running = false;
const setup5Ready = () => !!S.os4 && S.os4.unlocked && !!S.os4.line && S.os4.chapter >= CHAPTERS4.length && !S.os5.unlocked;
function playSetup5() {
  if (setup5Running || !setup5Ready() || !$('start5')) return;
  setup5Running = true;
  closeAchMenu();
  closeDialogue4();
  Music.hold(true);
  const box = $('start5');
  box.classList.remove('hidden');
  Music.fx('start5');
  setTimeout(() => {
    box.classList.add('hidden');
    S.os5.unlocked = true;
    S.os5.on = true;
    setup5Running = false;
    Music.hold(false);
    lastInput5 = Date.now();
    document.body.classList.add('os5-opening');
    setTimeout(() => document.body.classList.remove('os5-opening'), 1400);
    checkAch();
    save(true);
  }, reduceMotion() ? 400 : 4200);
}
