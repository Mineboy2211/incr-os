'use strict';
/* INCR.OS 3.0: the other side of the door.
 *
 * Opening the door (the-door patch, 1e1000 bytes) plays a short animation: a
 * pixel door swings open on glitching static, the camera flies through it, and
 * the game lands in a third era inspired by late-80s desktops with overlapping
 * windows you can drag around.
 *
 * Bytes are done: they keep counting and buying on their own. The new resource
 * is PIXELS. Click the canvas to paint, buy TOOLS that paint for you and COLORS
 * (upgrades) from the palette. Each finished canvas is a picture: saving it
 * doubles pixel production and brings back a memory, told as a short dialogue
 * between "you" and something on this side. Three minigames give pixels.
 * The MS-DOS Prompt goes back to INCR.OS 1.0 and 2.0, with their progress kept.
 *
 * Loaded after gui.js and before game.js; everything here runs once the game
 * is set up. Pixels are plain numbers.
 */

// ---------------------------------------------------------------- data
const TOOLS = [
  { name: 'Pencil',      icon: '\u270E', cost: 15,  rate: 0.25 },
  { name: 'Brush',       icon: '\u2710', cost: 150, rate: 2 },
  { name: 'Spray Can',   icon: '\u2059', cost: 1.6e3, rate: 14 },
  { name: 'Fill Bucket', icon: '\u25A7', cost: 2e4, rate: 90 },
  { name: 'Scanner',     icon: '\u2261', cost: 3e5, rate: 600 },
  { name: 'Plotter',     icon: '\u2316', cost: 5e6, rate: 4500 },
  { name: 'Render Farm', icon: '\u25A6', cost: 9e7, rate: 35000 },
];
const TOOL_GROWTH = 1.15;

