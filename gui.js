'use strict';
/* INCR.OS 2.0, the graphical environment.
 *
 * The game starts in 1987 on a green-phosphor terminal. The first REBOOT
 * "installs" a graphical environment in the spirit of mid-80s desktops: tiled
 * windows with blue title bars, menu bars, rounded push buttons, a gray
 * dithered desktop, and the terminal turned into a DOS window.
 *
 * Buttons call the same game functions the commands use. Values that change
 * every frame are bound with data attributes and refreshed by renderGui():
 *   data-t="key:arg"  text    data-d="key:arg"  disabled    data-w="key:arg"  bar width
 * The System window's structure is rebuilt only when something unlocks, so
 * buttons aren't replaced under the mouse.
 * Loaded before game.js; everything here runs after the game is set up.
 */

let introRunning = false;
let guiTab = 'proc';    // small screens show one window at a time: proc | sys | term
let termUnread = false; // new terminal output while its tab is hidden
let sysSig = '';        // last System window markup
let guiBound = [];      // [element, kind, key, arg]
let fmConfirmUntil = 0; // the Format button asks before wiping
let guiWasOn = null;

const guiOn = () => !!(S.gui && S.gui.on && S.gui.win1) && !os3On() && !os4Live();
const guiNarrow = () => !!(window.matchMedia && matchMedia('(max-width: 999px), (orientation: portrait)').matches);
const pct = f => `${(Math.max(0, Math.min(1, f)) * 100).toFixed(1)}%`;

// ---------------------------------------------------------------- bindings
const BIND_TEXT = {
  pname: i => pname(i),
  pmult: i => `x${fmtM(tierMultL(i))}`,
  pamt: i => fmtL(S.tiers[i].amt),
  pbought: i => `(${S.tiers[i].bought} bought)`,
  prate: i => `+${fmtL(outL(i))} ${i === 0 ? 'bytes' : pname(i - 1)}/s`,
  pnext: i => `${10 - (S.tiers[i].bought % 10)} more for x${perTen().toFixed(1)}`,
  buy1: i => `Buy 1 · ${fmtL(tierCostL(i))}`,
  buyten: i => {
    const n = 10 - (S.tiers[i].bought % 10);
    return `Buy ${n} · ${fmtL(tierCostL(i) + Math.log10(n))}`;
  },
  clk: () => `Level ${S.clocks} · x${clockBase().toFixed(3)} per level · total x${fmtM(speedL())}`,
  clockbtn: () => `Overclock · ${fmtL(clockCostL())}`,
  rbinfo: () => (rebootGain() >= 1
    ? `Next kernel at ${fmtL(nextKernelAtL())} bytes`
    : `${pct(S.bytes / REBOOT_L)} of ${fmtL(REBOOT_L)} bytes`),
  rbbtn: () => (rebootGain() >= 1 ? `Reboot (+${fmt(rebootGain())} kernels)` : 'Reboot'),
  kinfo: () => `${fmt(S.kernels)} kernels · ${fmt(S.kernelsEarned)} earned · production x${fmtM(kernelL())}`,
  auto: k => `${S.auto[k] ? '\u2611' : '\u2610'} Auto ${AUTO_TARGETS[k].label}`,
  cmp: () => `Compress (level ${S.kGainLvl + 1}) · ${fmt(kGainCost())} kernels`,
  fminfo: () => (formatGain() >= 1
    ? `Ready: +${fmt(formatGain())} cores`
    : `${pct(Math.log10(Math.max(1, S.kernelsEarned)) / Math.log10(FORMAT_AT))} of ${fmt(FORMAT_AT)} kernels earned`),
  fmcount: () => `Erase the whole kernel layer? (${Math.max(0, Math.ceil((fmConfirmUntil - Date.now()) / 1000))}s)`,
  cinfo: () => `${fmt(S.cores)} cores · production x${fmtM(coreL())} · kernel gain x${fmtD(Math.sqrt(1 + S.coresEarned))}`,
  pinfo: () => `Soft cap past 1.79e308/s: ^${softcapExp().toFixed(2)}`,
};
const BIND_DIS = {
  buy1: i => !tierUnlocked(i) || S.bytes < tierCostL(i),
  buyten: i => !tierUnlocked(i) || S.bytes < tierCostL(i) + Math.log10(10 - (S.tiers[i].bought % 10)),
  clock: () => !clockUnlocked() || S.bytes < clockCostL(),
  reboot: () => rebootGain() < 1,
  mod: id => S.kernels < K_BY_ID[id].cost,
  cmp: () => S.kernels < kGainCost(),
  format: () => formatGain() < 1,
  fw: id => S.cores < C_BY_ID[id].cost,
  patch: id => S.bytes < P_BY_ID[id].costL,
};
// progress bars, 0..1
const BIND_W = {
  pset: i => (S.tiers[i].bought % 10) / 10,
  rb: () => (rebootGain() >= 1 ? 1 : S.bytes / REBOOT_L),
  fm: () => Math.log10(Math.max(1, S.kernelsEarned)) / Math.log10(FORMAT_AT),
};

