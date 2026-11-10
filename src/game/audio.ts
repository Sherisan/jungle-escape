/* Synthesised sound and music: no audio files, everything is generated with Web Audio.

   Routing:  voices -> bus (sfx | music | ambience) -> limiter -> speakers
             sfx and music also feed a stone-hall reverb.

   Music is an original piece written here as data: a calm marimba-and-flute loop while bets are open,
   then a tribal run layer whose tempo, density and key climb with the multiplier. After the split the
   harmony changes with the route: darker for the Serpent Hall, brighter for the Sun Gate. */

export interface SoundProfile { wave: OscillatorType; base: number; color: number; }
type Route = 'L' | 'R';

const MASTER = 0.8, MUSIC = 0.62, AMBIENCE = 0.9;
const note = (semi: number) => 220 * Math.pow(2, semi / 12); // semitones from A3

/* Chords as semitone offsets from A3. */
const CH: Record<string, number[]> = {
  Am: [0, 3, 7], F: [-4, 0, 3], C: [3, 7, 10], G: [-2, 2, 5], Dm: [-7, -4, 0], E: [-5, -1, 2], Em: [-5, -2, 2], Bb: [-11, -7, -4], D: [-7, -3, 0], A: [0, 4, 7],
};
const CALM = ['Am', 'F', 'Am', 'G', 'Dm', 'Am', 'E', 'E'];
const RUN = ['Am', 'Am', 'F', 'G'];
const RUN_L = ['Am', 'Bb', 'Am', 'E'];   // serpent: flat second, sinister
const RUN_R = ['C', 'G', 'F', 'G'];      // sun: relative major, heroic