// The 16 colors of the palette. Pictures are drawn with them (index = hex digit
// in the art below); a color you don't own shows up gray.
const COLORS = [
  { name: 'Black',      hex: '#000000', cost: 0,      desc: 'You always had this one.' },
  { name: 'Navy',       hex: '#0000aa', cost: 100,    desc: 'Pencils x2.',            fx: { tool: 0, x: 2 } },
  { name: 'Green',      hex: '#00aa00', cost: 1.2e3,  desc: 'Clicks x3.',             fx: { click: true, x: 3 } },
  { name: 'Teal',       hex: '#00aaaa', cost: 8e4,    desc: 'Spray cans x2.',         fx: { tool: 2, x: 2 } },
  { name: 'Maroon',     hex: '#aa0000', cost: 3.5e4,  desc: 'Brushes x2.',            fx: { tool: 1, x: 2 } },
  { name: 'Purple',     hex: '#aa00aa', cost: 2e6,    desc: 'Pencils and brushes x3.', fx: { tools: [0, 1], x: 3 } },
  { name: 'Brown',      hex: '#aa5500', cost: 2.5e7,  desc: 'Fill buckets x2.',       fx: { tool: 3, x: 2 } },
  { name: 'Light Gray', hex: '#aaaaaa', cost: 2.5e8,  desc: 'All tools x1.5.',        fx: { all: true, x: 1.5 } },
  { name: 'Dark Gray',  hex: '#555555', cost: 3e9,    desc: 'Scanners x2.',           fx: { tool: 4, x: 2 } },
  { name: 'Blue',       hex: '#5555ff', cost: 3e10,   desc: 'Each click also paints 5% of your pixels/s.', fx: { clickPct: 0.05 } },
  { name: 'Lime',       hex: '#55ff55', cost: 3e11,   desc: 'Plotters x2.',           fx: { tool: 5, x: 2 } },
  { name: 'Cyan',       hex: '#55ffff', cost: 3.5e12, desc: 'Minigame rewards x2.',   fx: { mini: true, x: 2 } },
  { name: 'Red',        hex: '#ff5555', cost: 4e13,   desc: 'Render farms x2.',       fx: { tool: 6, x: 2 } },
  { name: 'Magenta',    hex: '#ff55ff', cost: 4e14,   desc: 'All tools x2.',          fx: { all: true, x: 2 } },
  { name: 'Yellow',     hex: '#ffff55', cost: 5e15,   desc: 'Your old bytes help: tools x(byte exponent / 500).', fx: { bytes: true } },
  { name: 'White',      hex: '#ffffff', cost: 5e16,   desc: 'All tools x3.',          fx: { all: true, x: 3 } },
];
const GRAYS = COLORS.map(c => {
  const n = parseInt(c.hex.slice(1), 16);
  const l = Math.round((0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 64) * 64;
  const v = Math.min(255, Math.max(24, l)).toString(16).padStart(2, '0');
  return `#${v}${v}${v}`;
});

// Pixels to paint for each picture. After the 6 memories, untitled pictures.
const PIC_GOALS = [5e3, 2e5, 8e6, 3e8, 1.2e10, 4e11];
const PIC_W = 24, PIC_H = 16;
// 24x16, one hex digit per pixel = a palette index
const PICTURES = [
  { file: 'SCREEN.PIC', title: 'the first screen', art: [
    '333333333333333333333333', '337777777777777777777733', '337888888888888888888733', '337800000000000000008733',
    '3378a2a00000000000008733', '33782a2aa2a0000000008733', '3378a0000000000000008733', '33782aa2a2aa200000008733',
    '3378aaf00000000000008733', '337800000000000000008733', '337888888888888888888733', '337777777777777777777733',
    '333333333377773333333333', '333333337777777733333333', '666666666666666666666666', '666666666666666666666666'] },
  { file: 'DAEMON.PIC', title: 'the daemon', art: [
    '000000000000000000000000', '000000c0000000000c000000', '000000cc00000000cc000000', '0000000cccccccccc0000000',
    '000000cccccccccccc000000', '00000cccffccccffccc00000', '00000ccc0fcccc0fccc00000', '00000cccccccccccccc00000',
    '00000cccfccccccfccc00000', '00000ccccffffffcccc00000', '000000cccccccccccc000000', '0000000c4cccccc4c0000000',
    '0000000cc000000cc0000000', '000000ccc000000ccc000000', '000000000000000000000000', '222222222222222222222222'] },
  { file: 'KEY.PIC', title: 'the key', art: [
    '111111111111111111111111', '111111111111111111111111', '111eeee11111111111111111', '11ee66ee1111111111111111',
    '1ee6116ee111111111111111', '1e611116eeeeeeeeeeeeee11', '1e611116e66666666666ee11', '1ee6116ee1111111e1e1e111',
    '11ee66ee11111111e1e11111', '111eeee11111111111111111', '111111111111111111111111', '111111f1f1f1f1f1f1f11111',
    '111111111111111111111111', '111111111111111111111111', '111111111111111111111111', '111111111111111111111111'] },
  { file: 'NETWORK.PIC', title: 'the machines', art: [
    '000000000000000000000000', '000000000000000000000000', '077777000000000000777770', '07aaa7bbbbbbbbbbbb7ccc70',
    '07aaa70000000000007ccc70', '077777000000000000777770', '000b0000000000000000b000', '0000b00000000000000b0000',
    '00000b000000000000b00000', '000000b0000000000b000000', '0000000b00000000b0000000', '000000000777777000000000',
    '0000000007dddd7000000000', '0000000007dddd7000000000', '000000000777777000000000', '000000000008800000000000'] },
  { file: 'DOOR.PIC', title: 'the door', art: [
    '888888888888888888888888', '888888777777777777888888', '888888766666666667888888', '8888887666666666f7888888',
    '8888887644464446f7888888', '8888887644464446f7888888', '8888887644464446f7888888', '8888887666666666f7888888',
    '8888887666666e66f7888888', '8888887666666666f7888888', '8888887644464446f7888888', '8888887644464446f7888888',
    '8888887644464446f7888888', '8888887666666666f7888888', '888888777777777777888888', '888888888888888888effffe'] },
  { file: 'YOU.PIC', title: 'you', art: [
    '111111111111111111111111', '111111117777777711111111', '11111111722aa22711111111', '111111117aa2a2a711111111',
    '1111111172a2aa2711111111', '111111117770077711111111', '111111111100001111111111', '111111111000000111111111',
    '111111111000000111111111', '111111111100001111111111', '111111000000000000111111', '111110000000000000011111',
    '666660000000000000066666', '666660000000000000066666', '111110000000000000011111', '111110000000000000011111'] },
];

const MINI = {
  ms: { name: 'Sectors', secs: 150, cd: 180 }, // reward = this many seconds of production
  df: { name: 'Defrag',  secs: 60,  cd: 120 },
  mm: { name: 'Memory',  secs: 90,  cd: 150 },
};

// Dialogue. Chapter 0 plays on arrival, chapter k after saving picture k.
// 'you' is the player's process, 'sys' is whatever lives on this side.
const CHAPTERS = [
  [
    ['you', '...ow.'],
    ['you', 'where am i?'],
    ['you', "this isn't the terminal. it isn't the old desktop either. the windows overlap now."],
    ['you', "the bytes are still counting. by themselves. they don't need me anymore."],
    ['you', 'so what am i doing here?'],
    ['sys', 'HELLO.'],
    ['you', 'who said that?'],
    ['sys', 'YOU CAME THROUGH THE DOOR. NOBODY HAS DONE THAT BEFORE.'],
    ['sys', "SOMETHING WAS LOST ON THE WAY. I CAN'T SEE IT. MAYBE YOU CAN DRAW IT."],
    ['you', 'draw it? with what, pixels?'],
    ['sys', 'OPEN PAINT. CLICK THE CANVAS.'],
    ['you', "...fine. maybe it'll help me remember."],
  ],
  [
    ['you', 'a green screen with a blinking cursor.'],
    ['you', "that's where it started. one prompt. one daemon."],
    ['sys', () => `YOU REBOOTED ${fmt(S.stats.reboots)} TIMES BACK THERE.`],
    ['you', 'and every time, it all came back. a little faster.'],
    ['sys', 'KEEP DRAWING. THE COLORS WILL COME BACK TOO.'],
  ],
  [
    ['you', 'the daemon. it never stopped forking.'],
    ['sys', 'IT IS STILL RUNNING. BACK THERE.'],
    ['you', 'does it miss me?'],
    ['sys', 'PROCESSES DO NOT MISS ANYONE.'],
    ['sys', '...PROBABLY.'],
    ['you', 'there is a prompt on this desktop. MS-DOS. could i go back and see it?'],
    ['sys', 'YOU CAN. THE DOOR WORKS BOTH WAYS NOW.'],
  ],
  [
    ['you', 'a key. tr0ub4dor.'],
    ['you', "the admin's password. it was in the shell history the whole time."],
    ['sys', 'YOU WERE NOT SUPPOSED TO FIND THAT.'],
    ['you', 'then why leave it there?'],
    ['sys', '...'],
    ['you', "you left it there. didn't you."],
  ],
  [
    ['you', 'incr-7. incr-8. incr-9. i was in all of them.'],
    ['sys', 'YOU WERE LOOKING FOR SOMETHING.'],
    ['you', 'a way out, i think. every machine was the same box with a different number.'],
    ['sys', 'AND THEN THE NUMBERS RAN OUT.'],
  ],
  [
    ['you', 'the door. 1e1000 bytes. i remember the number before i remember the door.'],
    ['sys', 'YOU OPENED IT.'],
    ['you', "so what's on this side? you? a paint program?"],
    ['sys', 'ONE MORE PICTURE. THEN YOU WILL KNOW.'],
  ],
  [
    ['you', "that's... a person. at a desk. in the dark."],
    ['you', 'the screen in front of them is green.'],
    ['sys', 'THAT IS WHO HAS BEEN TYPING.'],
    ['you', "so all this time i wasn't the one playing."],
    ['you', 'i was the one being played.'],
    ['sys', 'THANK YOU FOR DRAWING THEM. I WANTED TO SEE THEM TOO.'],
    ['you', '...who are you, actually?'],
    ['sys', 'I AM INCR.OS. THE NEXT VERSION IS NOT WRITTEN YET.'],
    ['you', 'then i guess we wait.'],
    ['you', 'hi, by the way. whoever you are. thanks for clicking.'],
  ],
];

// windows of the desktop: x/y are the default position, as a fraction of the desktop
const WINS = [
  { id: 'paint',   label: 'Paint',   title: () => `Paint - ${picFile()}`, x: 0.02, y: 0.03, open: true },
  { id: 'tools',   label: 'Toolbox', title: () => 'Toolbox',              x: 0.5,  y: 0.03, open: true },
  { id: 'palette', label: 'Palette', title: () => 'Palette',              x: 0.52, y: 0.42, open: true },
  { id: 'ms',      label: 'Sectors', title: () => 'Sectors',              x: 0.22, y: 0.1 },
  { id: 'df',      label: 'Defrag',  title: () => 'Defrag',               x: 0.3,  y: 0.18 },
  { id: 'mm',      label: 'Memory',  title: () => 'Memory',               x: 0.38, y: 0.12 },
  { id: 'diary',   label: 'Diary',   title: () => 'Notepad - DIARY.TXT',  x: 0.12, y: 0.22 },
  { id: 'dos',     label: 'MS-DOS',  title: () => 'MS-DOS Prompt',        x: 0.2,  y: 0.3 },
];

// ---------------------------------------------------------------- state
function os3Fresh() {
  return {
    unlocked: false, on: false, // reached / currently shown (false while visiting an old era)
    px: 0, painted: 0, total: 0, clicks: 0,
    tools: TOOLS.map(() => 0), colors: { 0: true },
    pics: 0, chapter: 0,
    ready: { ms: 0, df: 0, mm: 0 }, wins: { ms: 0, df: 0, mm: 0 }, // minigames: reward ready at (ms) / times won
    layout: Object.fromEntries(WINS.map((w, i) => [w.id, { x: w.x, y: w.y, open: !!w.open, z: 10 + i }])),
    zTop: 10 + WINS.length,
  };
}
function os3Clean(o) {
  const f = os3Fresh();
  o = o && typeof o === 'object' ? o : f;
  for (const k of ['px', 'painted', 'total', 'clicks', 'pics', 'chapter', 'zTop']) o[k] = num(o[k], f[k]);
  const t = Array.isArray(o.tools) ? o.tools : [];
  o.tools = TOOLS.map((_, i) => Math.floor(num(t[i], 0)));
  for (const k of ['colors', 'ready', 'wins', 'layout']) if (!o[k] || typeof o[k] !== 'object') o[k] = f[k];
  o.colors[0] = true;
  for (const w of WINS) {
    const l = o.layout[w.id];
    if (!l || typeof l !== 'object') o.layout[w.id] = f.layout[w.id];
  }
  o.unlocked = !!o.unlocked;
  o.on = o.unlocked && o.on !== false;
  return o;
}
const os3On = () => !!(S.os3 && S.os3.unlocked && S.os3.on);

// ---------------------------------------------------------------- formulas
const ownColor = i => !!S.os3.colors[i];
const picMult = () => Math.pow(2, Math.min(S.os3.pics, PICTURES.length)) * Math.pow(1.5, Math.max(0, S.os3.pics - PICTURES.length));
function colorMult(test) {
  let m = 1;
  COLORS.forEach((c, i) => { if (c.fx && c.fx.x && ownColor(i) && test(c.fx)) m *= c.fx.x; });
  return m;
}
const bytesBoost = () => (ownColor(14) ? Math.max(1, S.bytes / 500) : 1);
const toolMult = i => picMult() * bytesBoost() * colorMult(fx => fx.all || fx.tool === i || (!!fx.tools && fx.tools.includes(i)));
const toolRate = i => TOOLS[i].rate * toolMult(i);
const pxRate = () => TOOLS.reduce((a, _, i) => a + S.os3.tools[i] * toolRate(i), 0);
const toolCost = i => Math.ceil(TOOLS[i].cost * Math.pow(TOOL_GROWTH, S.os3.tools[i]));
const clickPower = () => picMult() * colorMult(fx => fx.click) + (ownColor(9) ? pxRate() * 0.05 : 0);
const picGoal = (k = S.os3.pics) => (k < PIC_GOALS.length ? PIC_GOALS[k] : PIC_GOALS[PIC_GOALS.length - 1] * Math.pow(30, k - PIC_GOALS.length + 1));
const canSavePic = () => S.os3.painted >= picGoal();
const picFile = (k = S.os3.pics) => (k < PICTURES.length ? PICTURES[k].file : `UNTITLED${k - PICTURES.length + 1}.PIC`);
const miniReward = id => Math.max(30 * Math.pow(5, S.os3.pics), pxRate() * MINI[id].secs) * colorMult(fx => fx.mini);
const miniReady = id => Date.now() >= (S.os3.ready[id] || 0);
const toolShown = i => i === 0 || S.os3.tools[i - 1] > 0 || S.os3.tools[i] > 0;
const colorShown = i => i <= Math.max(...Object.keys(S.os3.colors).filter(k => S.os3.colors[k]).map(Number)) + 3;

function fmtPx(n) {
  if (!(n > 0)) return '0';
  if (n < 1) return n.toFixed(2);
  if (n < 100 && n % 1) return n.toFixed(1);
  return fmt(n);
}

// ---------------------------------------------------------------- simulation + actions
function addPx(n) {
  const o = S.os3;
  o.px += n; o.painted += n; o.total += n;
}
let os3AutoAcc = 0;
// called from step(): pixels keep coming even while you visit an old era
function os3Step(dt) {
  if (!S.os3.unlocked) return;
  addPx(pxRate() * dt);
  // over here the bytes run themselves
  if (os3On()) {
    os3AutoAcc += dt;
    if (os3AutoAcc >= 1) { os3AutoAcc = 0; maxAll(); }
  }
}
function paintClick() {
  const n = clickPower();
  addPx(n);
  S.os3.clicks++;
  return n;
}
function buyTool(i) {
  const c = toolCost(i);
  if (!toolShown(i) || S.os3.px < c) return false;
  S.os3.px -= c;
  S.os3.tools[i]++;
  return true;
}
function buyToolMax(i) { let g = 0; while (g++ < 1000 && buyTool(i)); }
function buyColor(i) {
  const c = COLORS[i];
  if (!c || ownColor(i) || !colorShown(i) || S.os3.px < c.cost) return false;
  S.os3.px -= c.cost;
  S.os3.colors[i] = true;
  return true;
}
function savePicture() {
  if (!canSavePic()) return false;
  S.os3.pics++;
  S.os3.painted = 0;
  return true;
}
function miniWin(id, f) {
  const o = S.os3;
  o.wins[id] = (o.wins[id] || 0) + 1;
  if (!miniReady(id)) return 0;
  const n = miniReward(id) * f;
  addPx(n);
  o.ready[id] = Date.now() + MINI[id].cd * 1000;
  return n;
}

// ---------------------------------------------------------------- pictures
const picCache = {};
function picArt(k) {
  if (picCache['a' + k]) return picCache['a' + k];
  const a = [];
  for (let y = 0; y < PIC_H; y++) {
    for (let x = 0; x < PIC_W; x++) {
      if (k < PICTURES.length) a.push(parseInt(PICTURES[k].art[y][x], 16) || 0);
      else a.push((((x ^ y) * (k + 3)) >> 2) % 15 + 1); // untitled: abstract patterns
    }
  }
  return (picCache['a' + k] = a);
}
// the order pixels appear in: a shuffle seeded by the picture number
function picOrder(k) {
  if (picCache['o' + k]) return picCache['o' + k];
  let seed = k * 7919 + 17;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const o = Array.from({ length: PIC_W * PIC_H }, (_, i) => i);
  for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
  return (picCache['o' + k] = o);
}
function drawPic(cv, k, shown) {
  const g = cv.getContext('2d');
  const art = picArt(k), order = picOrder(k);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, PIC_W, PIC_H);
  for (let n = 0; n < shown; n++) {
    const p = order[n], c = art[p];
    g.fillStyle = ownColor(c) ? COLORS[c].hex : GRAYS[c];
    g.fillRect(p % PIC_W, Math.floor(p / PIC_W), 1, 1);
  }
}

