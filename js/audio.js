// Áudio sintetizado em tempo real (Web Audio). Nenhum arquivo de som externo.
export const Audio = {
  ctx: null, volume: .8,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = this.volume; this.master.connect(ctx.destination);
    this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(2.6, 2.6);
    const wet = ctx.createGain(); wet.gain.value = .45; this.verb.connect(wet); wet.connect(this.master);
    this.bus = ctx.createGain(); this.bus.connect(this.master); this.bus.connect(this.verb);
    this.noise = this.makeNoise(3);
    // drone grave
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 150; f.Q.value = 5;
    this.droneGain = ctx.createGain(); this.droneGain.gain.value = .05;
    [43.65, 44.2, 65.4, 92.5].forEach(fr => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(); });
    const lfo = ctx.createOscillator(); lfo.frequency.value = .045; const lg = ctx.createGain(); lg.gain.value = 70; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    f.connect(this.droneGain); this.droneGain.connect(this.master);
    // ar
    const n = ctx.createBufferSource(); n.buffer = this.noise; n.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 320; bp.Q.value = .7;
    const ag = ctx.createGain(); ag.gain.value = .03; n.connect(bp); bp.connect(ag); ag.connect(this.master); n.start();
    // estática
    const s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
    this.staticGain = ctx.createGain(); this.staticGain.gain.value = 0; s.connect(hp); hp.connect(this.staticGain); this.staticGain.connect(this.master); s.start();
    // zumbido de lâmpada
    const hum = ctx.createOscillator(); hum.type = 'square'; hum.frequency.value = 120;
    const hf = ctx.createBiquadFilter(); hf.type = 'bandpass'; hf.frequency.value = 240; hf.Q.value = 8;
    this.humGain = ctx.createGain(); this.humGain.gain.value = 0; hum.connect(hf); hf.connect(this.humGain); this.humGain.connect(this.bus); hum.start();
    // perseguição
    const cf = ctx.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 900; cf.Q.value = 1.2;
    this.chaseGain = ctx.createGain(); this.chaseGain.gain.value = 0;
    const trem = ctx.createGain(); trem.gain.value = .6;
    const tl = ctx.createOscillator(); tl.frequency.value = 7; const tg = ctx.createGain(); tg.gain.value = .4; tl.connect(tg); tg.connect(trem.gain); tl.start();
    [220, 233.1, 329.6, 349.2, 466.2].forEach(fr => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = (Math.random() - .5) * 20; o.connect(cf); o.start(); });
    cf.connect(trem); trem.connect(this.chaseGain); this.chaseGain.connect(this.bus);
    // gerador
    const gen = ctx.createOscillator(); gen.type = 'sawtooth'; gen.frequency.value = 50;
    const gf = ctx.createBiquadFilter(); gf.type = 'lowpass'; gf.frequency.value = 220;
    this.genGain = ctx.createGain(); this.genGain.gain.value = 0; gen.connect(gf); gf.connect(this.genGain); this.genGain.connect(this.bus); gen.start();
    // sirene
    const sir = ctx.createOscillator(); sir.type = 'sawtooth'; sir.frequency.value = 500;
    const sl = ctx.createOscillator(); sl.frequency.value = .45; const slg = ctx.createGain(); slg.gain.value = 180; sl.connect(slg); slg.connect(sir.frequency); sl.start();
    const sf = ctx.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 900; sf.Q.value = 2;
    this.sirenGain = ctx.createGain(); this.sirenGain.gain.value = 0; sir.connect(sf); sf.connect(this.sirenGain); this.sirenGain.connect(this.bus); sir.start();
  },
  setVolume(v) { this.volume = v; if (this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, .05); },
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  impulse(dur, decay) { const c = this.ctx, len = Math.floor(c.sampleRate * dur), b = c.createBuffer(2, len, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); } return b; },
  makeNoise(sec) { const c = this.ctx, len = Math.floor(c.sampleRate * sec), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; return b; },
  panner(p) { if (this.ctx.createStereoPanner) { const s = this.ctx.createStereoPanner(); s.pan.value = Math.max(-1, Math.min(1, p || 0)); return s; } return this.ctx.createGain(); },
  env(g, t, vol, att, len) { vol = Math.max(vol, .0002); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(.0001, t + len); },
  set(node, v, tc) { if (this.ctx) node.gain.setTargetAtTime(v, this.ctx.currentTime, tc || .08); },
  setStatic(v) { if (this.ctx) this.set(this.staticGain, v); },
  setHum(v) { if (this.ctx) this.set(this.humGain, v, .05); },
  setChase(v) { if (this.ctx) this.set(this.chaseGain, v, v > 0 ? .15 : 1.2); },
  setGenerator(v) { if (this.ctx) this.set(this.genGain, v, .8); },
  setSiren(v) { if (this.ctx) this.set(this.sirenGain, v, .3); },
  silenceLoops() { this.setStatic(0); this.setHum(0); this.setChase(0); this.setSiren(0); },

  noiseHit(vol, pan, type, freq, len, toVerb = true, q = 1) {
    const c = this.ctx; if (!c) return; const t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); this.env(g, t, vol, .006, len);
    const p = this.panner(pan); src.connect(f); f.connect(g); g.connect(p); p.connect(toVerb ? this.bus : this.master);
    src.start(t, Math.random() * 2, len + .05);
  },
  step(vol, pan, cut, len) { this.noiseHit(vol, pan, 'lowpass', cut, len); },
  thump(vol, freq, delay, pan) {
    const c = this.ctx; if (!c) return; const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * .55, t + .16);
    const g = c.createGain(); this.env(g, t, vol, .012, .26);
    const p = this.panner(pan); o.connect(g); g.connect(p); p.connect(this.master); o.start(t); o.stop(t + .3);
  },
  tone(freq, vol, len, type = 'sine', delay = 0, toVerb = true) {
    const c = this.ctx; if (!c) return; const t = c.currentTime + delay;
    const o = c.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = c.createGain(); this.env(g, t, vol, .01, len);
    o.connect(g); g.connect(toVerb ? this.bus : this.master); o.start(t); o.stop(t + len + .05);
  },
  heartbeat(vol) { this.thump(vol, 62, 0); this.thump(vol * .7, 54, .17); },
  chime() { [523.25, 622.25, 739.99].forEach((f, i) => this.tone(f * (1 + (Math.random() - .5) * .004), .07, 2.4, 'sine', i * .11)); },
  pickupKey() { for (let i = 0; i < 5; i++) this.tone(2400 + Math.random() * 1600, .03, .12, 'triangle', i * .05); },
  click() { this.tone(1800, .05, .04, 'square', 0, false); },
  ping(vol, pan) {
    const c = this.ctx; if (!c) return; const t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 1320;
    const g = c.createGain(); this.env(g, t, vol, .004, .18); const p = this.panner(pan);
    o.connect(g); g.connect(p); p.connect(this.bus); o.start(t); o.stop(t + .2);
  },
  creak(pan, vol = .035, f0 = 150, f1 = 82, len = 1.5) {
    const c = this.ctx; if (!c) return; const t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f1, t + len);
    const v = c.createOscillator(); v.frequency.value = 9; const vg = c.createGain(); vg.gain.value = 6; v.connect(vg); vg.connect(o.frequency);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 650; f.Q.value = 3;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .25); g.gain.linearRampToValueAtTime(0, t + len + .1);
    const p = this.panner(pan); o.connect(f); f.connect(g); g.connect(p); p.connect(this.bus); o.start(t); v.start(t); o.stop(t + len + .2); v.stop(t + len + .2);
  },
  door(pan, vol = 1) { this.creak(pan, .04 * vol, 210 + Math.random() * 60, 120, .9); this.noiseHit(.12 * vol, pan, 'lowpass', 1400, .05); },
  doorLocked(pan) { for (let i = 0; i < 4; i++) setTimeout(() => this.noiseHit(.15, pan, 'bandpass', 900 + Math.random() * 400, .05, true, 3), i * 90); },
  locker(vol = 1) { this.noiseHit(.2 * vol, 0, 'bandpass', 700, .12, true, 2); this.tone(310, .05 * vol, .3, 'square'); this.tone(470, .03 * vol, .25, 'square'); },
  slam(vol, pan) { this.thump(vol * 1.3, 46, 0, pan); this.step(vol * .8, pan, 700, .4); },
  whisper(pan, vol = .09) {
    const c = this.ctx; if (!c) return; const t = c.currentTime;
    for (let k = 0; k < 2; k++) {
      const src = c.createBufferSource(); src.buffer = this.noise;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 10;
      f.frequency.setValueAtTime(900 + k * 500, t); f.frequency.linearRampToValueAtTime(2300 + k * 300, t + .6); f.frequency.linearRampToValueAtTime(1100 + k * 400, t + 1.6);
      const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .4); g.gain.linearRampToValueAtTime(vol * .55, t + 1); g.gain.linearRampToValueAtTime(0, t + 1.8);
      const p = this.panner(pan); src.connect(f); f.connect(g); g.connect(p); p.connect(this.bus); src.start(t, Math.random() * 2, 2);
    }
  },
  voice(pan) { // sussurro mais longo, para o telefone
    for (let i = 0; i < 3; i++) setTimeout(() => this.whisper(pan, .12), i * 900);
    this.setStatic(.05); setTimeout(() => this.setStatic(0), 3200);
  },
  phoneRing(n = 1) {
    const c = this.ctx; if (!c) return; const t = c.currentTime;
    for (let r = 0; r < 2; r++) {
      const st = t + r * .5;
      [440, 480].forEach(fr => {
        const o = c.createOscillator(); o.type = 'square'; o.frequency.value = fr;
        const am = c.createOscillator(); am.type = 'square'; am.frequency.value = 20; const ag = c.createGain(); ag.gain.value = .5; am.connect(ag);
        const g = c.createGain(); g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(.025, st + .02); g.gain.setValueAtTime(.025, st + .38); g.gain.linearRampToValueAtTime(0, st + .4);
        const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 1;
        ag.connect(g.gain); o.connect(f); f.connect(g); g.connect(this.bus); o.start(st); am.start(st); o.stop(st + .45); am.stop(st + .45);
      });
    }
  },
  stinger(vol = 1) {
    const c = this.ctx; if (!c) return; const t = c.currentTime;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
    const g = c.createGain(); this.env(g, t, .16 * vol, .008, 1.6); hp.connect(g); g.connect(this.bus); g.connect(this.master);
    [880, 932.3, 1244.5, 1318.5, 1864.7].forEach(fr => { const o = c.createOscillator(); o.type = Math.random() < .5 ? 'sawtooth' : 'square'; o.frequency.setValueAtTime(fr, t); o.frequency.linearRampToValueAtTime(fr * .94, t + 1.5); o.connect(hp); o.start(t); o.stop(t + 1.65); });
    this.thump(.7 * vol, 40, 0);
  },
  breath(vol, pan, low, rasp) {
    const c = this.ctx; if (!c) return; const t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(low ? 420 : 950, t); f.frequency.linearRampToValueAtTime(low ? 300 : 700, t + .9); f.Q.value = low ? 3 : 1.4;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .35); g.gain.linearRampToValueAtTime(vol * .6, t + .55); g.gain.linearRampToValueAtTime(0, t + 1);
    const p = this.panner(pan); src.connect(f); f.connect(g); g.connect(p); p.connect(rasp ? this.bus : this.master); src.start(t, Math.random() * 2, 1.1);
    if (rasp) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(58, t + .9); const og = c.createGain(); og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(vol * .35, t + .3); og.gain.linearRampToValueAtTime(0, t + 1); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; o.connect(lp); lp.connect(og); og.connect(p); o.start(t); o.stop(t + 1.1); }
  },
  gasp() { this.breath(.16, 0, false, false); this.noiseHit(.06, 0, 'bandpass', 1200, .25, false, 1); },
  pop(pan) { this.step(.35, pan, 4000, .06); this.thump(.25, 120, 0, pan); this.step(.12, pan, 9000, .5); },
  scream() {
    const c = this.ctx; if (!c) return; const t = c.currentTime;
    const ws = c.createWaveShaper(); const curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 6); } ws.curve = curve;
    const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.45, t + .03); g.gain.exponentialRampToValueAtTime(.0001, t + 1.8);
    ws.connect(g); g.connect(this.master); g.connect(this.verb);
    [310, 447, 612, 833, 1190].forEach(fr => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(fr * (1 + Math.random() * .05), t); o.frequency.exponentialRampToValueAtTime(fr * .38, t + 1.7); const og = c.createGain(); og.gain.value = .25; o.connect(og); og.connect(ws); o.start(t); o.stop(t + 1.85); });
    const n = c.createBufferSource(); n.buffer = this.noise; const ng = c.createGain(); ng.gain.value = .5; n.connect(ng); ng.connect(ws); n.start(t, 0, 1.8);
  },
  distantScream() {
    const c = this.ctx; if (!c) return; const t = c.currentTime;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.06, t + .2); g.gain.linearRampToValueAtTime(0, t + 2.2);
    lp.connect(g); g.connect(this.verb); g.connect(this.bus);
    [420, 560, 760].forEach(fr => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(fr, t); o.frequency.linearRampToValueAtTime(fr * .6, t + 2); o.connect(lp); o.start(t); o.stop(t + 2.3); });
  },
  power() { this.thump(.8, 70, 0); this.thump(.6, 50, .2); this.noiseHit(.3, 0, 'lowpass', 400, .8); },
  unlock() { this.thump(.5, 90, 0); this.tone(196, .08, 2.5, 'triangle', .3); }
};
