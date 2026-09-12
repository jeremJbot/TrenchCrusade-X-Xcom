/* =====================================================================
   Graphiques canvas (HiDPI) avec survol : lignes, barres, sparklines,
   pont (waterfall). Marques fines, grille discrète, texte en tokens.
   ===================================================================== */
'use strict';
(function () {
  const WALL = window.WALL;
  const TOK = { grid: 'rgba(160,175,200,0.14)', axis: 'rgba(160,175,200,0.35)', text: '#aeb8c8', text2: '#7d8797', neutral: '#7d8797', surface: '#111a2b', target: '#e08a5a' };
  const tip = document.createElement('div'); tip.id = 'charttip'; tip.hidden = true; document.addEventListener('DOMContentLoaded', () => document.body.appendChild(tip));
  const fmtNum = (v, d) => (v == null || isNaN(v)) ? '—' : Number(v).toLocaleString('fr-FR', { minimumFractionDigits: d == null ? (Math.abs(v) < 10 ? 1 : 0) : d, maximumFractionDigits: d == null ? (Math.abs(v) < 10 ? 1 : 0) : d });

  function setup(canvas) {
    const r = canvas.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2) * 1.5; // sur-échantillonnage : le mur est mis à l'échelle
    const w = Math.max(80, Math.round(canvas.clientWidth || r.width || canvas.width)), h = Math.max(60, Math.round(canvas.clientHeight || r.height || canvas.height));
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }
  function niceTicks(mn, mx, n) {
    const span = mx - mn || 1; const raw = span / n; const p = Math.pow(10, Math.floor(Math.log10(raw))); const f = raw / p; const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
    const t0 = Math.floor(mn / step) * step; const ticks = []; for (let v = t0; v <= mx + step * 0.001; v += step) ticks.push(+v.toFixed(10)); return ticks;
  }
  function showTip(x, y, html) { tip.innerHTML = html; tip.hidden = false; const vw = window.innerWidth; tip.style.left = Math.min(vw - 240, x + 14) + 'px'; tip.style.top = (y + 14) + 'px'; }
  function hideTip() { tip.hidden = true; }

  /* ------------------------------------------------ Ligne --------- */
  // spec: { labels, series:[{name,data,color,neutral,dash}], target, targetLabel, splitAt (index dernier réel), asof, fmt }
  function line(canvas, spec) {
    const { ctx, w, h } = setup(canvas); const padL = 44, padR = 14, padT = 12, padB = 22; const cw = w - padL - padR, ch = h - padT - padB;
    const all = spec.series.flatMap(s => s.data).concat(spec.target != null ? [spec.target] : []).filter(v => v != null);
    let mn = Math.min(...all), mx = Math.max(...all); const span = (mx - mn) || Math.abs(mx) || 1; mn -= span * 0.12; mx += span * 0.12; if (spec.zero) mn = Math.min(0, mn);
    const ticks = niceTicks(mn, mx, 4); mn = Math.min(mn, ticks[0]); mx = Math.max(mx, ticks[ticks.length - 1]);
    const n = spec.labels.length; const X = i => padL + (n > 1 ? i * cw / (n - 1) : cw / 2), Y = v => padT + ch - (v - mn) / (mx - mn) * ch;
    ctx.font = '10px "IBM Plex Sans", system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'right'; ctx.fillStyle = TOK.text2; ctx.strokeStyle = TOK.grid; ctx.lineWidth = 1;
    for (const t of ticks) { if (t < mn || t > mx) continue; const y = Math.round(Y(t)) + 0.5; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke(); ctx.fillText(fmtNum(t, spec.tickDec), padL - 6, y); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; spec.labels.forEach((l, i) => { if (n > 12 && i % 2) return; ctx.fillStyle = i === spec.asof ? TOK.text : TOK.text2; ctx.fillText(l, X(i), padT + ch + 6); });
    // zone prévision
    if (spec.splitAt != null && spec.splitAt < n - 1) { ctx.fillStyle = 'rgba(255,255,255,0.025)'; ctx.fillRect(X(spec.splitAt), padT, X(n - 1) - X(spec.splitAt), ch); ctx.fillStyle = TOK.text2; ctx.font = '9px "IBM Plex Sans", system-ui'; ctx.textAlign = 'left'; ctx.fillText('PRÉVISION', X(spec.splitAt) + 4, padT + 2); }
    // cible
    if (spec.target != null) { const y = Math.round(Y(spec.target)) + 0.5; ctx.strokeStyle = TOK.target; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = TOK.target; ctx.font = '9px "IBM Plex Sans", system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText((spec.targetLabel || 'cible') + ' ' + fmtNum(spec.target), w - padR, y - 2); }
    // repère as-of
    if (spec.asof != null) { const x = Math.round(X(spec.asof)) + 0.5; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + ch); ctx.stroke(); }
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    spec.series.forEach(s => {
      const col = s.neutral ? TOK.neutral : (s.color || '#4fb3d9'); const split = spec.splitAt == null ? n - 1 : spec.splitAt;
      const seg = (from, to, dash) => { ctx.strokeStyle = col; ctx.lineWidth = s.neutral ? 1.5 : 2; ctx.setLineDash(dash ? [4, 4] : []); ctx.beginPath(); for (let i = from; i <= to; i++) { if (s.data[i] == null) continue; i === from ? ctx.moveTo(X(i), Y(s.data[i])) : ctx.lineTo(X(i), Y(s.data[i])); } ctx.stroke(); ctx.setLineDash([]); };
      seg(0, Math.min(split, n - 1), s.dash); if (split < n - 1) seg(split, n - 1, true);
      if (!s.neutral) { const g = ctx.createLinearGradient(0, padT, 0, padT + ch); g.addColorStop(0, col + '33'); g.addColorStop(1, col + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(X(0), Y(s.data[0])); for (let i = 1; i < n; i++) ctx.lineTo(X(i), Y(s.data[i])); ctx.lineTo(X(n - 1), padT + ch); ctx.lineTo(X(0), padT + ch); ctx.closePath(); ctx.fill(); }
      // point as-of et extrémité
      const marks = spec.asof != null ? [spec.asof] : [n - 1];
      for (const i of marks) { ctx.fillStyle = TOK.surface; ctx.beginPath(); ctx.arc(X(i), Y(s.data[i]), 5.5, 0, 7); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(i), Y(s.data[i]), 3.5, 0, 7); ctx.fill(); }
    });
    // étiquette de valeur as-of pour la série principale
    const main = spec.series.find(s => !s.neutral) || spec.series[0]; const ai = spec.asof != null ? spec.asof : n - 1;
    if (main && main.data[ai] != null) { ctx.fillStyle = TOK.text; ctx.font = 'bold 10px "IBM Plex Mono", ui-monospace, monospace'; ctx.textAlign = ai > n * 0.75 ? 'right' : 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(fmtNum(main.data[ai], spec.dec), X(ai) + (ai > n * 0.75 ? -8 : 8), Y(main.data[ai]) - 6); }
    canvas._hit = { kind: 'line', X, n, padL, cw, labels: spec.labels, series: spec.series, dec: spec.dec, unit: spec.unit || '' };
    bindHover(canvas);
  }

  /* ------------------------------------------------ Barres -------- */
  // spec: { labels, series:[{name,data,color,neutral}], colors (par barre), highlight (index), asof, splitAt, unit }
  function bars(canvas, spec) {
    const { ctx, w, h } = setup(canvas); const padL = 40, padR = 10, padT = 10, padB = 22; const cw = w - padL - padR, ch = h - padT - padB;
    const all = spec.series.flatMap(s => s.data).filter(v => v != null); let mx = Math.max(0, ...all); let mn = Math.min(0, ...all); const ticks = niceTicks(mn, mx * 1.08, 4); mn = ticks[0]; mx = ticks[ticks.length - 1] || 1;
    const n = spec.labels.length, ns = spec.series.length; const slot = cw / n; const bw = Math.min(22, slot * 0.7 / ns); const Y = v => padT + ch - (v - mn) / (mx - mn) * ch;
    ctx.font = '10px "IBM Plex Sans", system-ui'; ctx.textBaseline = 'middle'; ctx.textAlign = 'right'; ctx.strokeStyle = TOK.grid;
    for (const t of ticks) { const y = Math.round(Y(t)) + 0.5; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke(); ctx.fillStyle = TOK.text2; ctx.fillText(fmtNum(t, spec.tickDec), padL - 6, y); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    spec.labels.forEach((l, i) => { ctx.fillStyle = (spec.highlight === i) ? TOK.text : TOK.text2; ctx.font = (spec.highlight === i ? 'bold ' : '') + '10px "IBM Plex Sans", system-ui'; ctx.fillText(l, padL + slot * (i + 0.5), padT + ch + 6); });
    const y0 = Y(0); const rects = [];
    spec.series.forEach((s, si) => {
      s.data.forEach((v, i) => {
        if (v == null) return; const x = padL + slot * (i + 0.5) - (ns * bw) / 2 + si * bw + 1; const y = Y(v); const hh = Math.abs(y0 - y);
        let col = s.neutral ? TOK.neutral : (spec.colors ? spec.colors[i] : (s.color || '#4fb3d9'));
        const dim = (spec.highlight != null && spec.highlight !== i) || (spec.splitAt != null && i > spec.splitAt);
        ctx.fillStyle = col; ctx.globalAlpha = dim ? 0.35 : 1;
        const top = Math.min(y, y0); rr(ctx, x, top, bw - 2, hh, v >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3]); ctx.fill(); ctx.globalAlpha = 1;
        if (spec.asof != null && i === spec.asof) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.strokeRect(x - 1.5, top - 1.5, bw + 1, hh + 3); }
        rects.push({ x, y: top, w: bw - 2, h: hh, i, si });
      });
    });
    // étiquette sur la valeur en surbrillance / as-of / max
    const main = spec.series[spec.series.length - 1]; const li = spec.highlight != null ? spec.highlight : (spec.asof != null ? spec.asof : main.data.indexOf(Math.max(...main.data)));
    if (main && main.data[li] != null) { const x = padL + slot * (li + 0.5) - (ns * bw) / 2 + (ns - 1) * bw + bw / 2; ctx.fillStyle = TOK.text; ctx.font = 'bold 10px "IBM Plex Mono", ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(fmtNum(main.data[li], spec.dec), x, Y(main.data[li]) - 3); }
    ctx.strokeStyle = TOK.axis; ctx.beginPath(); ctx.moveTo(padL, Math.round(y0) + 0.5); ctx.lineTo(w - padR, Math.round(y0) + 0.5); ctx.stroke();
    canvas._hit = { kind: 'bars', rects, labels: spec.labels, series: spec.series, dec: spec.dec, unit: spec.unit || '' };
    bindHover(canvas);
  }

  /* ------------------------------------------------ Pont ---------- */
  function bridge(canvas, spec) {
    const { ctx, w, h } = setup(canvas); const padL = 44, padR = 10, padT = 12, padB = 30; const cw = w - padL - padR, ch = h - padT - padB;
    const steps = spec.steps; let run = 0; const items = [];
    steps.forEach((s, i) => { if (s.total) { if (i === 0) { run = s.v; items.push({ l: s.l, from: 0, to: run, total: true }); } else items.push({ l: s.l, from: 0, to: run, total: true }); } else { items.push({ l: s.l, from: run, to: run + s.v, v: s.v }); run += s.v; } });
    const deltas = items.filter(i => !i.total).flatMap(it => [it.from, it.to]); const totals = items.filter(i => i.total).map(i => i.to); const lo = Math.min(...deltas, ...totals), hi = Math.max(...deltas, ...totals); const mn = lo - (hi - lo) * 0.6, mx = hi + (hi - lo) * 0.12; items.forEach(it => { if (it.total) it.from = mn; });
    const n = items.length; const slot = cw / n; const bw = Math.min(46, slot * 0.66); const Y = v => padT + ch - (v - mn) / (mx - mn) * ch;
    ctx.strokeStyle = TOK.grid; const ticks = niceTicks(mn, mx, 4); ctx.font = '10px "IBM Plex Sans", system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const t of ticks) { if (t < mn || t > mx) continue; const y = Math.round(Y(t)) + 0.5; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke(); ctx.fillStyle = TOK.text2; ctx.fillText(fmtNum(t, 0), padL - 6, y); }
    const rects = [];
    items.forEach((it, i) => {
      const x = padL + slot * (i + 0.5) - bw / 2; const y1 = Y(it.from), y2 = Y(it.to); const top = Math.min(y1, y2), hh = Math.max(2, Math.abs(y1 - y2));
      ctx.fillStyle = it.total ? TOK.neutral : (it.v >= 0 ? '#d03b3b' : '#0ca30c'); rr(ctx, x, top, bw, hh, [3, 3, 3, 3]); ctx.fill();
      if (i < n - 1) { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(x + bw, Math.round(y2) + 0.5); ctx.lineTo(padL + slot * (i + 1.5) - bw / 2, Math.round(y2) + 0.5); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = TOK.text; ctx.font = 'bold 9px "IBM Plex Mono", ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(it.total ? fmtNum(it.to, 0) : (it.v > 0 ? '+' : '') + fmtNum(it.v, 0), x + bw / 2, top - 3);
      ctx.fillStyle = TOK.text2; ctx.font = '9px "IBM Plex Sans", system-ui'; ctx.textBaseline = 'top'; wrapText(ctx, it.l, x + bw / 2, padT + ch + 5, slot - 4, 10);
      rects.push({ x, y: top, w: bw, h: hh, i, si: 0 });
    });
    canvas._hit = { kind: 'bars', rects, labels: items.map(i => i.l), series: [{ name: spec.unit || 'M€', data: items.map(i => i.total ? i.to : i.v) }], dec: 0, unit: spec.unit || '' };
    bindHover(canvas);
  }

  /* ------------------------------------------------ Sparkline ----- */
  function spark(canvas, data, opts) {
    const { ctx, w, h } = setup(canvas); const n = data.length; const mn = Math.min(...data), mx = Math.max(...data); const span = (mx - mn) || 1;
    const X = i => 2 + i * (w - 4) / (n - 1), Y = v => h - 3 - (v - mn) / span * (h - 8); const split = opts.splitAt; const col = opts.color || '#4fb3d9';
    if (opts.target != null && opts.target >= mn - span * 0.2 && opts.target <= mx + span * 0.2) { const ty = Math.max(1, Math.min(h - 1, Y(opts.target))); ctx.strokeStyle = TOK.target; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(2, ty + 0.5); ctx.lineTo(w - 2, ty + 0.5); ctx.stroke(); ctx.setLineDash([]); }
    ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.strokeStyle = col;
    ctx.beginPath(); for (let i = 0; i <= Math.min(split, n - 1); i++) i ? ctx.lineTo(X(i), Y(data[i])) : ctx.moveTo(X(i), Y(data[i])); ctx.stroke();
    if (split < n - 1) { ctx.setLineDash([3, 3]); ctx.globalAlpha = 0.7; ctx.beginPath(); for (let i = split; i < n; i++) i === split ? ctx.moveTo(X(i), Y(data[i])) : ctx.lineTo(X(i), Y(data[i])); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
    const a = opts.asof == null ? n - 1 : opts.asof; ctx.fillStyle = TOK.surface; ctx.beginPath(); ctx.arc(X(a), Y(data[a]), 4, 0, 7); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(a), Y(data[a]), 2.5, 0, 7); ctx.fill();
  }

  /* ------------------------------------------------ Survol -------- */
  function bindHover(canvas) {
    if (canvas._bound) return; canvas._bound = true;
    canvas.addEventListener('pointermove', (e) => {
      const hit = canvas._hit; if (!hit) return; const r = canvas.getBoundingClientRect(); const sx = r.width / (canvas.width / (canvas._dprScale || 1)); void sx;
      const px = (e.clientX - r.left) / r.width * canvas.clientWidth, py = (e.clientY - r.top) / r.height * canvas.clientHeight;
      // le canvas est mis à l'échelle par le mur : on travaille en coordonnées logiques via les proportions
      const lw = canvas.getBoundingClientRect().width; const scale = lw / (canvas._logicalW || lw); void scale;
      let html = null;
      if (hit.kind === 'line') { const lx = (e.clientX - r.left) / r.width; const i = Math.max(0, Math.min(hit.n - 1, Math.round((lx * (canvas._w || r.width) - hit.padL) / hit.cw * (hit.n - 1)))); html = `<b>${hit.labels[i]}</b>` + hit.series.map(s => `<div><span class="k" style="background:${s.neutral ? TOK.neutral : (s.color || '#4fb3d9')}"></span>${s.name} : <b>${fmtNum(s.data[i], hit.dec)}</b> ${hit.unit}</div>`).join(''); }
      else { const lx = (e.clientX - r.left) / r.width * (canvas._w || r.width), ly = (e.clientY - r.top) / r.height * (canvas._h || r.height); const hh = hit.rects.find(q => lx >= q.x - 2 && lx <= q.x + q.w + 2 && ly >= q.y - 2 && ly <= q.y + q.h + 2) || hit.rects.reduce((b, q) => Math.abs(q.x + q.w / 2 - lx) < Math.abs((b ? b.x + b.w / 2 : -1e9) - lx) ? q : b, null); if (hh) html = `<b>${hit.labels[hh.i]}</b>` + hit.series.map(s => `<div><span class="k" style="background:${s.neutral ? TOK.neutral : (s.color || '#4fb3d9')}"></span>${s.name} : <b>${fmtNum(s.data[hh.i], hit.dec)}</b> ${hit.unit}</div>`).join(''); }
      if (html) showTip(e.clientX, e.clientY, html); else hideTip();
      void px; void py;
    });
    canvas.addEventListener('pointerleave', hideTip);
  }
  // le module retient la taille logique utilisée au dessin
  const _setup = setup; setup = function (canvas) { const r = _setup(canvas); canvas._w = r.w; canvas._h = r.h; return r; };

  function rr(ctx, x, y, w, h, rad) { const [a, b, c, d] = rad; ctx.beginPath(); ctx.moveTo(x + a, y); ctx.lineTo(x + w - b, y); ctx.quadraticCurveTo(x + w, y, x + w, y + b); ctx.lineTo(x + w, y + h - c); ctx.quadraticCurveTo(x + w, y + h, x + w - c, y + h); ctx.lineTo(x + d, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - d); ctx.lineTo(x, y + a); ctx.quadraticCurveTo(x, y, x + a, y); ctx.closePath(); }
  function wrapText(ctx, text, x, y, maxW, lh) { const words = text.split(' '); let line = ''; let yy = y; for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, yy); line = wd; yy += lh; } else line = t; } ctx.fillText(line, x, yy); }

  WALL.charts = { line, bars, bridge, spark, fmtNum, TOK, hideTip };
})();