/* Flute phrases: [step of a 2-bar phrase in 16ths, semitones from A3, length in steps]. */
const PHRASES: Array<Array<[number, number, number]>> = [
  [[0, 12, 4], [4, 15, 2], [6, 12, 2], [8, 10, 6], [16, 7, 4], [20, 10, 2], [22, 7, 2], [24, 3, 8]],
  [[0, 7, 3], [3, 10, 3], [6, 12, 2], [8, 15, 8], [18, 12, 2], [20, 10, 4], [24, 12, 8]],
  [[2, 15, 2], [4, 12, 2], [6, 10, 2], [8, 7, 4], [12, 10, 4], [16, 12, 2], [18, 10, 2], [20, 7, 2], [22, 3, 2], [24, 0, 8]],
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  private amb: GainNode | null = null;
  private verb: GainNode | null = null;
  private white: AudioBuffer | null = null;
  private brown: AudioBuffer | null = null;
  private listeners = new Set<() => void>();
  muted: boolean;
  musicOff: boolean;

  /* music state */
  private timer = 0;
  private running = false;       // run layer on?
  private k = 0;                 // ln(multiplier)
  private curRoute: Route | null = null;
  private next = 0;
  private step = 0;
  private bar = 0;
  private restUntil = 0;         // silence after a crash
  private rumble: { src: AudioBufferSourceNode; osc: OscillatorNode; f: BiquadFilterNode; g: GainNode; base: number } | null = null;
  private birdAt = 0;
  private crackleAt = 0;

  constructor() {
    let m = false, o = false;
    try { m = localStorage.getItem('cg.muted') === '1'; o = localStorage.getItem('cg.music') === '0'; } catch { /* ignore */ }
    this.muted = m; this.musicOff = o;
    if (typeof window !== 'undefined') {
      // browsers only allow audio after a tap or key press: start on the first one, anywhere on the page
      const first = () => this.unlock();
      window.addEventListener('pointerdown', first, { once: true });
      window.addEventListener('keydown', first, { once: true });
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) void this.ctx.suspend(); else void this.ctx.resume();
      });
    }
  }
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getSnapshot = () => this.muted;
  getMusicOff = () => this.musicOff;

  /** Must be called from a user gesture before anything is audible. */
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.build();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch { /* audio unavailable */ }
  }
  setMuted(m: boolean) {
    this.muted = m;
    try { localStorage.setItem('cg.muted', m ? '1' : '0'); } catch { /* ignore */ }
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : MASTER, this.ctx.currentTime, 0.05);
    this.listeners.forEach((l) => l());
  }
  setMusicOff(o: boolean) {
    this.musicOff = o;
    try { localStorage.setItem('cg.music', o ? '0' : '1'); } catch { /* ignore */ }
    if (this.music && this.ctx) this.music.gain.setTargetAtTime(o ? 0 : MUSIC, this.ctx.currentTime, 0.08);
    this.listeners.forEach((l) => l());
  }

  /* ---------- graph ---------- */
  private build() {
    const c = this.ctx!;
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -9; limiter.knee.value = 8; limiter.ratio.value = 14; limiter.attack.value = 0.003; limiter.release.value = 0.18;
    limiter.connect(c.destination);
    const bus = (v: number, to: AudioNode) => { const g = c.createGain(); g.gain.value = v; g.connect(to); return g; };
    this.master = bus(this.muted ? 0 : MASTER, limiter);
    this.sfx = bus(1, this.master);
    this.music = bus(this.musicOff ? 0 : MUSIC, this.master);
    this.amb = bus(AMBIENCE, this.master);

    // stone hall: decaying filtered noise as the impulse
    const rate = c.sampleRate, len = Math.floor(rate * 2.6), imp = c.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = imp.getChannelData(ch); let lp = 0;
      for (let i = 0; i < len; i++) { const t = i / len; lp += (Math.random() * 2 - 1 - lp) * (0.55 - t * 0.45); d[i] = lp * Math.pow(1 - t, 2.6) * (i < rate * 0.012 ? 0 : 1); }
    }
    const conv = c.createConvolver(); conv.buffer = imp;
    this.verb = bus(1, conv); conv.connect(bus(0.9, this.master));
    this.sfx.connect(bus(0.2, this.verb));
    this.music.connect(bus(0.3, this.verb));

    const w = c.createBuffer(1, rate * 2, rate), wd = w.getChannelData(0);
    for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
    this.white = w;
    const b = c.createBuffer(1, rate * 4, rate), bd = b.getChannelData(0); let last = 0;
    for (let i = 0; i < bd.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = last * 3.5; }
    this.brown = b;

    this.startAmbience();
    this.next = c.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }
  private ready() { return this.ctx && this.sfx && this.ctx.state === 'running' ? this.ctx : null; }
  private pan(v: number, to: AudioNode): AudioNode {
    const c = this.ctx!;
    if (!c.createStereoPanner) return to;
    const p = c.createStereoPanner(); p.pan.value = v; p.connect(to); return p;
  }

  /* ---------- building blocks ---------- */
  private osc(type: OscillatorType, f0: number, t: number, dur: number, vol: number, to: AudioNode, f1?: number, attack = 0.006) {
    const c = this.ctx!, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(to); o.start(t); o.stop(t + dur + 0.02);
  }
  private burst(buf: AudioBuffer, t: number, dur: number, vol: number, type: BiquadFilterType, f0: number, f1: number, to: AudioNode, q = 0.8, attack = 0.002) {
    const c = this.ctx!, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; s.loop = true; f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(to);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.02);
  }
  /** Struck metal: inharmonic partials, used for coins and gongs. */
  private metal(f: number, t: number, dur: number, vol: number, to: AudioNode) {
    [[1, 1], [2.76, 0.55], [5.4, 0.3], [8.93, 0.14]].forEach(([r, a]) => this.osc('sine', f * r, t, dur / (0.6 + r * 0.25), vol * a, to, undefined, 0.002));
  }

  /* ---------- instruments ---------- */
  private marimba(f: number, t: number, v: number, p = 0) {
    const out = this.pan(p, this.music!);
    this.osc('sine', f, t, 0.5, v, out, undefined, 0.003);
    this.osc('sine', f * 4, t, 0.09, v * 0.45, out, undefined, 0.002);
    this.osc('triangle', f * 2, t, 0.18, v * 0.2, out, undefined, 0.002);
  }
  private flute(f: number, t: number, dur: number, v: number) {
    const c = this.ctx!, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(), end = t + dur;
    const out = this.pan(0.2, this.music!);
    o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = f; o2.frequency.value = f * 2;
    lfo.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.009, t + dur * 0.5);
    lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.07); g.gain.setValueAtTime(v, Math.max(t + 0.07, end - 0.14)); g.gain.linearRampToValueAtTime(0.0001, end);
    const g2 = c.createGain(); g2.gain.value = 0.12;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(out);
    this.burst(this.white!, t, Math.min(dur, 0.22), v * 0.35, 'bandpass', f * 3, f * 2, out, 2.4, 0.02);
    [o, o2, lfo].forEach((n) => { n.start(t); n.stop(end + 0.03); });
  }
  private pad(chord: number[], t: number, dur: number, v: number, cutoff: number) {
    const c = this.ctx!, f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.Q.value = 0.7; f.frequency.setValueAtTime(cutoff * 0.7, t); f.frequency.linearRampToValueAtTime(cutoff, t + dur * 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + dur * 0.28); g.gain.setValueAtTime(v, t + dur * 0.72); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.2);
    f.connect(g); g.connect(this.music!);
    chord.forEach((s, i) => [-6, 6].forEach((det) => {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = note(s - 12 * (i === 0 ? 1 : 0)) ; o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + dur + 0.25);
    }));
  }
  private bass(f: number, t: number, dur: number, v: number) {
    this.osc('sine', f, t, dur, v, this.music!, undefined, 0.008);
    this.osc('triangle', f * 2, t, dur * 0.45, v * 0.3, this.music!, undefined, 0.006);
  }
  private tom(f: number, t: number, dur: number, v: number, p = 0) { this.osc('sine', f * 2.3, t, dur, v, this.pan(p, this.music!), f, 0.004); }
  private djembe(t: number, v: number, p = 0) {
    const out = this.pan(p, this.music!);
    this.burst(this.white!, t, 0.06, v, 'bandpass', 1900, 900, out, 1.4);
    this.osc('triangle', 330, t, 0.1, v * 0.7, out, 170, 0.003);
  }
  private shaker(t: number, v: number) { this.burst(this.white!, t, 0.055, v, 'highpass', 6200, 5200, this.music!, 0.7, 0.008); }
  private stab(chord: number[], t: number, v: number) {
    const c = this.ctx!, f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.Q.value = 2; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.3);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    f.connect(g); g.connect(this.music!);
    chord.forEach((s) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = note(s - 12); o.connect(f); o.start(t); o.stop(t + 0.36); });
  }

  /* ---------- the score ---------- */
  private schedule() {
    const c = this.ready(); if (!c) return;
    this.ambientEvents(c.currentTime);
    if (this.next < c.currentTime - 0.08) this.next = c.currentTime + 0.03; // resumed after a stall: don't burst
    while (this.next < c.currentTime + 0.16) {
      const k = this.k, bpm = this.running ? Math.min(176, 106 + k * 34) : 84, sixteenth = 60 / bpm / 4;
      if (this.next >= this.restUntil) { if (this.running) this.playRun(this.next, k, sixteenth); else this.playCalm(this.next, sixteenth); }
      this.next += sixteenth; this.step++;
      if (this.step % 16 === 0) this.bar++;
    }
  }
  private playCalm(t: number, sx: number) {
    const s = this.step % 16, name = CALM[this.bar % CALM.length], ch = CH[name];
    if (s === 0) { this.pad(ch, t, sx * 16, 0.028, 620); this.bass(note(ch[0] - 24), t, sx * 8, 0.16); this.tom(55, t, 0.4, 0.07); }
    if (s === 10) this.bass(note(ch[0] - 24), t, sx * 5, 0.1);
    // gentle marimba figure: up the chord, then back down, a slightly different shape each bar
    const fig: Array<[number, number]> = this.bar % 2 ? [[0, 0], [3, 1], [6, 2], [8, 3], [11, 2], [14, 1]] : [[0, 2], [4, 1], [6, 0], [8, 3], [12, 2]];
    for (const [st, deg] of fig) if (st === s) this.marimba(note(ch[deg % 3] + (deg === 3 ? 12 : 0)), t + Math.random() * 0.006, 0.075, deg % 2 ? -0.3 : 0.3);
    if (s % 4 === 2) this.shaker(t, 0.012);
    // a flute phrase over bars 3-4 and 7-8 of the loop
    const b = this.bar % 8;
    if (b === 2 || b === 6) {
      const ph = PHRASES[Math.floor(this.bar / 4) % PHRASES.length], pos = ((b === 2 || b === 6) ? 0 : 16) + s;
      for (const [st, semi, len] of ph) if (st === pos) this.flute(note(semi), t, sx * len * 1.02, 0.055);
    } else if (b === 3 || b === 7) {
      const ph = PHRASES[Math.floor((this.bar - 1) / 4) % PHRASES.length], pos = 16 + s;
      for (const [st, semi, len] of ph) if (st === pos) this.flute(note(semi), t, sx * len * 1.02, 0.055);
    }
  }
  private playRun(t: number, k: number, sx: number) {
    const s = this.step % 16, bar = this.bar;
    const prog = this.curRoute === 'L' ? RUN_L : this.curRoute === 'R' ? RUN_R : RUN;
    const lift = k > 2.3 ? 4 : k > 1.4 ? 2 : 0;   // the key climbs at 4x and 10x
    const ch = CH[prog[bar % prog.length]].map((x) => x + lift);
    const root = note(ch[0] - 24), f = Math.min(1, k / 2.4);
    // drums: the tribal pulse, busier with height
    if (s === 0 || s === 8) this.tom(56, t, 0.34, 0.3);
    if (s === 6 || s === 12) this.tom(50, t, 0.24, 0.17);
    if (s === 4 || s === 12) this.djembe(t, 0.1, -0.2);
    if (s === 10 || (k > 0.5 && s === 14)) this.tom(84, t, 0.16, 0.12, 0.3);
    if (s % 2 === 1) this.shaker(t, 0.022 + f * 0.03);
    if (k > 0.9 && s % 4 === 3) this.djembe(t, 0.075, 0.25);
    if (bar % 4 === 3 && s >= 12) this.tom(120 - (s - 12) * 16, t, 0.12, 0.17, (s - 13.5) * 0.3); // fill into the next phrase
    // bass ostinato
    if (s % 2 === 0) this.bass(s % 8 === 6 ? root * 1.5 : s % 8 === 4 ? root * 2 : root, t, sx * 1.8, 0.17);
    // marimba runs join after the first seconds
    if (k > 0.14) {
      const pat = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 2, 3, 2, 1];
      if (k > 0.45 || s % 2 === 0) this.marimba(note(ch[pat[s] % 3] + (pat[s] === 3 ? 12 : 0) + 12), t, 0.055 + f * 0.025, s % 2 ? 0.35 : -0.35);
    }
    if (s === 0) this.pad(ch, t, sx * 16, 0.02 + f * 0.024, 700 + f * 1500);
    if (k > 0.4 && (s === 0 || (k > 1 && s === 10))) this.stab(ch, t, 0.045 + f * 0.05);
  }

  /* ---------- jungle ambience ---------- */
  private startAmbience() {
    const c = this.ctx!;
    const layer = (buf: AudioBuffer, type: BiquadFilterType, freq: number, q: number, v: number, rate: number, depth: number) => {
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      s.buffer = buf; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = v;
      lfo.frequency.value = rate; lg.gain.value = v * depth; lfo.connect(lg); lg.connect(g.gain);
      s.connect(f); f.connect(g); g.connect(this.amb!); s.start(); lfo.start();
    };
    layer(this.white!, 'bandpass', 6300, 4, 0.013, 14.5, 0.8);   // crickets
    layer(this.white!, 'bandpass', 4300, 6, 0.009, 9.2, 0.9);    // second insect chorus
    layer(this.brown!, 'lowpass', 620, 0.5, 0.075, 0.09, 0.45);  // wind and a far-off waterfall
    this.birdAt = c.currentTime + 1.2;
    this.crackleAt = c.currentTime + 0.4;
  }
  private ambientEvents(now: number) {
    if (now >= this.birdAt) {
      this.birdAt = now + (this.running ? 5 : 2) + Math.random() * 5;
      const out = this.pan(Math.random() * 1.6 - 0.8, this.verb!), dry = this.amb!, base = 1900 + Math.random() * 1800, n = 2 + Math.floor(Math.random() * 5), gap = 0.07 + Math.random() * 0.1;
      for (let i = 0; i < n; i++) {
        const t = now + i * gap, up = Math.random() < 0.5;
        this.osc('sine', base * (up ? 1 : 1.35), t, gap * 0.8, 0.018, out, base * (up ? 1.4 : 0.95), 0.008);
        this.osc('sine', base * (up ? 1 : 1.35), t, gap * 0.8, 0.012, dry, base * (up ? 1.4 : 0.95), 0.008);
      }
    }
    if (now >= this.crackleAt) { // torches
      this.crackleAt = now + 0.05 + Math.random() * 0.42;
      this.burst(this.white!, now, 0.012 + Math.random() * 0.02, 0.02 + Math.random() * 0.03, 'highpass', 2600, 1800, this.amb!);
    }
  }

  /* ---------- sound effects ---------- */
  tick(last: boolean) {
    const c = this.ready(); if (!c) return;
    const t = c.currentTime, f = last ? 1250 : 880; // temple block
    this.osc('triangle', f, t, 0.07, 0.13, this.sfx!, f * 0.8, 0.002);
    this.burst(this.white!, t, 0.02, 0.05, 'bandpass', f * 2, f * 1.5, this.sfx!, 2);
    if (last) this.metal(330, t + 0.02, 0.9, 0.05, this.sfx!);
  }
  bet() {
    const c = this.ready(); if (!c) return;
    const t = c.currentTime; // wooden knock and two coins landing
    this.osc('triangle', 240, t, 0.07, 0.17, this.sfx!, 150, 0.002);
    this.metal(2350, t + 0.03, 0.22, 0.05, this.sfx!);
    this.metal(2900, t + 0.1, 0.26, 0.045, this.sfx!);
  }
  route() {
    const c = this.ready(); if (!c) return;
    const t = c.currentTime; // stone lever
    this.burst(this.brown!, t, 0.14, 0.4, 'lowpass', 900, 260, this.sfx!);
    this.osc('square', 150, t + 0.05, 0.05, 0.05, this.sfx!, 95, 0.002);
  }
  launch() {
    const c = this.ready(); if (!c) return;
    const t = c.currentTime; // stone door grinding, then the boulder drops (it lands 0.6s into the round)
    this.burst(this.brown!, t, 0.65, 0.5, 'bandpass', 240, 620, this.sfx!, 1.2, 0.09);
    this.burst(this.white!, t + 0.15, 0.45, 0.05, 'bandpass', 400, 1800, this.sfx!, 1, 0.3);
    this.osc('sine', 120, t + 0.58, 0.55, 0.65, this.sfx!, 30, 0.004);
    this.burst(this.brown!, t + 0.58, 0.7, 0.7, 'lowpass', 1500, 110, this.sfx!);
  }
  milestone() {
    const c = this.ready(); if (!c) return;
    const t = c.currentTime;
    this.metal(1320, t, 0.55, 0.045, this.sfx!);
    this.metal(1980, t + 0.08, 0.5, 0.03, this.sfx!);
  }
  split(route: Route) {
    const c = this.ready(); if (!c) return;
    const t = c.currentTime; // a gong through the gate, then a chord in the colour of the chosen route
    this.metal(150, t, 2.6, 0.26, this.sfx!);
    this.burst(this.white!, t, 0.55, 0.14, 'bandpass', 500, 4200, this.sfx!, 0.9, 0.2);
    (route === 'L' ? [-12, -9, -4, 3] : [-9, -2, 3, 7]).forEach((s, i) => this.osc('triangle', note(s + 12), t + 0.04 + i * 0.05, 1.2, 0.07, this.sfx!, undefined, 0.02));
  }
  cashout(big: boolean) {
    const c = this.ready(); if (!c) return;
    const t = c.currentTime, n = big ? 34 : 15;
    this.music?.gain.setTargetAtTime((this.musicOff ? 0 : MUSIC) * 0.45, t, 0.02);
    this.music?.gain.setTargetAtTime(this.musicOff ? 0 : MUSIC, t + 0.5, 0.35);
    for (let i = 0; i < n; i++) { // a spill of coins
      const when = t + Math.pow(i / n, 1.3) * (big ? 1.5 : 0.8) + Math.random() * 0.02;
      this.metal(2100 + Math.random() * 2100, when, 0.2 + Math.random() * 0.18, 0.036, this.pan(Math.random() * 1.2 - 0.6, this.sfx!));
    }
    [0, 4, 7, 12].forEach((s, i) => this.osc('triangle', note(s + 15), t + i * 0.075, 0.4, 0.15, this.sfx!, undefined, 0.005));
    if (big) { [12, 16, 19, 24].forEach((s, i) => this.osc('triangle', note(s + 15), t + 0.36 + i * 0.09, 0.8, 0.12, this.sfx!, undefined, 0.006)); this.metal(240, t + 0.36, 2.4, 0.14, this.sfx!); }
  }
  crash() {
    const c = this.ready(); if (!c) return;
    const t = c.currentTime;
    this.restUntil = t + 3.4; // let the collapse ring out before the music comes back
    this.osc('sine', 118, t, 1.8, 0.95, this.sfx!, 24, 0.005);                 // impact
    this.burst(this.brown!, t, 2.3, 1.1, 'lowpass', 2600, 70, this.sfx!);      // the ceiling coming down
    this.burst(this.white!, t, 0.2, 0.36, 'bandpass', 3000, 700, this.sfx!, 0.8);
    for (let i = 0; i < 26; i++) { // masonry landing, thinning out
      const when = t + 0.08 + Math.pow(i / 26, 1.5) * 2.3, f = 90 + Math.random() * 240, out = this.pan(Math.random() * 1.6 - 0.8, this.sfx!);
      this.osc('triangle', f * 1.8, when, 0.1 + Math.random() * 0.14, 0.13 + Math.random() * 0.16, out, f, 0.002);
      this.burst(this.brown!, when, 0.13, 0.32, 'lowpass', 1500, 220, out);
    }
    [-5, -6, -12].forEach((s, i) => this.osc('sawtooth', note(s), t + 0.1 + i * 0.3, 1.1, 0.04, this.sfx!, note(s - 3), 0.04)); // a sinking chord
  }
  /** Named one-shots the scene fires as the explorer meets each trap. */
  trap(name: string) {
    const c = this.ready(); if (!c) return;
    const t = c.currentTime, S = this.sfx!;
    switch (name) {
      case 'step': this.burst(this.brown!, t, 0.07, 0.17, 'lowpass', 720, 180, S); break;
      case 'jump': this.burst(this.white!, t, 0.2, 0.05, 'bandpass', 700, 1900, S, 1, 0.05); this.burst(this.brown!, t, 0.08, 0.26, 'lowpass', 800, 220, S); break;
      case 'land': this.burst(this.brown!, t, 0.13, 0.48, 'lowpass', 900, 120, S); break;
      case 'slide': this.burst(this.white!, t, 0.42, 0.075, 'bandpass', 1500, 500, S, 0.9, 0.04); this.burst(this.brown!, t, 0.42, 0.3, 'bandpass', 420, 240, S, 1, 0.04); break;
      case 'blade': this.burst(this.white!, t, 0.28, 0.22, 'bandpass', 900, 3600, S, 3, 0.11); this.metal(3100, t + 0.15, 0.3, 0.035, S); break;
      case 'dart': for (let i = 0; i < 3; i++) { this.osc('square', 170, t + i * 0.09, 0.03, 0.05, S, 110, 0.002); this.burst(this.white!, t + i * 0.09, 0.16, 0.13, 'bandpass', 2700, 900, S, 3, 0.02); } break;
      case 'fire': this.burst(this.brown!, t, 0.75, 0.85, 'lowpass', 340, 1500, S, 0.8, 0.05); this.burst(this.white!, t, 0.75, 0.07, 'bandpass', 1300, 2800, S, 0.7, 0.08); break;
      case 'hiss': this.burst(this.white!, t, 0.6, 0.1, 'highpass', 4300, 6400, S, 0.7, 0.05); break;
      case 'spikes': this.metal(520, t, 0.3, 0.09, S); this.osc('square', 210, t, 0.05, 0.06, S, 90, 0.002); break;
      case 'crusher': this.osc('sine', 104, t, 0.9, 0.85, S, 28, 0.004); this.burst(this.brown!, t, 0.65, 0.95, 'lowpass', 2200, 90, S); this.osc('triangle', 300, t, 0.12, 0.2, S, 120, 0.002); break;
      case 'coin': this.metal(2500 + Math.random() * 500, t, 0.16, 0.022, S); break;
      case 'gem': [0, 7, 12].forEach((s, i) => this.osc('triangle', note(s + 24), t + i * 0.05, 0.3, 0.07, S, undefined, 0.004)); this.metal(3400, t, 0.3, 0.03, S); break;
      case 'snap': this.burst(this.white!, t, 0.05, 0.34, 'bandpass', 1400, 600, S, 1.4); this.osc('triangle', 260, t, 0.07, 0.3, S, 110, 0.002); break;
      case 'crack': this.burst(this.white!, t, 0.08, 0.3, 'highpass', 2400, 1200, S); this.burst(this.brown!, t, 0.3, 0.5, 'lowpass', 900, 200, S); break;
      case 'vault': this.burst(this.brown!, t, 0.1, 0.34, 'lowpass', 900, 260, S); this.osc('triangle', 150, t, 0.06, 0.1, S, 90, 0.002); break;
      case 'topple': this.osc('sine', 80, t, 1.3, 0.9, S, 22, 0.006); this.burst(this.brown!, t, 1.1, 1, 'lowpass', 1500, 70, S); break;
      default: break;
    }
  }

  /* ---------- the run: music layer plus the boulder's rumble ---------- */
  startRun(p?: SoundProfile) {
    const c = this.ready(); if (!c) return;
    this.running = true; this.k = 0; this.curRoute = null; this.restUntil = 0;
    this.step = 0; this.bar = 0; this.next = c.currentTime + 0.05; // start the run on a downbeat
    this.amb!.gain.setTargetAtTime(AMBIENCE * 0.5, c.currentTime, 0.4);
    if (this.rumble) return;
    const src = c.createBufferSource(), osc = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), og = c.createGain();
    src.buffer = this.brown; src.loop = true;
    f.type = 'lowpass'; f.frequency.value = 170; f.Q.value = 1.2;
    const base = (p ? p.base : 73) * 0.55;
    osc.type = 'sine'; osc.frequency.value = base; og.gain.value = 0.12;
    g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.55, c.currentTime + 1);
    src.connect(f); osc.connect(og); og.connect(f); f.connect(g); g.connect(this.pan(-0.35, this.sfx!));
    src.start(); osc.start();
    this.rumble = { src, osc, f, g, base };
  }
  updateRun(m: number, route: Route | null) {
    const c = this.ready(); if (!c) return;
    this.k = Math.log(Math.max(1, m)); this.curRoute = route;
    const r = this.rumble; if (!r) return;
    const t = c.currentTime;
    r.f.frequency.setTargetAtTime(170 + this.k * 300, t, 0.1);
    r.osc.frequency.setTargetAtTime(r.base * (1 + this.k * 0.5), t, 0.1);
    r.g.gain.setTargetAtTime(Math.min(1, 0.55 + this.k * 0.22), t, 0.1);
  }
  stopRun() {
    this.running = false; this.k = 0;
    const c = this.ctx, r = this.rumble; if (!c) return;
    this.amb?.gain.setTargetAtTime(AMBIENCE, c.currentTime, 0.8);
    if (!r) return;
    this.rumble = null;
    r.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.1);
    r.src.stop(c.currentTime + 0.6); r.osc.stop(c.currentTime + 0.6);
  }
}

export const sound = new SoundEngine();
