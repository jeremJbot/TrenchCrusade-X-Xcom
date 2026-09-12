/* Trench Crusade × XCOM — synthesized audio (Web Audio, no assets) */
window.TC = window.TC || {};
(function () {
  const Au = { ctx: null, master: null, muted: false, ambient: null };
  TC.Audio = Au;
  try { Au.muted = localStorage.getItem('tc_mute') === '1'; } catch (e) { }
  Au.init = function () {
    if (Au.ctx) { if (Au.ctx.state === 'suspended') Au.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    Au.ctx = new AC(); Au.master = Au.ctx.createGain(); Au.master.gain.value = Au.muted ? 0 : 0.8; Au.master.connect(Au.ctx.destination);
    Au.noiseBuf = (function () { const len = Au.ctx.sampleRate * 2; const b = Au.ctx.createBuffer(1, len, Au.ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; return b; })();
  };
  Au.setMuted = function (m) { Au.muted = m; try { localStorage.setItem('tc_mute', m ? '1' : '0'); } catch (e) { } if (Au.master) Au.master.gain.setTargetAtTime(m ? 0 : 0.8, Au.ctx.currentTime, 0.05); };
  function noise(dur, filterType, freq, q, gain, decay, delay) {
    const c = Au.ctx; const t0 = c.currentTime + (delay || 0); const src = c.createBufferSource(); src.buffer = Au.noiseBuf; const f = c.createBiquadFilter(); f.type = filterType || 'lowpass'; f.frequency.value = freq || 1000; f.Q.value = q || 1;
    const g = c.createGain(); g.gain.setValueAtTime(gain || 0.5, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + (decay || dur)); src.connect(f); f.connect(g); g.connect(Au.master); src.start(t0); src.stop(t0 + dur + 0.05); return { f, g };
  }
  function tone(type, f0, f1, dur, gain, delay, dest) {
    const c = Au.ctx; const t0 = c.currentTime + (delay || 0); const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    const g = c.createGain(); g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur); o.connect(g); g.connect(dest || Au.master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  const S = {
    rifle: () => { noise(0.25, 'lowpass', 1800, 0.7, 0.9, 0.18); tone('sine', 140, 40, 0.18, 0.7); noise(0.5, 'bandpass', 500, 0.5, 0.2, 0.5, 0.05); },
    pistol: () => { noise(0.15, 'bandpass', 2500, 0.8, 0.7, 0.12); tone('sine', 220, 60, 0.1, 0.5); },
    hmg: () => { for (let i = 0; i < 4; i++) { noise(0.12, 'lowpass', 1500, 0.7, 0.8, 0.1, i * 0.09); tone('sine', 120, 40, 0.12, 0.6, i * 0.09); } },
    flame: () => { const n = noise(1.1, 'lowpass', 900, 0.5, 0.8, 1.0); n.f.frequency.setValueAtTime(400, Au.ctx.currentTime); n.f.frequency.linearRampToValueAtTime(1600, Au.ctx.currentTime + 0.3); tone('sawtooth', 60, 40, 0.9, 0.15); },
    explosion: () => { noise(1.2, 'lowpass', 400, 0.5, 1.2, 1.1); tone('sine', 90, 25, 0.7, 1.0); noise(0.4, 'highpass', 3000, 0.5, 0.3, 0.3, 0.02); },
    blade: () => { noise(0.18, 'highpass', 4000, 0.5, 0.5, 0.15); tone('triangle', 900, 300, 0.12, 0.3, 0.02); },
    blunt: () => { noise(0.2, 'lowpass', 500, 0.5, 0.8, 0.18); tone('sine', 100, 40, 0.2, 0.7); },
    bite: () => { noise(0.15, 'bandpass', 1200, 1, 0.6, 0.12); tone('sawtooth', 300, 80, 0.15, 0.3); },
    miss: () => { noise(0.25, 'bandpass', 3000, 2, 0.25, 0.22); tone('sine', 1200, 600, 0.1, 0.1); },
    hit: () => { noise(0.12, 'lowpass', 800, 0.5, 0.5, 0.1); tone('sine', 180, 60, 0.12, 0.4); },
    crit: () => { noise(0.2, 'lowpass', 1200, 0.5, 0.8, 0.18); tone('sine', 220, 50, 0.25, 0.6); tone('square', 880, 440, 0.15, 0.1, 0.03); },
    death: () => { tone('sawtooth', 200, 40, 0.6, 0.25); noise(0.5, 'lowpass', 600, 0.5, 0.5, 0.45); },
    step: () => { noise(0.06, 'lowpass', 500, 0.5, 0.25, 0.05); },
    ui: () => { tone('square', 660, 880, 0.05, 0.08); },
    select: () => { tone('sine', 520, 780, 0.08, 0.12); },
    bell: () => { [1, 2.0, 2.98, 4.2].forEach((h, i) => tone('sine', 196 * h, 196 * h * 0.995, 2.5 - i * 0.4, 0.35 / (i + 1))); tone('triangle', 196 * 0.5, 196 * 0.5, 2.0, 0.15); },
    bellDeep: () => { [1, 2.0, 2.98].forEach((h, i) => tone('sine', 110 * h, 110 * h * 0.99, 3.5 - i * 0.5, 0.4 / (i + 1))); noise(0.3, 'lowpass', 300, 0.5, 0.4, 0.25); },
    holy: () => { [523, 659, 784, 1047].forEach((f, i) => tone('sine', f, f * 1.01, 1.2, 0.12, i * 0.08)); noise(1.0, 'highpass', 5000, 0.5, 0.05, 0.9); },
    dark: () => { tone('sawtooth', 80, 40, 1.0, 0.25); tone('sine', 55, 30, 1.2, 0.3); noise(0.8, 'bandpass', 300, 3, 0.2, 0.7); },
    heal: () => { [392, 494, 587].forEach((f, i) => tone('triangle', f, f, 0.5, 0.12, i * 0.1)); },
    burn: () => { noise(0.4, 'lowpass', 1200, 0.5, 0.3, 0.35); },
    reload: () => { noise(0.05, 'highpass', 2000, 1, 0.3, 0.04); noise(0.05, 'highpass', 2500, 1, 0.3, 0.04, 0.12); },
    overwatch: () => { tone('sine', 440, 660, 0.15, 0.12); tone('sine', 660, 660, 0.2, 0.08, 0.12); },
    hunker: () => { noise(0.2, 'lowpass', 700, 0.5, 0.3, 0.18); },
    win: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone('triangle', f, f, 1.5, 0.15, i * 0.15)); S.bell(); },
    lose: () => { [330, 311, 294, 277].forEach((f, i) => tone('sawtooth', f, f * 0.98, 1.2, 0.1, i * 0.35)); S.bellDeep(); },
    throw_: () => { noise(0.3, 'bandpass', 800, 1, 0.2, 0.28); },
    alarm: () => { for (let i = 0; i < 3; i++) tone('square', 220, 220, 0.25, 0.08, i * 0.35); },
  };
  Au.play = function (name) { if (!Au.ctx || Au.muted) return; const f = S[name]; if (f) { try { f(); } catch (e) { } } };
  Au.startAmbient = function () {
    if (!Au.ctx || Au.ambient) return; const c = Au.ctx;
    const src = c.createBufferSource(); src.buffer = Au.noiseBuf; src.loop = true; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220; const g = c.createGain(); g.gain.value = 0.08;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 120; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    src.connect(f); f.connect(g); g.connect(Au.master); src.start();
    const drone = c.createOscillator(); drone.type = 'sine'; drone.frequency.value = 55; const dg = c.createGain(); dg.gain.value = 0.05; drone.connect(dg); dg.connect(Au.master); drone.start();
    Au.ambient = { src, drone, lfo };
  };
})();