function bindAll() {
  guiBound = [];
  for (const el of document.querySelectorAll('#gui [data-t], #gui [data-d], #gui [data-w]')) {
    for (const kind of ['t', 'd', 'w']) {
      const v = el.dataset[kind];
      if (v) { const [k, a] = v.split(':'); guiBound.push([el, kind, k, a]); }
    }
  }
}
const argOf = a => (a !== undefined && /^\d+$/.test(a) ? +a : a);
function refreshBound() {
  for (const [el, kind, k, a] of guiBound) {
    const x = argOf(a);
    if (kind === 't') setText(el, BIND_TEXT[k](x));
    else if (kind === 'd') { const dis = !!BIND_DIS[k](x); if (el.disabled !== dis) el.disabled = dis; }
    else {
      const w = pct(BIND_W[k](x));
      if (el.style.width !== w) el.style.width = w;
    }
  }
}
const meter = key => `<span class="meter"><i data-w="${key}"></i></span>`;

// ---------------------------------------------------------------- windows
function buildProcRows() {
  $('procRows').innerHTML = NAMES.map((_, i) => `
    <div class="prow" id="prow${i}">
      <div class="p-name"><span class="dim">${i + 1}.</span> <b data-t="pname:${i}"></b></div>
      <div class="p-mult" data-t="pmult:${i}"></div>
      <div class="p-amt"><span data-t="pamt:${i}"></span> <span class="dim" data-t="pbought:${i}"></span></div>
      <div class="p-rate dim" data-t="prate:${i}"></div>
      <div class="p-bar">${meter(`pset:${i}`)} <span class="dim" data-t="pnext:${i}"></span></div>
      <div class="p-btns">
        <button type="button" class="gbtn" data-act="buy1:${i}" data-d="buy1:${i}" data-t="buy1:${i}"></button>
        <button type="button" class="gbtn" data-act="buyten:${i}" data-d="buyten:${i}" data-t="buyten:${i}"></button>
        <button type="button" class="gbtn" data-act="buymax:${i}" data-d="buy1:${i}">Max</button>
      </div>
    </div>`).join('');
}

const sec = (title, body) => `<fieldset class="sec"><legend>${title}</legend>${body}</fieldset>`;
const upgBtn = (kind, u, owned, cost) =>
  `<button type="button" class="ubtn${owned ? ' owned' : ''}" data-act="${kind}:${u.id}"${owned ? ' disabled' : ` data-d="${kind}:${u.id}"`}>` +
  `<span class="u-name">${esc(u.key)}</span><span class="u-desc">${esc(u.desc)}</span>` +
  `<span class="u-cost">${owned ? '\u2713 Installed' : esc(cost)}</span></button>`;