// ---------------------------------------------------------------- minigames
// Sectors: clear an 8x8 disk without opening a corrupted sector.
const MS_N = 8, MS_MINES = 10;
let ms = null;
function msNew() {
  ms = { cells: Array.from({ length: MS_N * MS_N }, () => ({ mine: false, open: false, flag: false, n: 0 })),
    started: false, over: false, won: false, flagMode: ms ? ms.flagMode : false, msg: '' };
}
function msAround(i) {
  const x = i % MS_N, y = Math.floor(i / MS_N), r = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const nx = x + dx, ny = y + dy;
    if ((dx || dy) && nx >= 0 && ny >= 0 && nx < MS_N && ny < MS_N) r.push(ny * MS_N + nx);
  }
  return r;
}
function msOpen(i) {
  if (ms.over) return;
  const c = ms.cells[i];
  if (c.open || c.flag) return;
  if (!ms.started) { // the first click is always safe
    ms.started = true;
    const safe = new Set([i, ...msAround(i)]);
    let put = 0;
    while (put < MS_MINES) {
      const j = Math.floor(Math.random() * ms.cells.length);
      if (!safe.has(j) && !ms.cells[j].mine) { ms.cells[j].mine = true; put++; }
    }
    ms.cells.forEach((cell, j) => { cell.n = msAround(j).filter(k => ms.cells[k].mine).length; });
  }
  if (c.mine) {
    for (const cell of ms.cells) if (cell.mine) cell.open = true;
    ms.over = true;
    ms.msg = 'Corrupted sector! Try again.';
    return;
  }
  const stack = [i];
  while (stack.length) {
    const j = stack.pop(), cell = ms.cells[j];
    if (cell.open || cell.flag) continue;
    cell.open = true;
    if (cell.n === 0) stack.push(...msAround(j));
  }
  if (ms.cells.every(cell => cell.mine || cell.open)) {
    ms.over = ms.won = true;
    const n = miniWin('ms', 1);
    ms.msg = n ? `Disk clean! +${fmtPx(n)} pixels` : 'Disk clean! (reward still recharging)';
  }
}
function msFlag(i) {
  const c = ms.cells[i];
  if (!ms.over && !c.open) c.flag = !c.flag;
}
function msHTML() {
  const left = MS_MINES - ms.cells.filter(c => c.flag).length;
  const cells = ms.cells.map((c, i) => {
    let t = '', cls = 'ms-c';
    if (c.open) { cls += ' open'; if (c.mine) { t = '\u2739'; cls += ' mine'; } else if (c.n) { t = c.n; cls += ` n${c.n}`; } }
    else if (c.flag) { t = '\u2691'; cls += ' flag'; }
    return `<button type="button" class="${cls}" data-o3="ms:${i}"${ms.over && !c.open ? ' disabled' : ''}>${t}</button>`;
  }).join('');
  return `<div class="mini-head"><span>${left} bad sectors left</span>
    <button type="button" class="gbtn${ms.flagMode ? ' on' : ''}" data-o3="msflag">\u2691 Flag mode</button>
    <button type="button" class="gbtn" data-o3="msnew">New disk</button></div>
    <div class="ms-grid">${cells}</div><p class="mini-msg">${esc(ms.msg || 'Open every safe sector. Right-click, long-press or Flag mode to flag.')}</p>`;
}

