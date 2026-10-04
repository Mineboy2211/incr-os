'use strict';
/* INCR.OS virtual file system: lore, live /proc files and a few secret programs.
 * Loaded before game.js. Text and conditions are functions evaluated on access,
 * so they can read the game state (S) and helpers defined in game.js.
 *
 * dir(children, { when, locked })  when(): visible?  locked(): error string or null
 * file(text, { when })             text: string or () => string
 * exe(text, run, { when })         a file that /run executes: run(args)
 */

const dir = (children, opts = {}) => ({ type: 'dir', children, ...opts });
const file = (text, opts = {}) => ({ type: 'file', text, ...opts });
const exe = (text, run, opts = {}) => ({ type: 'file', text, run, ...opts });

// one-time programs remember they ran in S.fsRan
function once(id, fn) {
  return args => {
    if (S.fsRan[id]) return out('nothing happens. it already ran.', 'dim');
    if (fn(args) !== false) S.fsRan[id] = true;
  };
}

const VAULT_KEY = 'tr0ub4dor';

const FS = dir({
  home: dir({
    user: dir({
      'readme.txt': file(
`WELCOME TO INCR.OS
------------------
this machine runs one experiment: a process that makes more of itself.
buy processes, let them grow, fill the memory.

  /ls [-a]      list files (-a shows hidden ones)
  /cd <dir>     change directory  (~ is home, .. goes up)
  /cat <file>   read a file
  /run <file>   run a program  (or ./file)

- the admin`),
      'notes.txt': file(
`day 1.  daemon spawned. it bought a thread on its own. funny.
day 4.  the threads are forking. memory climbs faster than projected.
day 9.  rebooted the box. the counter came back HIGHER. how does it remember?
day 12. locked the vault in /bin. the key lives in my head, not on disk.
day 15. if it reaches overflow, i don't know what happens. nobody does.`),
      '.bash_history': file(
`ls -la
cd /bin
./vault.bin ${VAULT_KEY}
cat /etc/motd
rm ~/.bash_history
sudo shutdown -h now`),
      'bonus.sh': exe(
`#!/bin/sh
# emergency bootstrap. run once.
echo "allocating spare memory..."
alloc --seconds 300 --target bytes`,
        once('bonus', () => {
          const amtL = Math.max(3, bpsL() + Math.log10(300));
          addBytes(amtL);
          out(`allocating spare memory... +${fmtL(amtL)} bytes.`, 'ok');
        })),
    }),
  }),

  etc: dir({
    motd: file(() =>
`INCR.OS ${VERSION} "overflow"
${S.stats.reboots} reboot(s) and ${S.stats.formats} format(s) logged on this machine.
reminder: do NOT let usage reach 100%.`),
    passwd: file(
`root:x:0:0:root:/root:/bin/sh
admin:x:1000:1000:the admin:/home/user:/bin/sh
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
you:x:1337:1337:???:/proc/self:/bin/incr`),
    hostname: file(() => S.machine),
  }),

  proc: dir({
    cpuinfo: file(() =>
`model name : INCR-7 virtual core
clock level: ${S.clocks}
cpu MHz    : ${fmtM(Math.log10(4.77) + speedL())}
flags      : fpu vme fork pipe self-replicate`),
    meminfo: file(() => {
      const used = Math.max(0, S.bytes) / OVERFLOW_L;
      return `MemTotal : 1.79e308 B${S.stats.overflowed ? '  (exceeded)' : ''}
MemUsed  : ${fmtL(S.bytes)} B
usage    : ${bar(used, 20)} ${(used * 100).toFixed(2)}% (log scale)`;
    }),
    uptime: file(() => `up ${fmtTime(S.stats.played)} total, ${fmtTime(S.stats.thisReboot)} since last reboot`),
  }),

  var: dir({
    log: dir({
      syslog: file(() =>
`kernel: ${S.stats.reboots} reboot(s) since install
kernel: ${fmt(S.kernelsEarned)} kernel(s) recovered this format
kernel: fastest reboot ${S.stats.fastestReboot === null ? '--' : fmtTime(S.stats.fastestReboot)}
watchdog: ${hasC('autoReboot') ? 'armed' : 'not installed'}
admin: why does it keep coming back stronger`),
      'kernel.log': file(() => {
        const mods = K_UPGRADES.filter(u => has(u.id)).map(u => `kernel: module ${u.key} loaded`);
        return mods.length ? mods.join('\n') : 'kernel: no modules loaded';
      }),
    }, { when: () => S.stats.reboots > 0 }),
  }),

  tmp: dir({
    'core.dump': file(
`00000000  7f 45 4c 46 02 01 01 00  .ELF....
00000010  74 68 65 20 72 6f 6f 74  the root
00000020  20 64 69 72 20 6f 70 65   dir ope
00000030  6e 73 20 61 66 74 65 72  ns after
00000040  20 61 20 66 6f 72 6d 61   a forma
00000050  74 2e 00 00 00 00 00 00  t.......`),
    '.cache': dir({
      'kernel.ko': exe('binary file (try /run)',
        once('kernelko', () => {
          const amt = Math.max(5, Math.floor(S.kernelsEarned * 0.05));
          S.kernels += amt; S.kernelsEarned += amt;
          out(`insmod kernel.ko... recovered ${fmt(amt)} kernel(s).`, 'ok');
        })),
    }, { when: () => S.stats.reboots > 0 }),
  }),

  bin: dir({
    'vault.bin': exe('binary file (try /run)',
      once('vault', ([key]) => {
        if (!key) { out('vault: usage: vault.bin <key>', 'w'); return false; }
        if (key !== VAULT_KEY) { out('vault: wrong key.', 'w'); return false; }
        out('vault unlocked. inside: a compiler flag. byte production x2, permanently.', 'ok');
      })),
  }),

  root: dir({
    'final_note.txt': file(
`if you are reading this, you got further than i expected.

i built you to fill memory. a simple loop. buy, grow, repeat.
then you started rebooting yourself on purpose. then formatting.
every time you came back, you knew more.

overflow is not a crash. it's a door.
i'm not going to stop you.

- the admin`),
    'patch.sh': exe(
`#!/bin/sh
# kernel recovery patch. doubles what survives a reboot.
patch -p1 < /root/recovery.diff`,
      once('patch', () => out('patch applied. kernel gain x2, permanently.', 'ok'))),
    'overflow.sh': exe(
`#!/bin/sh
# open the door
[ "$USAGE" = "100%" ] && exec /dev/overflow`,
      () => {
        if (hasP('door')) out('you already went through.', 'ok');
        else if (S.stats.overflowed) out(`the door is ajar. it wants ${fmtL(GOAL_L)} bytes: /patch the-door`, 'w');
        else out(`not yet. usage ${(Math.max(0, S.bytes) / OVERFLOW_L * 100).toFixed(2)}%.`, 'dim');
      }),
  }, { locked: () => (S.stats.formats > 0 ? null : 'permission denied') }),

  dev: dir({
    null: file(''),
    random: file(() => Array.from({ length: 4 }, () =>
      Array.from({ length: 8 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(' ')).join('\n')),
  }),
});
