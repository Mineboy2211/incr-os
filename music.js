'use strict';
/* INCR.OS soundtrack, synthesized live with the Web Audio API (no audio files).
 *
 * One track per era:
 *   terminal  "Phosphor": slow A-minor synth pads, soft echoing arpeggios, a pulsing bass
 *   win1      "Graphical Environment": a cheerful square-wave tune, PC-speaker style
 *   os3       "Overlapping Windows": slow, a bit uneasy, bells over a D-minor pad
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
  function hiss({ t, dur, gain, type = 'highpass', f = 7000, q = 0.7, dest = bus }) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const flt = ctx.createBiquadFilter();
    flt.type = type; flt.frequency.value = f; flt.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(dest);
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
    os3: {
      bpm: 96,
      chords: [[62, 65, 69], [60, 64, 67], [58, 62, 65], [57, 61, 64]], // Dm C Bb A, 2 bars each
      bells: [0, null, null, 2, null, null, 1, null, 3, null, 2, null, null, 1, null, null],
      play(s, t, sp) {
        const bar = Math.floor(s / 16), pos = s % 16, cycle = Math.floor(bar / 8);
        const chord = this.chords[Math.floor(bar / 2) % 4];
        if (pos === 0 && bar % 2 === 0) {
          for (const m of chord) {
            tone({ type: 'sine', midi: m, t, dur: sp * 32, gain: 0.03, attack: 0.9, release: 1.4 });
            tone({ type: 'triangle', midi: m - 12, t, dur: sp * 32, gain: 0.014, attack: 1.4, release: 1.4, detune: 5 });
          }
        }
        if (pos === 0 || pos === 7 || (pos === 10 && bar % 2)) {
          tone({ type: 'triangle', midi: chord[0] - 24, t, dur: sp * 6, gain: 0.12, release: 0.2 });
        }
        // bell line: sine + a quiet octave, through the echo
        const k = this.bells[(pos + (cycle % 2) * 8) % 16];
        if (k !== null && (cycle > 0 || bar % 8 >= 2)) {
          const m = chord[k % 3] + 12 + (k >= 3 ? 12 : 0);
          tone({ type: 'sine', midi: m, t, dur: sp * 3, gain: 0.05, attack: 0.002, release: 0.25, send: 0.6 });
          tone({ type: 'sine', midi: m + 12, t, dur: sp * 1.5, gain: 0.012, attack: 0.002, release: 0.2 });
        }
        if (cycle >= 1) {
          if (pos === 0 || pos === 9) kick(t, 0.18);
          if (pos === 4 || pos === 12) hiss({ t, dur: 0.06, gain: 0.03, type: 'bandpass', f: 2600, q: 1.2 });
          if (pos % 2 === 1) hiss({ t, dur: 0.02, gain: 0.006 });
        }
      },
    },
  };
  const TITLES = { terminal: 'Phosphor', win1: 'Graphical Environment', os3: 'Overlapping Windows' };

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
    if (!ctx || ctx.state === 'closed') return;
    const target = enabled && !hold ? volume * 0.55 : 0;
    master.gain.setTargetAtTime(target, ctx.currentTime, hold ? 0.12 : 0.4);
  }

  // ---------------------------------------------------------------- stopping for real
  // Phones keep a "closed" game alive in the background (app switch, closing a tab
  // opened from another app...). Whenever the page is hidden, frozen or closing,
  // everything stops: sequencer, volume, audio engine and the media notification.
  let paused = false;
  let onToggle = null; // the game's handler for the phone's media Play/Pause buttons
  const setSession = type => { try { if (navigator.audioSession) navigator.audioSession.type = type; } catch (e) { /* unsupported */ } };
  function mediaState(playing) {
    const ms = navigator.mediaSession;
    if (!ms) return;
    try {
      ms.playbackState = playing ? 'playing' : 'paused';
      if (playing && window.MediaMetadata) {
        ms.metadata = new MediaMetadata({ title: TITLES[Object.keys(TRACKS).find(k => TRACKS[k] === track)] || 'INCR.OS', artist: 'INCR.OS' });
      }
    } catch (e) { /* unsupported */ }
  }
  function pauseAll() {
    paused = true;
    if (timer) { clearInterval(timer); timer = null; }
    if (!ctx || ctx.state === 'closed') return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0, ctx.currentTime);
    ctx.suspend();
    setSession('auto'); // don't keep the phone in "playing music" mode
    mediaState(false);
  }
  function resumeAll() {
    if (!ctx || ctx.state === 'closed' || document.hidden || !enabled) return;
    paused = false;
    setSession('playback');
    ctx.resume().then(() => {
      if (paused || document.hidden) return;
      nextTime = ctx.currentTime + 0.05;
      if (!timer) timer = setInterval(tick, 40);
      applyGain();
      mediaState(true);
    });
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? pauseAll() : resumeAll()));
  document.addEventListener('freeze', pauseAll); // the browser is about to freeze the page
  window.addEventListener('pagehide', e => {
    pauseAll();
    if (!e.persisted && ctx && ctx.state !== 'closed') ctx.close(); // the page is going away for good
  });
  window.addEventListener('pageshow', e => { if (e.persisted) resumeAll(); });
  if (navigator.mediaSession) {
    for (const [action, on] of [['play', true], ['pause', false], ['stop', false]]) {
      try { navigator.mediaSession.setActionHandler(action, () => onToggle && onToggle(on)); } catch (e) { /* unsupported */ }
    }
  }

  return {
    // call from a click / key press: browsers block audio until then
    unlock() {
      if (document.hidden || !enabled) return;
      if (ctx && ctx.state === 'running' && timer) return; // already playing
      if (ctx && ctx.state === 'closed') ctx = null;      // the page came back after closing it
      // iPhone: count as media playback, so the ring/silent switch doesn't mute it (Safari 17+)
      setSession('playback');
      if (!ctx && !build()) return;
      paused = false;
      if (ctx.state !== 'running') {
        ctx.resume();
        // mobile browsers fully unlock audio when a sound starts during the tap itself
        const blip = ctx.createBufferSource();
        blip.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
        blip.connect(ctx.destination);
        blip.start(0);
      }
      if (!timer) timer = setInterval(tick, 40);
      if (wanted) useTrack(wanted);
      applyGain();
      mediaState(true);
    },
    // called every frame with the game's state; only acts on changes
    sync(name, on, vol) {
      wanted = name;
      const key = `${name}|${on}|${vol}`;
      if (key === lastKey) return;
      const wasOn = enabled;
      lastKey = key;
      enabled = !!on;
      volume = Math.max(0, Math.min(100, vol)) / 100;
      if (!ctx || ctx.state === 'closed') return;
      useTrack(name);
      applyGain();
      // music turned off: fade out, then shut the engine down (no silent playback)
      if (wasOn && !enabled) setTimeout(() => { if (!enabled) pauseAll(); }, 700);
      if (!wasOn && enabled) resumeAll();
    },
    // the game decides what the phone's media Play/Pause buttons do
    onMediaButton(fn) { onToggle = fn; },
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
    // sound effects (they play even while the music is held for a transition)
    fx(name) {
      if (!ctx || !enabled || ctx.state !== 'running') return;
      const t = ctx.currentTime + 0.01, g = volume / 0.4;
      if (name === 'creak') { // an old door: a slow, wobbling low saw
        const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), a = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(70, t);
        o.frequency.linearRampToValueAtTime(115, t + 0.6);
        o.frequency.linearRampToValueAtTime(80, t + 1.1);
        o.frequency.linearRampToValueAtTime(130, t + 1.7);
        f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 6;
        a.gain.setValueAtTime(0, t);
        a.gain.linearRampToValueAtTime(0.07 * g, t + 0.15);
        a.gain.linearRampToValueAtTime(0, t + 1.8);
        o.connect(f); f.connect(a); a.connect(out);
        o.start(t); o.stop(t + 1.9);
      } else if (name === 'whoosh') { // flying through: rising noise, with digital chirps
        const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), a = ctx.createGain();
        src.buffer = noise; src.loop = true;
        f.type = 'bandpass'; f.Q.value = 1.4;
        f.frequency.setValueAtTime(250, t);
        f.frequency.exponentialRampToValueAtTime(5000, t + 2.4);
        a.gain.setValueAtTime(0.0001, t);
        a.gain.exponentialRampToValueAtTime(0.16 * g, t + 2.2);
        a.gain.linearRampToValueAtTime(0, t + 2.7);
        src.connect(f); f.connect(a); a.connect(out);
        src.start(t); src.stop(t + 2.8);
        for (let i = 0; i < 14; i++) {
          tone({ type: 'square', midi: 60 + Math.floor(Math.random() * 36), t: t + 0.3 + i * 0.15, dur: 0.04, gain: 0.025 * g, dest: out });
        }
      } else if (name === 'save') {
        [67, 72, 76, 79].forEach((m, i) => tone({ type: 'sine', midi: m + 12, t: t + i * 0.07, dur: 0.35, gain: 0.05 * g, release: 0.25, dest: out }));
      } else if (name === 'voice' || name === 'voice-sys') { // typewriter blips for the dialogue
        const sys = name === 'voice-sys';
        tone({ type: sys ? 'square' : 'triangle', midi: (sys ? 50 : 70) + Math.floor(Math.random() * 4), t, dur: 0.035,
          gain: (sys ? 0.02 : 0.04) * g, cutoff: sys ? 1400 : 0, dest: out });
      }
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