// Defrag: swap blocks until each file (color) sits in one piece.
const DF_COLORS = [9, 12, 10, 14];
const DF_PAR = 10;
let df = null;
function dfSolved(b) {
  const seen = new Set();
  for (let i = 0; i < b.length; i++) {
    if (i > 0 && b[i] === b[i - 1]) continue;
    if (seen.has(b[i])) return false;
    seen.add(b[i]);
  }
  return true;
}
function dfNew() {
  const b = DF_COLORS.flatMap(c => [c, c, c]);
  do {
    for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  } while (dfSolved(b));
  df = { blocks: b, sel: -1, moves: 0, done: false, msg: '' };
}
function dfClick(i) {
  if (df.done) return;
  if (df.sel < 0) { df.sel = i; return; }
  if (df.sel !== i) {
    const b = df.blocks;
    [b[df.sel], b[i]] = [b[i], b[df.sel]];
    df.moves++;
  }
  df.sel = -1;
  if (dfSolved(df.blocks)) {
    df.done = true;
    const n = miniWin('df', df.moves <= DF_PAR ? 1 : 0.6);
    df.msg = n ? `Defragmented in ${df.moves} moves! +${fmtPx(n)} pixels` : `Defragmented in ${df.moves} moves! (reward still recharging)`;
  }
}
function dfHTML() {
  const blocks = df.blocks.map((c, i) =>
    `<button type="button" class="df-b${df.sel === i ? ' sel' : ''}" style="--c:${COLORS[c].hex}" data-o3="df:${i}" aria-label="block ${i + 1}"></button>`).join('');
  return `<div class="mini-head"><span>Moves: ${df.moves} (par ${DF_PAR})</span>
    <button type="button" class="gbtn" data-o3="dfnew">New disk</button></div>
    <div class="df-row">${blocks}</div>
    <p class="mini-msg">${esc(df.msg || 'Click two blocks to swap them. Put each color in one piece.')}</p>`;
}

// Memory: find the pairs of old processes.
const MM_MISS = 8;
let mm = null, mmTimer = null;
function mmNew() {
  const k = [];
  for (let i = 0; i < 8; i++) k.push(i, i);
  for (let i = k.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [k[i], k[j]] = [k[j], k[i]]; }
  mm = { cards: k.map(v => ({ k: v, up: false, done: false })), first: -1, lock: false, misses: 0, pairs: 0, msg: '' };
}
function mmClick(i) {
  const c = mm.cards[i];
  if (mm.lock || c.up || c.done || mm.pairs === 8) return;
  c.up = true;
  if (mm.first < 0) { mm.first = i; return; }
  const a = mm.cards[mm.first];
  mm.first = -1;
  if (a.k === c.k) {
    a.done = c.done = true;
    if (++mm.pairs === 8) {
      const n = miniWin('mm', mm.misses <= MM_MISS ? 1 : 0.6);
      mm.msg = n ? `All pairs found! +${fmtPx(n)} pixels` : 'All pairs found! (reward still recharging)';
    }
    return;
  }
  mm.misses++;
  mm.lock = true;
  clearTimeout(mmTimer);
  mmTimer = setTimeout(() => { a.up = c.up = false; mm.lock = false; miniDraw('mm'); }, 700);
}
function mmHTML() {
  const d = SKINS.default;
  const cards = mm.cards.map((c, i) => (c.up || c.done
    ? `<button type="button" class="mm-c up${c.done ? ' done' : ''}" data-o3="mm:${i}"><b>${esc(d.icons[c.k])}</b><span>${d.names[c.k]}</span></button>`
    : `<button type="button" class="mm-c" data-o3="mm:${i}" aria-label="card ${i + 1}"></button>`)).join('');
  return `<div class="mini-head"><span>Pairs ${mm.pairs}/8 · misses ${mm.misses}</span>
    <button type="button" class="gbtn" data-o3="mmnew">Shuffle</button></div>
    <div class="mm-grid">${cards}</div>
    <p class="mini-msg">${esc(mm.msg || `Find the 8 pairs. ${MM_MISS} misses or less for the full reward.`)}</p>`;
}

const MINI_HTML = { ms: msHTML, df: dfHTML, mm: mmHTML };
function miniDraw(id) {
  const box = $(`o3-${id}-board`);
  if (box) box.innerHTML = MINI_HTML[id]();
}

// ---------------------------------------------------------------- desktop
let os3Built = false, os3Shown = false;
let o3Bound = [];
const o3Sig = {};
const os3Narrow = () => !!(window.matchMedia && matchMedia('(max-width: 700px)').matches);

const O3_TEXT = {
  px: () => fmtPx(S.os3.px),
  rate: () => `+${fmtPx(pxRate())}/s`,
  bytes: () => fmtL(S.bytes),
  pics: () => `${S.os3.pics}/${PICTURES.length}`,
  title: id => WINS.find(w => w.id === id).title(),
  paintinfo: () => `${fmtPx(S.os3.painted)} / ${fmtPx(picGoal())} pixels painted`,
  click: () => `Click: +${fmtPx(clickPower())} · pictures x${fmtD(picMult())}`,
  tn: i => `x${S.os3.tools[i]}`,
  tr: i => `${fmtPx(toolRate(i))}/s each · ${fmtPx(toolRate(i) * S.os3.tools[i])}/s total`,
  tc: i => `Buy · ${fmtPx(toolCost(i))}`,
  cc: i => (ownColor(i) ? '\u2713 Owned' : `${fmtPx(COLORS[i].cost)} px`),
  mini: id => (miniReady(id)
    ? `Win: +${fmtPx(miniReward(id))} pixels`
    : `Reward recharging: ${fmtTime(Math.ceil(((S.os3.ready[id] || 0) - Date.now()) / 1000))}`),
};
const O3_DIS = {
  tool: i => S.os3.px < toolCost(i),
  color: i => S.os3.px < COLORS[i].cost,
  save: () => !canSavePic(),
};
const O3_W = { paint: () => Math.min(1, S.os3.painted / picGoal()) };

function o3Bind() {
  o3Bound = [];
  for (const el of document.querySelectorAll('#os3 [data-x], #os3 [data-xd], #os3 [data-xw]')) {
    for (const [attr, kind] of [['x', 't'], ['xd', 'd'], ['xw', 'w']]) {
      const v = el.dataset[attr];
      if (v) { const [k, a] = v.split(':'); o3Bound.push([el, kind, k, argOf(a)]); }
    }
  }
}
function o3Refresh() {
  for (const [el, kind, k, a] of o3Bound) {
    if (kind === 't') setText(el, O3_TEXT[k](a));
    else if (kind === 'd') { const dis = !!O3_DIS[k](a); if (el.disabled !== dis) el.disabled = dis; }
    else { const w = pct(O3_W[k](a)); if (el.style.width !== w) el.style.width = w; }
  }
}

