'use strict';
/* INCR.OS news ticker content. Loaded first, so everything here is plain data;
 * `text` may be a function and `when` a condition, both evaluated when shown.
 *
 * To add a headline: push { cat, text, when? } to NEWS.
 * cat: 'update' | 'joke' | 'fact' | 'tip' | 'news'
 * To ship a version: add an entry at the TOP of UPDATES and bump VERSION.
 */

const VERSION = 'v0.6';

// newest first
const UPDATES = [
  { v: 'v0.6', notes: [
    'music! each era has its own track, synthesized live: "Phosphor" for the terminal, "Graphical Environment" for INCR.OS 2.0.',
    'the note button next to NEWS turns it on or off. /sys volume 0-100 sets how loud.',
    'fix (phones): progress text no longer flickers between lines, and tapped buttons keep their text.',
  ] },
  { v: 'v0.5', notes: [
    'your first REBOOT installs INCR.OS 2.0: a whole graphical environment with windows, menus and buttons.',
    'the terminal lives on as a DOS window. miss the green screen? /sys gui off',
    'already rebooted before this update? the game asks before installing it. said no? /upgrade',
    '/reboot, /format, challenges and /sys reset now ask once: answer /yes or /no within 10s.',
    'events show up as a pop-up with a button on the desktop.',
    'fix: persistent-etc now gives back the autobuyers your last FORMAT wiped, as soon as you flash it.',
  ] },
  { v: 'v0.4', notes: [
    'the door: numbers now go past 1.79e308. reach it to unlock /patches. new goal: 1e1000.',
    'other machines: /ssh and /scp after your first FORMAT.',
    '5 new challenges after FORMAT, including the final one: kernel-panic.',
    'process skins (/skin, /rename), unlocked by achievements.',
    'a tutorial for new players, and a report of what happened while you were away.',
    'tablets: the screen scales in portrait, and touch keys (TAB, UP, DOWN) sit under the prompt.',
    '/ach opens an interactive achievements menu.',
  ] },
  { v: 'v0.3', notes: [
    'news ticker installed. you are reading it.',
    'click the NEWS button for recent headlines, this changelog, and to turn the ticker off.',
  ] },
  { v: 'v0.2', notes: [
    'file system: /ls, /cd, /cat, /run. explore it.',
    'random events, challenges, scripts (bash module), aliases (alias module), /neofetch.',
    'chain commands with ;',
  ] },
  { v: 'v0.1', notes: [
    'INCR.OS boots for the first time. 8 processes, reboot, format.',
  ] },
];

