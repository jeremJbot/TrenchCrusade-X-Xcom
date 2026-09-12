/* =====================================================================
   Ambiance sonore synthétisée (Web Audio) : bourdonnement de plateau,
   frappes clavier, téléphone, pas, bips d'interface, carillon.
   ===================================================================== */
'use strict';
(function () {
  const DFIN = window.DFIN;
  const audio = {
    ctx: null, on: true, master: null, started: false, _next: {},
    init() {
      if (this.ctx) return; try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.on = false; return; }
      this.master = this.ctx.createGain(); this.master.gain.value = this.on ? 0.6 : 0; this.master.connect(this.ctx.destination);
      this._ambient(); this.started = true;
    },
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    toggle() { this.on = !this.on; if (this.master) this.master.gain.value = this.on ? 0.6 : 0; return this.on; },
    _noise(seconds) { const sr = this.ctx.sampleRate; const b = this.ctx.createBuffer(1, sr * seconds, sr); const d = b.getChannelData(0); let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } return b; },
    _ambient() {
      const src = this.ctx.createBufferSource(); src.buffer = this._noise(4); src.loop = true;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
      const g = this.ctx.createGain(); g.gain.value = 0.16; src.connect(lp); lp.connect(g); g.connect(this.master); src.start();
      // ventilation aiguë très légère
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 118; const og = this.ctx.createGain(); og.gain.value = 0.012; o.connect(og); og.connect(this.master); o.start();
    },
    update(dt, playerMoving, npcSeatedCount) {
      if (!this.ctx || !this.on) return;
      const now = this.ctx.currentTime;
      // frappes clavier aléatoires
      this._next.key = (this._next.key || 0) - dt;
      if (this._next.key <= 0) { this._next.key = 0.05 + Math.random() * 0.35; if (Math.random() < 0.6) this.click(0.02 + Math.random() * 0.02, 1800 + Math.random() * 1400); }
      this._next.phone = (this._next.phone || 35) - dt;
      if (this._next.phone <= 0) { this._next.phone = 40 + Math.random() * 60; this.phone(); }
      if (playerMoving) { this._next.step = (this._next.step || 0) - dt; if (this._next.step <= 0) { this._next.step = 0.32; this.click(0.05, 240 + Math.random() * 60, 0.06); } }
      void now; void npcSeatedCount;
    },
    click(vol, freq, dur) {
      if (!this.ctx || !this.on) return; const t = this.ctx.currentTime; const o = this.ctx.createOscillator(); o.type = 'square'; o.frequency.value = freq;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.03)); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + (dur || 0.03) + 0.01);
    },
    blip() { this.resume(); if (!this.ctx || !this.on) return; const t = this.ctx.currentTime; const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(660, t); o.frequency.exponentialRampToValueAtTime(990, t + 0.08); const g = this.ctx.createGain(); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.14); },
    chime() { if (!this.ctx || !this.on) return; const t = this.ctx.currentTime; [523, 659, 784, 1047].forEach((f, i) => { const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t + i * 0.09); g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.09 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.5); o.connect(g); g.connect(this.master); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.55); }); },
    phone() { if (!this.ctx || !this.on) return; const t = this.ctx.currentTime; for (let r = 0; r < 2; r++) { const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 880; const o2 = this.ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 1046; const g = this.ctx.createGain(); g.gain.value = 0; const lfo = this.ctx.createOscillator(); lfo.frequency.value = 20; const lg = this.ctx.createGain(); lg.gain.value = 0.03; lfo.connect(lg); lg.connect(g.gain); g.gain.setValueAtTime(0.03, t + r * 1.2); g.gain.setValueAtTime(0.0001, t + r * 1.2 + 0.6); o.connect(g); o2.connect(g); g.connect(this.master); o.start(t + r * 1.2); o2.start(t + r * 1.2); lfo.start(t + r * 1.2); o.stop(t + r * 1.2 + 0.6); o2.stop(t + r * 1.2 + 0.6); lfo.stop(t + r * 1.2 + 0.6); } },
    coffee() { if (!this.ctx || !this.on) return; const t = this.ctx.currentTime; const src = this.ctx.createBufferSource(); src.buffer = this._noise(1.2); const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.7; const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1); src.connect(bp); bp.connect(g); g.connect(this.master); src.start(t); },
  };
  DFIN.audio = audio;
})();