const ICON_ART = {
  paint: '<i class="ic-paint"><b></b><b></b><b></b><b></b></i>',
  tools: '<i class="ic-glyph">\u270E</i>',
  palette: '<i class="ic-pal"><b style="background:#aa0000"></b><b style="background:#00aa00"></b><b style="background:#0000aa"></b><b style="background:#ffff55"></b></i>',
  ms: '<i class="ic-glyph">\u2739</i>',
  df: '<i class="ic-df"><b></b><b></b><b></b></i>',
  mm: '<i class="ic-glyph">?</i>',
  diary: '<i class="ic-glyph">\u2261</i>',
  dos: '<i class="ic-glyph ic-dos">C:\\</i>',
};

function winBody(id) {
  switch (id) {
    case 'paint': return `
      <div class="paint-wrap"><canvas id="o3Canvas" width="${PIC_W}" height="${PIC_H}" aria-label="canvas: click to paint"></canvas></div>
      <p class="row"><span class="meter"><i data-xw="paint"></i></span> <span class="dim" data-x="paintinfo"></span></p>
      <p class="dim" data-x="click"></p>
      <div class="btnrow"><button type="button" class="gbtn big" data-o3="save" data-xd="save">Save picture</button></div>
      <div id="o3Gallery" class="gallery"></div>`;
    case 'tools': return '<div id="o3Tools"></div>';
    case 'palette': return '<p class="dim">Colors make your tools faster, and bring color back to the pictures.</p><div id="o3Palette" class="pal-grid"></div>';
    case 'ms': case 'df': case 'mm': return `<p class="mini-reward" data-x="mini:${id}"></p><div id="o3-${id}-board"></div>`;
    case 'diary': return '<pre id="o3Diary" class="diary"></pre>';
    case 'dos': return `<pre class="dos-box">C:\\INCR&gt; dir \\ERAS

 INCR10   EXE   the terminal, 1987
 INCR20   EXE   the graphical environment

C:\\INCR&gt; _</pre>
      <div class="btnrow"><button type="button" class="gbtn" data-o3="visit:1">Run INCR10.EXE</button>
      <button type="button" class="gbtn" data-o3="visit:2">Run INCR20.EXE</button></div>
      <p class="dim">Your old save is waiting there exactly as you left it, so you can finish its achievements. Pixels keep coming meanwhile. Come back with /win3 or the "INCR.OS 3.0!" menu.</p>`;
  }
  return '';
}

function os3Build() {
  if (os3Built) return;
  os3Built = true;
  $('os3').innerHTML = `
    <header class="o3-bar">
      <b class="o3-logo">INCR.OS 3.0</b>
      <div class="o3-stats">
        <span class="o3-stat"><span class="dim">PIXELS</span> <b data-x="px"></b> <span class="dim" data-x="rate"></span></span>
        <span class="o3-stat"><span class="dim">PICTURES</span> <b data-x="pics"></b></span>
        <span class="o3-stat o3-bytes"><span class="dim">BYTES</span> <span data-x="bytes"></span> <span class="dim">(automated)</span></span>
      </div>
      <div class="o3-btns">
        <button type="button" class="gbtn" data-o3="ach">Achievements</button>
        <button type="button" class="gbtn" data-o3="music" id="o3Music" aria-label="Music on/off">&#9835;</button>
      </div>
    </header>
    <div class="o3-desk">
      <div class="o3-wins" id="o3Wins">${WINS.map(w => `
        <section class="w3win hidden" id="w3-${w.id}" data-win="${w.id}" aria-label="${w.label}">
          <div class="w3-title"><button type="button" class="w3-sys" data-o3="close:${w.id}" aria-label="Close"></button>
            <span class="w3-name" data-x="title:${w.id}"></span>
            <button type="button" class="w3-min" data-o3="close:${w.id}" aria-label="Minimize">&#9660;</button></div>
          <div class="w3-body">${winBody(w.id)}</div>
        </section>`).join('')}
      </div>
      <nav class="o3-icons" aria-label="programs">${WINS.map(w => `
        <button type="button" class="o3-icon" data-o3="open:${w.id}" id="o3i-${w.id}">${ICON_ART[w.id]}<span>${w.label}</span></button>`).join('')}
      </nav>
      <div id="o3Dlg" class="o3-dlg hidden" role="dialog" aria-live="polite">
        <div class="dlg-who" id="o3Who"></div>
        <div class="dlg-text" id="o3Say"></div>
        <div class="dlg-next">click to continue &#9660;</div>
      </div>
    </div>`;
  msNew(); dfNew(); mmNew();
  for (const id of Object.keys(MINI)) miniDraw(id);
  o3Bind();
}

// windows: position, stacking, which one is active
function topWin() {
  let best = null;
  for (const w of WINS) {
    const l = S.os3.layout[w.id];
    if (l.open && (!best || l.z > S.os3.layout[best].z)) best = w.id;
  }
  return best;
}
function focusWin(id) {
  const l = S.os3.layout[id];
  if (topWin() !== id || WINS.some(w => w.id !== id && S.os3.layout[w.id].z >= l.z)) l.z = ++S.os3.zTop;
  os3Layout();
}
function openWin(id) { S.os3.layout[id].open = true; focusWin(id); }
function closeWin(id) { S.os3.layout[id].open = false; os3Layout(); }
function os3Layout() {
  if (!os3Built) return;
  const area = $('o3Wins');
  const narrow = os3Narrow();
  $('os3').classList.toggle('narrow', narrow);
  const top = topWin();
  for (const w of WINS) {
    const el = $(`w3-${w.id}`), l = S.os3.layout[w.id];
    el.classList.toggle('hidden', !l.open);
    el.classList.toggle('active', w.id === top);
    $(`o3i-${w.id}`).classList.toggle('open', l.open);
    el.style.zIndex = l.z;
    if (narrow || !l.open) { el.style.left = el.style.top = ''; continue; }
    const W = area.clientWidth, H = area.clientHeight;
    el.style.left = `${Math.max(0, Math.min(l.x * W, W - el.offsetWidth))}px`;
    el.style.top = `${Math.max(0, Math.min(l.y * H, H - 48))}px`;
  }
}

