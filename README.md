<p align="center">
  <a href="https://mineboy2211.github.io/incr-os/"><img src="banner.svg" alt="INCR.OS: an incremental game in a terminal" width="900"></a>
</p>

<h3 align="center">
  <a href="https://mineboy2211.github.io/incr-os/">&gt; PLAY IN YOUR BROWSER &lt;</a>
</h3>

<p align="center"><code>no install · no account · saves automatically · PC, tablet &amp; phone</code></p>

---

```console
root@incr-7:~$ cat README.txt
INCR.OS is an incremental game that lives in a 1987-style terminal.
There are no buttons to click: you type commands.

One process makes bytes. Bigger processes make the smaller ones.
Fill the memory. Reboot. Format. Then find out what's past the limit.
```

## `> how to play`

Open the game and type in the prompt. A tutorial guides you through the first steps.

```console
root@incr-7:~$ /help            # list the commands you have right now
root@incr-7:~$ /daemon          # live view of your first process
root@incr-7:~$ /buy daemon max  # buy as many as you can afford
root@incr-7:~$ /max             # buy everything you can afford
```

New commands unlock as you play. `/help` always shows what you have.

| key | what it does |
| --- | --- |
| `Tab` | autocomplete commands, upgrade names and file paths |
| `Up` / `Down` | command history |
| `;` | chain commands: `/buy daemon max; clock max` |
| `Esc` | leave the prompt to use hotkeys (`M` max all, `C` clock, `1`-`8` buy a tier) |

On a tablet or phone, `TAB`, `UP` and `DOWN` keys appear under the prompt.

## `> what's inside`

```text
.-- features ------------------------------------------------ [|]
| 8 processes     each one produces the one below it
| live views      commands that keep updating while on screen
| 2 prestiges     REBOOT for kernels, FORMAT for cores
| file system     /ls /cd /cat /run ... the admin left notes
| random events   packets, turbo, viruses: react fast
| challenges      handicapped runs for permanent rewards
| scripts         automate it all with your own commands
| machines        more than one computer on the network
| achievements    and process skins to unlock with them
| news ticker     updates, jokes and real computer facts
'-- and a few secrets. no spoilers here.
```

## `> saves`

```console
root@incr-7:~$ /sys export      # copy your save as a code
root@incr-7:~$ /sys import ...  # load it on another device
```

The game saves every 10 seconds in your browser, and keeps running while you're
away (up to 12 hours). Each browser has its own save: use export/import to move it.

## `> settings`

```console
root@incr-7:~$ /sys             # phosphor color, scanlines, flicker, notation...
```

Green, amber, cyan or white phosphor. The **NEWS** button (top left) has the changelog.
skins.js       process skins
```

<p align="center"><sub>made with too many bytes · <code>root@incr-7:~$ █</code></sub></p>