const NEWS = [
  // ---- updates (from the changelog)
  ...UPDATES.slice(0, 2).map(u => ({ cat: 'update', text: `${u.v}: ${u.notes[0]}` })),

  // ---- jokes
  { cat: 'joke', text: 'there are 10 kinds of people: those who understand binary and those who don\'t.' },
  { cat: 'joke', text: 'local DAEMON refuses to stop forking. "it\'s who i am," it says.' },
  { cat: 'joke', text: 'weather: 100% chance of bytes. scattered kernels by evening.' },
  { cat: 'joke', text: 'admin still searching keyboard for the "any" key.' },
  { cat: 'joke', text: 'why do programmers prefer dark mode? because light attracts bugs.' },
  { cat: 'joke', text: 'PIPE union demands fewer redirects and longer buffers.' },
  { cat: 'joke', text: 'KERNEL panics, refuses to elaborate.' },
  { cat: 'joke', text: 'scientists confirm: turning it off and on again still works.' },
  { cat: 'joke', text: 'the two hardest problems in computing: cache invalidation, naming things, and off-by-one errors.' },
  { cat: 'joke', text: 'fork bomb defused by bored intern with a single ctrl+c.' },
  { cat: 'joke', text: 'HYPERVISOR claims it can see everything. nobody can prove it wrong.' },
  { cat: 'joke', text: 'CLUSTER of CLUSTERS declared "too meta" by local critics.' },
  { cat: 'joke', text: 'programmer stuck in shower for 3 days. bottle said: lather, rinse, repeat.' },
  { cat: 'joke', text: 'study finds 9 out of 10 processes prefer having a parent.' },
  { cat: 'joke', text: 'THREAD files complaint: "ever since MAINFRAME showed up, nobody calls."' },
  { cat: 'joke', text: '"it works on my machine," says the machine.' },
  { cat: 'joke', text: 'a SQL query walks into a bar, walks up to two tables and asks: "can i join you?"' },
  { cat: 'joke', text: 'clock speed reaches new record. electricity bill reaches orbit.' },

  // ---- fun facts (real ones)
  { cat: 'fact', text: 'in 1947, engineers found an actual moth stuck in the Harvard Mark II computer and taped it in the logbook as the "first actual case of bug being found".' },
  { cat: 'fact', text: 'the word "daemon" in computing was inspired by Maxwell\'s demon, a thought experiment from physics.' },
  { cat: 'fact', text: 'JavaScript numbers top out at about 1.79e308 (Number.MAX_VALUE). that is exactly why this game ends there.' },
  { cat: 'fact', text: 'Unix time counts seconds since midnight UTC, January 1st 1970.' },
  { cat: 'fact', text: 'on 32-bit systems, Unix time overflows on January 19th 2038. it is called the Year 2038 problem.' },
  { cat: 'fact', text: 'the observable universe has roughly 1e80 atoms. you will produce far more bytes than that.' },
  { cat: 'fact', text: 'the term "bit" (binary digit) was coined by John Tukey and popularized by Claude Shannon in 1948.' },
  { cat: 'fact', text: 'the first .com domain ever registered was symbolics.com, in 1985.' },
  { cat: 'fact', text: 'Pac-Man\'s level 256 is unbeatable: an integer overflow scrambles half the screen.' },
  { cat: 'fact', text: 'the word "robot" comes from Karel Čapek\'s 1920 Czech play R.U.R.' },
  { cat: 'fact', text: 'ctrl+alt+del was created by IBM engineer David Bradley.' },
  { cat: 'fact', text: 'many old green-screen monitors used "P1" phosphor, the glow this game imitates.' },
  { cat: 'fact', text: 'the Apollo Guidance Computer that flew to the Moon had about 4 KB of erasable memory.' },
  { cat: 'fact', text: 'a googol is 1e100. the name was coined by a 9-year-old, Milton Sirotta, in 1920.' },
  { cat: 'fact', text: 'the font used here, VT323, is modeled on the DEC VT320 terminal from 1987.' },

  // ---- tips
  { cat: 'tip', text: 'Tab autocompletes commands, upgrade names and file paths.' },
  { cat: 'tip', text: 'the Up arrow brings back your last commands.' },
  { cat: 'tip', text: 'chain commands with ; e.g. /buy daemon max; clock max' },
  { cat: 'tip', text: 'every 10 copies of a process gives it a multiplier.' },
  { cat: 'tip', text: 'live views freeze once they scroll away. type the command again to wake them up.' },
  { cat: 'tip', text: 'events don\'t wait. when a packet arrives, /accept it fast.' },
  { cat: 'tip', text: '/ls -a shows hidden files. hidden files tend to hide things.', when: () => fsUnlocked() },
  { cat: 'tip', text: 'press Esc to leave the prompt and use hotkeys: M max all, C clock, 1-8 buy tiers.' },

  // ---- reactive headlines (depend on your progress)
  { cat: 'news', when: () => S.stats.reboots > 0,
    text: () => `machine rebooted ${fmt(S.stats.reboots)} time(s). admin "not worried".` },
  { cat: 'news', when: () => S.stats.formats > 0,
    text: () => `disk formatted ${fmt(S.stats.formats)} time(s). data recovery companies weep.` },
  { cat: 'news', when: () => S.bytes >= 100, text: 'bytes on this machine exceed a googol. experts "deeply confused".' },
  { cat: 'news', when: () => !!S.fsRan.vault, text: 'vault breach in /bin. suspect described as "a daemon with ambition".' },
  { cat: 'news', when: () => fsUnlocked() && !S.fsRan.vault, text: 'rumor: the admin never cleared their shell history.' },
  { cat: 'news', when: () => !!S.chal.active, text: () => `contestant attempts the '${S.chal.active}' challenge. bookmakers unsure.` },
  { cat: 'news', when: () => ev && ev.def.id === 'virus', text: 'BREAKING: worm.exe spotted eating bytes. officials urge /scan.' },
  { cat: 'news', when: () => S.stats.highestTier >= 8, text: 'MAINFRAME online. older processes feel "a bit replaced".' },
  { cat: 'news', when: () => S.scripts.length > 0, text: 'scripts now run this machine. admin considers early retirement.' },
  { cat: 'news', when: () => S.stats.overflowed && !S.won, text: 'SYSTEM OVERFLOW confirmed, yet the counter keeps going. physicists "have questions".' },
  { cat: 'news', when: () => S.won, text: 'someone went through the door. they left the light on.' },
  { cat: 'news', when: () => S.machine !== 'incr-7', text: () => `user spotted logged into ${S.machine}. incr-7 "feels a bit lonely".` },
  { cat: 'news', when: () => S.skin !== 'default', text: () => `fashion report: processes now dress as ${S.skin}. critics divided.` },
  { cat: 'news', when: () => !!S.chal.done['kernel-panic'], text: 'local user beats kernel-panic. the machine now calls them ROOT.' },
];