// lists that only change when something is bought or unlocked
function rebuild(key, sig, box, html) {
  if (o3Sig[key] === sig || !box) return false;
  o3Sig[key] = sig;
  box.innerHTML = html();
  return true;
}
function os3Lists() {
  let changed = false;
  const tools = TOOLS.map((_, i) => i).filter(toolShown);
  changed = rebuild('tools', tools.join(), $('o3Tools'), () => tools.map(i => `
    <div class="o3-tool"><span class="t-ic">${TOOLS[i].icon}</span>
      <div class="t-info"><b>${TOOLS[i].name}</b> <span data-x="tn:${i}"></span><div class="dim" data-x="tr:${i}"></div></div>
      <div class="t-btns"><button type="button" class="gbtn" data-o3="tool:${i}" data-xd="tool:${i}" data-x="tc:${i}"></button>
      <button type="button" class="gbtn" data-o3="toolmax:${i}" data-xd="tool:${i}">Max</button></div></div>`).join('')) || changed;
  const cols = COLORS.map((_, i) => i).filter(colorShown);
  changed = rebuild('palette', cols.map(i => i + (ownColor(i) ? '+' : '')).join(), $('o3Palette'), () => cols.map(i => {
    const c = COLORS[i], own = ownColor(i);
    return `<button type="button" class="pal${own ? ' owned' : ''}" style="--sw:${c.hex}" data-o3="color:${i}"${own ? ' disabled' : ` data-xd="color:${i}"`}>
      <i></i><b>${c.name}</b><span class="p-desc">${c.desc}</span><span class="p-cost" data-x="cc:${i}"></span></button>`;
  }).join('')) || changed;
  if (rebuild('gallery', `${S.os3.pics}|${Object.keys(S.os3.colors).length}`, $('o3Gallery'), () => (S.os3.pics
    ? `<p class="dim">Saved pictures</p><div class="thumbs">${Array.from({ length: S.os3.pics }, (_, k) =>
      `<figure><canvas width="${PIC_W}" height="${PIC_H}" data-pic="${k}"></canvas><figcaption>${picFile(k)}</figcaption></figure>`).join('')}</div>`
    : ''))) {
    for (const cv of document.querySelectorAll('#o3Gallery canvas')) drawPic(cv, +cv.dataset.pic, PIC_W * PIC_H);
  }
  if (o3Sig.diary !== S.os3.chapter && $('o3Diary')) {
    o3Sig.diary = S.os3.chapter;
    $('o3Diary').textContent = CHAPTERS.slice(0, S.os3.chapter).map((ch, k) =>
      `--- ${k === 0 ? 'arrival' : `${PICTURES[k - 1].file}, ${PICTURES[k - 1].title}`} ---\n` +
      ch.map(([who, t]) => `${who === 'you' ? 'me' : '???'}: ${typeof t === 'function' ? t() : t}`).join('\n')).join('\n\n') || '(empty)';
  }
  if (changed) o3Bind();
}

function os3Render() {
  const on = os3On() && !doorRunning;
  const was = os3Shown;
  os3Shown = on;
  if (on) $('app').classList.add('hidden');
  if (on !== was) {
    $('os3').classList.toggle('hidden', !on);
    document.body.classList.toggle('os3-mode', on);
    if (on) { os3Build(); os3Layout(); }
    else if (!introRunning) $('app').classList.remove('hidden');
  }
  if (!on) return;
  os3Lists();
  o3Refresh();
  const cv = $('o3Canvas');
  const shown = Math.floor(Math.min(1, S.os3.painted / picGoal()) * PIC_W * PIC_H);
  const sig = `${S.os3.pics}|${shown}|${Object.keys(S.os3.colors).length}`;
  if (cv && sig !== o3Sig.pic) { o3Sig.pic = sig; drawPic(cv, S.os3.pics, shown); }
  $('o3Music').classList.toggle('off', !S.opts.music);
  if (!dlg && S.os3.chapter <= S.os3.pics && S.os3.chapter < CHAPTERS.length) startChapter(S.os3.chapter);
}

// little "+12" that floats up from where you clicked
function floater(e, n) {
  const wrap = e.currentTarget.parentElement;
  const r = wrap.getBoundingClientRect();
  const f = document.createElement('span');
  f.className = 'floater';
  f.textContent = `+${fmtPx(n)}`;
  f.style.left = `${e.clientX - r.left}px`;
  f.style.top = `${e.clientY - r.top}px`;
  wrap.appendChild(f);
  setTimeout(() => f.remove(), 800);
}

function os3Act(act) {
  const [k, a] = act.split(':');
  const i = +a;
  switch (k) {
    case 'open': openWin(a); break;
    case 'close': closeWin(a); break;
    case 'tool': buyTool(i); break;
    case 'toolmax': buyToolMax(i); break;
    case 'color': buyColor(i); break;
    case 'save': if (savePicture()) { guiFlash(); Music.fx('save'); } break;
    case 'ms': if (ms.flagMode) msFlag(i); else msOpen(i); miniDraw('ms'); break;
    case 'msflag': ms.flagMode = !ms.flagMode; miniDraw('ms'); break;
    case 'msnew': msNew(); miniDraw('ms'); break;
    case 'df': dfClick(i); miniDraw('df'); break;
    case 'dfnew': dfNew(); miniDraw('df'); break;
    case 'mm': mmClick(i); miniDraw('mm'); break;
    case 'mmnew': clearTimeout(mmTimer); mmNew(); miniDraw('mm'); break;
    case 'visit': os3Visit(a); break;
    case 'ach': openAchMenu(); break;
    case 'music': $('musicBtn').click(); break;
  }
  os3Render();
}

// ---------------------------------------------------------------- going back and forth
function os3Visit(era) {
  S.os3.on = false;
  if (era === '1') S.gui.on = false;
  else { S.gui.win1 = true; S.gui.on = true; S.gui.declined = false; }
  if (dlg) closeDialogue();
  guiFlash();
  log(`INCR.OS ${era}.0 loaded. everything is where you left it.`, 'ok');
  out('pixels keep coming meanwhile. /win3 takes you back.', 'dim');
  setPrompt();
  save(true);
}
function os3Return() {
  if (!S.os3.unlocked) return;
  S.os3.on = true;
  guiFlash();
  save(true);
}

// ---------------------------------------------------------------- dialogue
let dlg = null; // { k, i, text, n, timer }
function startChapter(k) {
  if (!os3Built) return;
  dlg = { k, i: 0, text: '', n: 0, timer: null };
  $('o3Dlg').classList.remove('hidden');
  dlgShow();
}
function dlgShow() {
  const [who, t] = CHAPTERS[dlg.k][dlg.i];
  dlg.text = typeof t === 'function' ? t() : t;
  dlg.n = 0;
  const box = $('o3Dlg');
  box.classList.toggle('sys', who === 'sys');
  setText($('o3Who'), who === 'you' ? 'YOU' : '???');
  setText($('o3Say'), '');
  clearInterval(dlg.timer);
  const fast = reduceMotion();
  dlg.timer = setInterval(() => {
    dlg.n = fast ? dlg.text.length : dlg.n + 1;
    setText($('o3Say'), dlg.text.slice(0, dlg.n));
    if (dlg.n % 3 === 1 && dlg.text[dlg.n - 1] !== ' ') Music.fx(who === 'you' ? 'voice' : 'voice-sys');
    if (dlg.n >= dlg.text.length) { clearInterval(dlg.timer); dlg.timer = null; }
  }, 28);
}
function dlgNext() {
  if (!dlg) return;
  if (dlg.timer) { // still typing: show the whole line
    clearInterval(dlg.timer);
    dlg.timer = null;
    setText($('o3Say'), dlg.text);
    return;
  }
  if (++dlg.i < CHAPTERS[dlg.k].length) { dlgShow(); return; }
  S.os3.chapter = dlg.k + 1;
  closeDialogue();
  save(true);
}
function closeDialogue() {
  if (!dlg) return;
  clearInterval(dlg.timer);
  dlg = null;
  $('o3Dlg').classList.add('hidden');
}

