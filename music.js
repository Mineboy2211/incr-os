'use strict';
/* INCR.OS soundtrack, synthesized live with the Web Audio API (no audio files).
 *
 * One track per era:
 *   terminal  "Phosphor": slow A-minor synth pads, soft echoing arpeggios, a pulsing bass
 *   win1      "Graphical Environment": a cheerful square-wave tune, PC-speaker style
 *
 * Notes are scheduled a little ahead of time by a small sequencer (16th-note
 * steps). Browsers only allow sound after a click or key press, so nothing is
 * created until Music.unlock() runs from one (the boot screen's "press any key").
 */
const Music = (() => {
  let ctx = null, master = null, bus = null, echo = null, echoDelay = null, out = null, analyser = null, noise = null;
  let timer = null, track = null, step = 0, nextTime = 0;
  let wanted = null, enabled = true, volume = 0.4, hold = false;
  let lastKey = '';

  const freq = m => 440 * Math.pow(2, (m - 69) / 12);

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    out = ctx.createDynamicsCompressor();
    out.threshold.value = -16; out.ratio.value = 4;
    analyser = ctx.createAnalyser();
    out.connect(analyser);
    analyser.connect(ctx.destination);
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(out);
    bus = ctx.createGain();
    bus.connect(master);
    // echo send: delay -> darker feedback loop -> back into the mix
    echo = ctx.createGain();
    echoDelay = ctx.createDelay(1.5);
    const fb = ctx.createGain(), tone = ctx.createBiquadFilter();
    fb.gain.value = 0.38;
    tone.type = 'lowpass'; tone.frequency.value = 2200;
    echo.connect(echoDelay); echoDelay.connect(tone); tone.connect(fb); fb.connect(echoDelay); tone.connect(bus);
    // one second of white noise for drums
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const ch = noise.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    return true;
  }

  // ---------------------------------------------------------------- voices
  function tone({ type, midi, t, dur, gain, attack = 0.005, release = 0.06, cutoff = 0, detune = 0, send = 0, dest = bus }) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq(midi);
    o.detune.value = detune;
    const g = ctx.createGain();
    const holdAt = Math.max(t + attack, t + dur - release);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.setValueAtTime(gain, holdAt);
    g.gain.linearRampToValueAtTime(0, t + dur);
    let node = o;
    if (cutoff) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = cutoff;
      o.connect(f); node = f;
    }
    node.connect(g);
    g.connect(dest);
    if (send) { const s = ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(echo); }
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function hiss({ t, dur, gain, type = 'highpass', f = 7000, q = 0.7 }) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const flt = ctx.createBiquadFilter();
    flt.type = type; flt.frequency.value = f; flt.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }
  function kick(t, gain) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + 0.3);
  }

  // ---------------------------------------------------------------- tracks
  // arpeggio patterns: chord tone index (0-2), +3 = an octave up, null = rest
  const ARPS = [
    [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1, 2, 1],
    [0, null, 2, null, 1, null, 3, null, 0, null, 2, null, 4, null, 3, null],
    [0, 2, 4, 2, 1, 3, 5, 3, 0, 2, 4, 2, 1, 3, 2, 1],
    [3, null, 2, 1, null, 0, 1, null, 3, null, 4, 3, null, 2, 1, null],
  ];
  // melodies for the win1 track: one 8th note per slot, '-' holds, null rests
  const MEL = {
    A: [[76, '-', 79, '-', 84, '-', 83, 81], [79, '-', 76, '-', 72, '-', 74, 76],
        [77, '-', 81, '-', 84, '-', 81, 77], [79, '-', '-', '-', 74, '-', 71, null]],
    B: [[72, 74, 76, '-', 79, '-', 76, null], [81, '-', 79, 76, 72, '-', '-', null],
        [77, 76, 74, '-', 72, '-', 69, null], [71, '-', 74, '-', 79, '-', 77, 74]],
  };
  const MEL_ORDER = ['A', 'A', 'B', 'A'];

  const TRACKS = {
    terminal: {
      bpm: 92,
      chords: [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]], // Am F C G, 2 bars each
      play(s, t, sp) {
        const bar = Math.floor(s / 16), pos = s % 16, cycle = Math.floor(bar / 8);
        const chord = this.chords[Math.floor(bar / 2) % 4];
        if (pos === 0 && bar % 2 === 0) {
          for (const m of chord) {
            tone({ type: 'sawtooth', midi: m, t, dur: sp * 32, gain: 0.022, attack: 1.2, release: 1.6, cutoff: 650, detune: -7 });
            tone({ type: 'triangle', midi: m + 12, t, dur: sp * 32, gain: 0.016, attack: 1.6, release: 1.6, detune: 6 });
          }
        }
        if (pos === 0 || pos === 6 || pos === 10) {
          tone({ type: 'triangle', midi: chord[0] - 24, t, dur: sp * (pos === 0 ? 5 : 3), gain: 0.13, release: 0.12 });
        }
        // the arpeggio rests for half of every 4th cycle, so the loop breathes
        if (cycle % 4 !== 3 || bar % 8 < 4) {
          const k = ARPS[cycle % ARPS.length][pos];
          if (k !== null) {
            tone({ type: 'square', midi: chord[k % 3] + 12 * (1 + Math.floor(k / 3)), t, dur: sp * 0.9, gain: 0.018, cutoff: 1500, send: 0.55 });
          }
        }
        if (cycle >= 1 && pos % 2 === 0) hiss({ t, dur: 0.03, gain: pos % 4 === 2 ? 0.02 : 0.01 });
      },
    },
    win1: {
      bpm: 116,
      chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], // C Am F G, 1 bar each
      play(s, t, sp) {
        const bar = Math.floor(s / 16), pos = s % 16;
        const chord = this.chords[bar % 4];
        if (pos % 2 === 0) {
          tone({ type: 'square', midi: chord[0] - 24 + (pos % 4 === 2 ? 12 : 0), t, dur: sp * 1.6, gain: 0.04, cutoff: 900 });
          // melody: the second time through the whole tune it drops an octave
          const line = MEL[MEL_ORDER[Math.floor(bar / 4) % 4]][bar % 4];
          const j = pos / 2, n = line[j];
          if (typeof n === 'number') {
            let len = 1;
            while (line[j + len] === '-') len++;
            const oct = Math.floor(bar / 16) % 2 ? -12 : 0;
            tone({ type: 'square', midi: n + oct, t, dur: sp * 2 * len * 0.92, gain: 0.032, cutoff: 3200, send: 0.25 });
          }
          hiss({ t, dur: 0.025, gain: 0.012 });
        }
        if (pos === 0 || pos === 8 || pos === 14) kick(t, 0.32);
        if (pos === 4 || pos === 12) hiss({ t, dur: 0.12, gain: 0.07, type: 'bandpass', f: 1800, q: 0.9 });
        // soft chord bed so the tune isn't thin
        if (pos === 0) for (const m of chord) tone({ type: 'triangle', midi: m, t, dur: sp * 15, gain: 0.012, attack: 0.05, release: 0.3 });
      },
    },
  };

  // ---------------------------------------------------------------- sequencer
  function tick() {
    if (!ctx || !track || hold || ctx.state !== 'running') return;
    const sp = 60 / track.bpm / 4;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05; // fell behind (tab was asleep)
    while (nextTime < ctx.currentTime + 0.15) {
      track.play(step, nextTime, sp);
      nextTime += sp;
      step++;
    }
  }
  function useTrack(name) {
    if (!ctx || track === TRACKS[name]) return;
    track = TRACKS[name] || null;
    step = 0;
    nextTime = ctx.currentTime + 0.1;
    if (track) echoDelay.delayTime.setValueAtTime((60 / track.bpm) * 0.75, ctx.currentTime);
  }
  function applyGain() {
    if (!ctx) return;
    const target = enabled && !hold ? volume * 0.55 : 0;
    master.gain.setTargetAtTime(target, ctx.currentTime, hold ? 0.12 : 0.4);
  }

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume().then(() => { nextTime = ctx.currentTime + 0.05; });
  });

  return {
    // call from a click / key press: browsers block audio until then
    unlock() {
      if (!ctx && !build()) return;
      if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
      if (!timer) timer = setInterval(tick, 40);
      if (wanted) useTrack(wanted);
      applyGain();
    },
    // called every frame with the game's state; only acts on changes
    sync(name, on, vol) {
      wanted = name;
      const key = `${name}|${on}|${vol}`;
      if (key === lastKey) return;
      lastKey = key;
      enabled = !!on;
      volume = Math.max(0, Math.min(100, vol)) / 100;
      if (!ctx) return;
      useTrack(name);
      applyGain();
    },
    // silence while the era transition plays, then pick up the new track
    hold(on) {
      hold = !!on;
      if (!on && ctx) { useTrack(wanted); nextTime = ctx.currentTime + 0.1; }
      applyGain();
    },
    // little startup chime for the splash screen
    chime() {
      if (!ctx || !enabled || ctx.state !== 'running') return;
      const t = ctx.currentTime + 0.05, g = 0.06 * volume / 0.4;
      [72, 76, 79, 84].forEach((m, i) => tone({ type: 'square', midi: m, t: t + i * 0.12, dur: 0.3, gain: g, cutoff: 3000, dest: out }));
      [60, 64, 67, 72].forEach(m => tone({ type: 'triangle', midi: m, t: t + 0.5, dur: 1.4, gain: g * 0.8, attack: 0.02, release: 0.9, dest: out }));
    },
    // for debugging: is sound actually coming out?
    level() {
      if (!analyser) return 0;
      const a = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(a);
      return Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length);
    },
    state: () => (ctx ? ctx.state : 'not started'),
  };
})();