// markup of the System window; only depends on what is unlocked or owned
function sysHTML() {
  const parts = [];
  // opened the door but never went through (before v0.7, or said "not now")
  if (S.won && !S.os3.unlocked) {
    parts.push(sec('The Door', `<p>It's open. Something is waiting on the other side.</p>
      <button type="button" class="gbtn big rbbtn" data-act="enter">Step through the door...</button>`));
  }
  parts.push(sec('Reboot', `<p class="row">${meter('rb')} <span class="dim" data-t="rbinfo"></span></p>
    <button type="button" class="gbtn big rbbtn" data-act="reboot" data-d="reboot" data-t="rbbtn"></button>`));
  if (S.stats.highestTier >= 2 || S.clocks > 0) {
    parts.push(sec('Clock Speed', `<p class="dim" data-t="clk"></p>
      <div class="btnrow"><button type="button" class="gbtn" data-act="clock1" data-d="clock" data-t="clockbtn"></button>
      <button type="button" class="gbtn" data-act="clockmax" data-d="clock">Max</button></div>`));
  }
  const autos = Object.keys(AUTO_TARGETS).filter(k => AUTO_TARGETS[k].owned());
  parts.push(sec('Kernel', `<p data-t="kinfo"></p>` +
    (autos.length ? `<div class="btnrow">${autos.map(k => `<button type="button" class="gbtn" data-act="auto:${k}" data-t="auto:${k}"></button>`).join('')}</div>` : '') +
    (has('zlib') ? `<div class="btnrow"><button type="button" class="gbtn" data-act="cmp" data-d="cmp" data-t="cmp"></button></div>` : '') +
    `<div class="ugrid">${K_UPGRADES.map(u => upgBtn('mod', u, !!S.kUpg[u.id], `${fmt(u.cost)} kernels`)).join('')}</div>`));

  if (CMD_BY_NAME.format.when()) {
    const asking = fmConfirmUntil > Date.now();
    parts.push(sec('Format', `<p class="row">${meter('fm')} <span class="dim" data-t="fminfo"></span></p>` + (asking
      ? `<p class="warnbox" data-t="fmcount"></p><div class="btnrow">
           <button type="button" class="gbtn big" data-act="format-yes">Yes, format</button>
           <button type="button" class="gbtn big" data-act="format-no">No</button></div>`
      : `<button type="button" class="gbtn big" data-act="format" data-d="format">Format...</button>`)));
  }
  if (S.stats.formats > 0) {
    parts.push(sec('Core Firmware', `<p class="dim" data-t="cinfo"></p>
      <div class="ugrid">${C_UPGRADES.map(u => upgBtn('fw', u, hasC(u.id), `${fmt(u.cost)} cores`)).join('')}</div>`));
  }
  if (S.stats.overflowed) {
    parts.push(sec('Patches', `<p class="dim" data-t="pinfo"></p>
      <div class="ugrid">${PATCHES.map(u => upgBtn('patch', u, hasP(u.id), `${fmtL(u.costL)} bytes`)).join('')}</div>`));
  }
  return parts.join('');
}

// ---------------------------------------------------------------- render
function renderGui(force) {
  // the first reboot installs the graphical environment
  // (older saves are asked first, see offerUpgrade; players who said no keep the terminal)
  if (!S.gui.win1 && !S.gui.declined && !upgradeOffer && S.stats.reboots > 0 && !introRunning && !$('app').classList.contains('hidden')) playGuiIntro();
  const on = guiOn() && !introRunning;
  const body = document.body;
  if (on !== guiWasOn) { guiWasOn = on; setPrompt(); force = true; }
  body.classList.toggle('gui-mode', on);
  $('gui').classList.toggle('hidden', !on);
  $('taskbar').classList.toggle('hidden', !on || !guiNarrow());
  if (!on) { $('toast').classList.add('hidden'); return; }

  const narrow = guiNarrow();
  body.classList.toggle('narrow', narrow);
  body.dataset.tab = narrow ? guiTab : '';

  if (!$('procRows').firstElementChild) { buildProcRows(); force = true; }
  if (fmConfirmUntil && Date.now() > fmConfirmUntil) fmConfirmUntil = 0;
  const html = sysHTML();
  if (force || html !== sysSig) {
    sysSig = html;
    $('sysBody').innerHTML = html;
    bindAll();
  }
  for (let i = 0; i < TIERS; i++) $(`prow${i}`).classList.toggle('hidden', !tierUnlocked(i));
  setText($('achMenuItem'), `Achievements (${achCount()}/${ACH.length})!`);
  $('os3Back').classList.toggle('hidden', !S.os3.unlocked);
  $('os4Back').classList.toggle('hidden', !S.os4.unlocked);
  setText($('termTitle'), `Terminal - ${S.machine.toUpperCase()}`);
  refreshBound();

  // events become a message box with a button
  const toast = $('toast');
  toast.classList.toggle('hidden', !ev);
  if (ev) {
    const secs = Math.max(0, Math.ceil((ev.until - Date.now()) / 1000));
    setText($('toastText'), `${ev.def.short || ev.text.replace(/type \/\w+ (within \d+s ?)?/, '').trim()} (${secs}s)`);
    const label = ev.def.cmd;
    setText($('toastBtn'), label[0].toUpperCase() + label.slice(1));
  }
  $('tabTerm').classList.toggle('new', termUnread);
  for (const b of document.querySelectorAll('[data-tab-btn]')) b.classList.toggle('on', b.dataset.tabBtn === guiTab);
}