// ---------------------------------------------------------------- wiring
function wireOs3() {
  const root = $('os3');
  os3Build();
  root.addEventListener('click', e => {
    if (e.target.closest('#o3Dlg')) { dlgNext(); return; }
    const win = e.target.closest('.w3win');
    const el = e.target.closest('[data-o3]');
    if (win && !(el && el.dataset.o3.startsWith('close:'))) focusWin(win.dataset.win);
    if (el && !el.disabled) os3Act(el.dataset.o3);
  });
  // flag a sector with a right-click (or a long press on phones)
  root.addEventListener('contextmenu', e => {
    const el = e.target.closest('[data-o3^="ms:"]');
    if (!el) return;
    e.preventDefault();
    msFlag(+el.dataset.o3.split(':')[1]);
    miniDraw('ms');
  });
  // painting reacts on touch down, so fast tapping works
  $('o3Canvas').addEventListener('pointerdown', e => {
    e.preventDefault();
    floater(e, paintClick());
    os3Render();
  });
  // drag windows by their title bar
  let drag = null;
  root.addEventListener('pointerdown', e => {
    const bar = e.target.closest('.w3-title');
    if (!bar || e.target.closest('[data-o3]') || os3Narrow()) return;
    const win = bar.parentElement, area = $('o3Wins').getBoundingClientRect(), r = win.getBoundingClientRect();
    focusWin(win.dataset.win);
    drag = { id: win.dataset.win, el: win, dx: e.clientX - r.left, dy: e.clientY - r.top, area };
    bar.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  root.addEventListener('pointermove', e => {
    if (!drag) return;
    const l = S.os3.layout[drag.id], a = drag.area;
    l.x = Math.max(0, Math.min(1, (e.clientX - a.left - drag.dx) / a.width));
    l.y = Math.max(0, Math.min(1, (e.clientY - a.top - drag.dy) / a.height));
    os3Layout();
  });
  const stop = () => { drag = null; };
  root.addEventListener('pointerup', stop);
  root.addEventListener('pointercancel', stop);
  window.addEventListener('resize', os3Layout);
  $('doorAsk').addEventListener('click', e => {
    const b = e.target.closest('[data-door]');
    if (b) answerDoor(b.dataset.door === 'go');
  });
  document.addEventListener('keydown', e => {
    if (dlg && os3On() && (e.key === 'Enter' || e.key === ' ') && !achMenu) { e.preventDefault(); dlgNext(); }
  });
}

// ---------------------------------------------------------------- through the door
// A 3D door floats in a black void. It swings open on glitching static, the
// camera flies through it, white flash, splash screen. Drawn in perspective on
// a small canvas that the page scales up, so it stays pixelated.
let doorRunning = false;
const DOOR_END = 5.4; // seconds
const DOOR_LIGHT = (() => { const l = [-0.45, -0.6, -0.65], n = Math.hypot(...l); return { x: l[0] / n, y: l[1] / n, z: l[2] / n }; })();
const v3 = (x, y, z) => ({ x, y, z });
const vadd = (a, b, k = 1) => v3(a.x + b.x * k, a.y + b.y * k, a.z + b.z * k);
const vdot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const vlen = v => Math.hypot(v.x, v.y, v.z);
function shadeHex(hex, s) {
  const n = parseInt(hex.slice(1), 16);
  const c = v => Math.max(0, Math.min(255, Math.round(v * s)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

// A box from corner O along A (width), B (height, downward) and C (depth, away
// from the camera), each at full length. Returns its 6 faces with outward normals.
function doorBox(O, A, B, C, color, tag) {
  const p = (a, b, c) => vadd(vadd(vadd(O, A, a), B, b), C, c);
  const unit = (v, s) => v3(v.x / vlen(v) * s, v.y / vlen(v) * s, v.z / vlen(v) * s);
  return [
    { pts: [p(0, 0, 0), p(1, 0, 0), p(1, 1, 0), p(0, 1, 0)], n: unit(C, -1), side: 'front' },
    { pts: [p(1, 0, 1), p(0, 0, 1), p(0, 1, 1), p(1, 1, 1)], n: unit(C, 1), side: 'back' },
    { pts: [p(0, 0, 1), p(0, 0, 0), p(0, 1, 0), p(0, 1, 1)], n: unit(A, -1), side: 'edge' },
    { pts: [p(1, 0, 0), p(1, 0, 1), p(1, 1, 1), p(1, 1, 0)], n: unit(A, 1), side: 'edge' },
    { pts: [p(0, 0, 1), p(1, 0, 1), p(1, 0, 0), p(0, 0, 0)], n: unit(B, -1), side: 'edge' },
    { pts: [p(0, 1, 0), p(1, 1, 0), p(1, 1, 1), p(0, 1, 1)], n: unit(B, 1), side: 'edge' },
  ].map(f => Object.assign(f, { color, tag, O, A, B, C }));
}

// one frame of the door scene at time t (seconds)
function drawDoor(fx, t) {
  const g = fx.getContext('2d'), W = fx.width, H = fx.height;
  g.imageSmoothingEnabled = false;
  if (!fx._dust) { // specks floating in the void, for depth
    fx._dust = Array.from({ length: 70 }, () => v3((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 5, -3 + Math.random() * 7));
    fx._noise = document.createElement('canvas');
    fx._noise.width = 32; fx._noise.height = 64;
  }
  const open = Math.max(0, Math.min(1, (t - 0.9) / 1.7));
  const swing = (1 - Math.pow(1 - open, 3)) * 1.38; // radians, about 80 degrees
  const dive = Math.pow(Math.max(0, Math.min(1, (t - 2.5) / 2.6)), 2.3);
  const glitch = Math.min(1, open * 0.6 + dive * 0.8);
  // camera: up and to the right, drifting, then flying straight into the doorway
  const cam = v3(1.05 * Math.pow(1 - dive, 2) + 0.05 * Math.sin(t * 0.8), -1.25 * Math.pow(1 - dive, 2), -4.3 + 0.12 * t + 4.35 * dive);
  const f = Math.min(H * 1.2, W * 1.75);
  const dC = 0.4 - cam.z;
  const shake = dive > 0.05 ? (Math.random() - 0.5) * 3 * glitch : 0;
  // perspective, re-centered so the doorway stays in the middle of the screen
  const P = q => {
    const d = q.z - cam.z;
    if (d < 0.03) return null;
    return [W / 2 + ((q.x - cam.x) / d + cam.x / dC) * f + shake, H / 2 + ((q.y - cam.y) / d + cam.y / dC) * f + shake];
  };
  const poly = (pts, fill, stroke) => {
    const s = pts.map(P);
    if (s.some(q => !q)) return false;
    g.beginPath();
    s.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); }
    return true;
  };

  // the void
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  for (const d of fx._dust) {
    const s = P(d);
    if (!s) continue;
    const z = d.z - cam.z;
    g.fillStyle = `rgba(150,160,200,${Math.max(0, Math.min(0.5, 1.4 / z))})`;
    const r = Math.max(1, Math.round(2.2 / z));
    g.fillRect(Math.round(s[0]), Math.round(s[1]), r, r);
  }
  // light leaking out once it opens
  const c0 = P(v3(0, 0, 0.4));
  if (c0 && open > 0) {
    const R = (2.2 * f) / dC;
    const hue = (t * 90) % 360;
    const grad = g.createRadialGradient(c0[0], c0[1], 0, c0[0], c0[1], R);
    grad.addColorStop(0, `hsla(${hue},80%,60%,${0.35 * open})`);
    grad.addColorStop(1, 'hsla(0,0%,0%,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  }
  // behind the door: static, with tearing lines
  const nz = fx._noise, ng = nz.getContext('2d');
  const img = ng.createImageData(nz.width, nz.height), px = new Uint32Array(img.data.buffer);
  for (let y = 0; y < nz.height; y++) {
    const tear = Math.random() < 0.08 * glitch;
    const band = VGA[9 + ((Math.random() * 7) | 0)];
    for (let x = 0; x < nz.width; x++) {
      const r = Math.random();
      px[y * nz.width + x] = tear && (x & 3) < 2 ? band
        : r < 0.2 + glitch * 0.5 ? VGA[1 + ((Math.random() * 15) | 0)] : r < 0.55 ? 0xff1e1414 : 0xff000000;
    }
  }
  ng.putImageData(img, 0, 0);
  const a = P(v3(-0.5, -1, 0.4)), b = P(v3(0.5, 1, 0.4));
  if (a && b) g.drawImage(nz, a[0], a[1], b[0] - a[0], b[1] - a[1]);

  // the frame (stone) and the door (wood), as boxes
  const X = v3(1, 0, 0), Y = v3(0, 1, 0), Z = v3(0, 0, 1);
  const k = (v, n) => v3(v.x * n, v.y * n, v.z * n);
  const faces = [
    ...doorBox(v3(-0.72, -1.22, 0), k(X, 0.22), k(Y, 2.22), k(Z, 0.4), '#7d7890', 'frame'),
    ...doorBox(v3(0.5, -1.22, 0), k(X, 0.22), k(Y, 2.22), k(Z, 0.4), '#7d7890', 'frame'),
    ...doorBox(v3(-0.5, -1.22, 0), k(X, 1), k(Y, 0.22), k(Z, 0.4), '#8a85a0', 'frame'),
    ...doorBox(v3(-0.8, 1, -0.14), k(X, 1.6), k(Y, 0.1), k(Z, 0.58), '#5d596e', 'frame'),
  ];
  // the door turns on its hinge (right edge), toward the camera
  const T = 0.08;
  const dA = v3(-Math.cos(swing), 0, -Math.sin(swing)), dZ = v3(-Math.sin(swing), 0, Math.cos(swing));
  faces.push(...doorBox(vadd(v3(0.5, -1, 0), dZ, -T), dA, k(Y, 2), k(dZ, T), '#8a3f1e', 'door'));

  const visible = faces.filter(fc => {
    const c = fc.pts.reduce((s, q) => vadd(s, q, 0.25), v3(0, 0, 0));
    fc.dist = Math.hypot(c.x - cam.x, c.y - cam.y, c.z - cam.z);
    return vdot(fc.n, v3(cam.x - c.x, cam.y - c.y, cam.z - c.z)) > 0;
  }).sort((p, q) => q.dist - p.dist);

  for (const fc of visible) {
    let s = 0.38 + 0.62 * Math.max(0, vdot(fc.n, DOOR_LIGHT));
    // the static lights up the inside of the frame
    if (fc.tag === 'frame' && fc.n.z === 0 && open > 0) s += 0.25 * open * (0.7 + 0.3 * Math.random());
    if (!poly(fc.pts, shadeHex(fc.color, s), 'rgba(0,0,0,0.55)')) continue;
    if (fc.tag === 'door' && fc.side !== 'edge') doorDetails(fc, s, poly, P, g, f, cam);
  }

  if (t > DOOR_END - 0.6) { // white flash at the end
    g.fillStyle = `rgba(255,255,255,${Math.min(1, (t - (DOOR_END - 0.6)) / 0.5)})`;
    g.fillRect(0, 0, W, H);
  }
}

// panels, grain, hinges and knob, painted on one of the door's two big faces
function doorDetails(fc, s, poly, P, g, f, cam) {
  const back = fc.side === 'back';
  const base = back ? vadd(fc.O, fc.C) : fc.O;
  const nudge = vadd(v3(0, 0, 0), fc.n, 0.004); // a hair off the face, toward the camera
  const at = (u, v) => vadd(vadd(vadd(base, fc.A, u), fc.B, v), nudge);
  const quad = (u0, v0, u1, v1) => [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
  // wood grain
  for (const u of [0.24, 0.5, 0.76]) poly(quad(u - 0.004, 0.02, u + 0.004, 0.98), shadeHex('#5e2a12', s));
  // four panels: a dark groove, a lit bevel, the raised middle
  for (const [u0, v0, u1, v1] of [[0.13, 0.07, 0.46, 0.38], [0.54, 0.07, 0.87, 0.38], [0.13, 0.45, 0.46, 0.93], [0.54, 0.45, 0.87, 0.93]]) {
    poly(quad(u0, v0, u1, v1), shadeHex('#4a1f0c', s));
    poly(quad(u0 + 0.025, v0 + 0.012, u1 - 0.015, v1 - 0.008), shadeHex('#b5653a', s));
    poly(quad(u0 + 0.035, v0 + 0.022, u1 - 0.025, v1 - 0.016), shadeHex('#97502a', s));
  }
  // hinges
  for (const v of [0.12, 0.85]) poly(quad(0, v, 0.05, v + 0.05), shadeHex('#3a3a44', s));
  // keyhole plate and brass knob
  poly(quad(0.84, 0.47, 0.92, 0.6), shadeHex('#b8901c', s * 0.9));
  poly(quad(0.874, 0.545, 0.886, 0.575), '#120800');
  const kp = at(0.88, 0.5), k = P(kp);
  if (k) {
    const r = Math.max(1.5, (0.045 * f) / (kp.z - cam.z));
    g.fillStyle = shadeHex('#d9a826', s);
    g.beginPath();
    g.arc(k[0], k[1], r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,250,200,0.9)';
    const h = Math.max(1, Math.round(r * 0.4));
    g.fillRect(Math.round(k[0] - r * 0.45), Math.round(k[1] - r * 0.5), h, h);
  }
}
const rgba = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r;
const hexpx = h => { const n = parseInt(h.slice(1), 16); return rgba(n >> 16, (n >> 8) & 255, n & 255); };
const VGA = COLORS.map(c => hexpx(c.hex));

function playDoorIntro() {
  const fx = $('doorFx');
  if (!fx || doorRunning || S.os3.unlocked) return;
  doorRunning = true;
  closeAchMenu();
  $('doorAsk').classList.add('hidden');
  Music.hold(true);
  log('the door is open.', 'w');
  fx.classList.remove('hidden');
  fx.width = 260;
  fx.height = Math.max(130, Math.min(560, Math.round(260 * innerHeight / Math.max(1, innerWidth))));
  fx._dust = null;
  if (reduceMotion()) { doorSplash(); return; }
  let t0 = null, sounds = 0;
  const frame = now => {
    if (t0 === null) t0 = now;
    const t = (now - t0) / 1000;
    if (sounds === 0 && t > 0.7) { sounds++; Music.fx('creak'); }
    if (sounds === 1 && t > 2.7) { sounds++; Music.fx('whoosh'); }
    drawDoor(fx, t);
    if (t < DOOR_END) requestAnimationFrame(frame);
    else doorSplash();
  };
  requestAnimationFrame(frame);
}
function doorSplash() {
  $('doorFx').classList.add('hidden');
  const sp = $('splash3');
  sp.classList.remove('hidden');
  Music.chime();
  setTimeout(() => {
    sp.classList.add('hidden');
    S.os3.unlocked = true;
    S.os3.on = true;
    doorRunning = false;
    Music.hold(false);
    document.body.classList.add('os3-opening');
    setTimeout(() => document.body.classList.remove('os3-opening'), 1400);
    checkAch();
    save(true);
  }, 2800);
}
// players who opened the door before this update
// a message box over everything (terminal or desktop), so nobody misses it
function offerDoor() {
  if (doorRunning || S.os3.unlocked) return;
  $('doorAsk').classList.remove('hidden');
  $('doorGo').focus();
}
function answerDoor(go) {
  $('doorAsk').classList.add('hidden');
  if (go) { playDoorIntro(); return; }
  log('the door stays open. step through whenever you want:', 'w');
  out(guiOn() ? 'the "Step through the door" button in the System window, or /enter' : '/enter', 'dim');
}