function setGuiTab(tab) {
  guiTab = tab;
  if (tab === 'term') { termUnread = false; stickBottom($('log')); $('cmd').focus(); }
  renderGui(true);
}
function noteTermOutput() {
  if (guiOn() && guiNarrow() && guiTab !== 'term') termUnread = true;
}

// a quick flash so a reboot feels like something happened
function guiFlash() {
  const crt = $('crt');
  crt.classList.remove('flash');
  void crt.offsetWidth; // restart the animation
  crt.classList.add('flash');
}

function guiAct(act) {
  const [k, a] = act.split(':');
  const i = +a;
  switch (k) {
    case 'buy1': buyOne(i); break;
    case 'buyten': buyTen(i); break;
    case 'buymax': buyMax(i); break;
    case 'maxall': maxAll(); break;
    case 'clock1': buyClock(); break;
    case 'clockmax': buyClockMax(); break;
    case 'reboot': if (doReboot(false)) guiFlash(); break;
    case 'mod': buyK(a); break;
    case 'cmp': buyKGain(); break;
    case 'auto': S.auto[a] = !S.auto[a]; break;
    case 'format': fmConfirmUntil = Date.now() + CONFIRM_SECS * 1000; break;
    case 'format-yes': fmConfirmUntil = 0; if (doFormat()) guiFlash(); break;
    case 'format-no': fmConfirmUntil = 0; break;
    case 'fw': buyC(a); break;
    case 'patch': buyP(a); break;
    case 'ach': openAchMenu(); break;
    case 'news': openNews('recent'); break;
    case 'os3back': os3Return(); break;
    case 'os4back': if (has4()) os4Return(); break;
    case 'enter': playDoorIntro(); break;
    case 'help': setGuiTab('term'); runCommand('/help'); break;
    case 'tab': setGuiTab(a); break;
    case 'event': if (ev) resolveEvent(); break;
    case 'yes': answer(true); break;
    case 'no': answer(false); break;
  }
  checkCommands(false);
  renderGui(true);
}

function wireGui() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled || !el.closest('#gui, #taskbar, #toast, #confirmBar')) return;
    e.stopPropagation();
    guiAct(el.dataset.act);
  });
  window.addEventListener('resize', () => renderGui(true));
}

// ---------------------------------------------------------------- the transition
const DOS_BOOT = [
  'INCR-DOS Version 3.30',
  '(C)Copyright Incremental Systems Corp 1987',
  '',
  'C:\\INCR>dir /w',
  ' Volume in drive C is INCR-7',
  ' KERNEL  SYS   COMMAND COM   WIN     COM   INCR    EXE',
  '',
  'C:\\INCR>win',
];

// glitch -> the CRT switches off -> DOS -> splash screen -> windows open
function playGuiIntro() {
  if (introRunning) return;
  introRunning = true;
  const crt = $('crt'), app = $('app'), box = $('boot'), splash = $('splash');
  log('kernel: graphics adapter detected. installing graphical environment...', 'w');
  Music.hold(true); // the music cuts out with the old screen
  crt.classList.add('glitch');
  setTimeout(() => {
    crt.classList.remove('glitch');
    crt.classList.add('crt-off');
    setTimeout(() => {
      app.classList.add('hidden');
      crt.classList.remove('crt-off');
      crt.classList.add('dos'); // the green phosphor is gone from here on
      box.textContent = '';
      box.classList.remove('hidden');
      let i = 0;
      const next = () => {
        if (i < DOS_BOOT.length) {
          box.textContent += DOS_BOOT[i++] + '\n';
          setTimeout(next, i === DOS_BOOT.length ? 700 : 140 + Math.random() * 80);
          return;
        }
        box.classList.add('hidden');
        splash.classList.remove('hidden');
        Music.chime();
        setTimeout(() => {
          splash.classList.add('hidden');
          crt.classList.remove('dos');
          S.gui.win1 = true;
          S.gui.on = true;
          introRunning = false;
          app.classList.remove('hidden');
          Music.hold(false); // and the new era's track starts
          document.body.classList.add('gui-opening');
          renderGui(true);
          setTimeout(() => document.body.classList.remove('gui-opening'), 1600);
          log('INCR.OS 2.0 graphical environment loaded. this terminal still works.', 'ok');
          out('miss the green screen? /sys gui off', 'dim');
        }, 2400);
      };
      setTimeout(next, 500);
    }, 900);
  }, 800);
}
