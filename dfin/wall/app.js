/* =====================================================================
   Mur de pilotage — application : navigation zoomable (mur → écran →
   indicateur), palette de commandes, clavier, curseur temporel, filtre
   par ligne, alertes, calendrier, présentation, comparaison, vues.
   ===================================================================== */
'use strict';
(function () {
  const WALL = window.WALL; const C = WALL.charts; const M = WALL.META; const MONTHS = WALL.MONTHS; const RT = M.realizedThrough;
  const $ = (id) => document.getElementById(id); const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SW = 760, SH = 470, GAP = 40; const COLS = 3; const WALL_W = COLS * SW + (COLS - 1) * GAP, WALL_H = 3 * SH + 2 * GAP; const INSP_W = 400;
  const TODAY = new Date(2026, 8, 12);
  const ORDER = WALL.SCREENS.slice().sort((a, b) => (a.pos[1] - b.pos[1]) || (a.pos[0] - b.pos[0]));
  const SCREEN = Object.fromEntries(WALL.SCREENS.map(s => [s.id, s]));
  const KPI = {}; for (const s of WALL.SCREENS) for (const k of s.kpis) if (!k.ref) KPI[k.id] = { k, s };
  const LINE = Object.fromEntries(WALL.LINES.map(l => [l.id, l]));

  const state = { view: 'wall', screen: null, kpi: null, asof: RT, line: null, focus: 0, kfocus: 0, free: null };
  const ui = { inspector: false, drawer: null, palette: false, help: false, compare: null, present: null, playing: null, mobile: false };
  let cur = { s: 1, tx: 0, ty: 0 };

  /* ------------------------------------------------ Formats ------- */
  const n = (v, d) => Number(v).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
  function fmt(v, f) {
    if (v == null || isNaN(v)) return '—';
    switch (f) {
      case 'meur': return n(v, 0) + ' M€'; case 'meur1': return n(v, 1) + ' M€'; case 'mdeur': case 'mdeur1': return n(v, 1) + ' Md€'; case 'keur': return n(v, 0) + ' k€';
      case 'pct': return n(v, 0) + ' %'; case 'pct1': return n(v, 1) + ' %'; case 'pctsigned': return (v > 0 ? '+' : '') + n(v, 0) + ' %'; case 'ratepct': return n(v, 2) + ' %';
      case 'days': return n(v, 0) + ' j'; case 'months': return n(v, 1) + ' mois'; case 'frac19': return n(v, 0) + ' / 19'; case 'frac7': return n(v, 0) + ' / 7'; case 'frac45': return n(v, 0) + ' / 45';
      default: return n(v, 0);
    }
  }
  function fmtDelta(d, f) {
    if (d == null || isNaN(d)) return ''; const sign = d > 0 ? '+' : d < 0 ? '−' : '±'; const a = Math.abs(d);
    if (/pct|ratepct/.test(f)) return sign + n(a, f === 'ratepct' ? 2 : (a < 1 ? 1 : 0)) + ' pt'; if (f === 'mdeur' || f === 'mdeur1' || f === 'meur1' || f === 'months') return sign + n(a, 1);
    return sign + n(a, 0);
  }
  const dec = (f) => /mdeur|meur1|months|pct1/.test(f) ? 1 : f === 'ratepct' ? 2 : 0;
  function unitOf(f) { return { meur: 'M€', meur1: 'M€', mdeur: 'Md€', mdeur1: 'Md€', keur: 'k€', pct: '%', pct1: '%', pctsigned: '%', ratepct: '%', days: 'j', months: 'mois' }[f] || ''; }

  /* ------------------------------------------------ Modèle -------- */
  function resolve(kdef) { const base = KPI[kdef.ref || kdef.id]; return Object.assign({}, base.k, { label: kdef.label || base.k.label, homeScreen: base.s, viaRef: !!kdef.ref, id: base.k.id }); }
  function seriesOf(k) { if (state.line && k.byLine) return k.byLine[state.line]; return k.series; }
  function valueOf(k) { const na = !!(state.line && !k.byLine); const s = seriesOf(k); const v = s[state.asof]; const prev = state.asof > 0 ? s[state.asof - 1] : null; return { v, prev, delta: prev == null ? null : v - prev, na, forecast: state.asof > RT }; }
  function statusOf(k, v) {
    if (k.target == null || v == null || k.good === 'none') return 'none';
    if (k.good === 'up') return v >= k.target ? 'good' : (v >= k.target * 0.9 ? 'warning' : 'serious');
    if (k.good === 'down') return v <= k.target ? 'good' : (v <= k.target * 1.1 ? 'warning' : 'serious');
    if (k.good === 'range') { const e = Math.abs(v - k.target) / (Math.abs(k.target) || 1); return e <= 0.05 ? 'good' : e <= 0.1 ? 'warning' : 'serious'; }
    return 'none';
  }
  function deltaTone(k, d) { if (d == null || d === 0 || k.good === 'none' || k.good === 'range') return 'flat'; return (d > 0) === (k.good === 'up') ? 'up-good' : 'up-bad'; }
  function screenAlerts(sid) { return WALL.ALERTS.filter(a => a.screen === sid && (!state.line || !a.line || a.line === state.line)); }
  const SEV_RANK = { critical: 0, serious: 1, warning: 2, good: 3 };

  /* ------------------------------------------------ Construction -- */
  function buildScreen(s, opts) {
    opts = opts || {}; const el = document.createElement('section'); el.className = 'screen'; el.dataset.id = s.id; el.style.setProperty('--c', s.color);
    if (!opts.compare) { el.style.left = (s.pos[0] - 1) * (SW + GAP) + 'px'; el.style.top = (s.pos[1] - 1) * (SH + GAP) + 'px'; }
    const idx = ORDER.indexOf(s) + 1;
    el.innerHTML = `<header class="sc-head"><span class="sc-num">${idx}</span><div class="sc-titles"><h2>${esc(s.title)}</h2><span class="sc-meta">${esc(s.unit)} · ${esc(s.owner)}</span></div><span class="sc-alerts"></span><span class="sc-fresh">MAJ ${M.updated}</span></header>
      <div class="sc-body"><div class="kpis ${s.kpis.length > 6 ? 'four' : ''}">${s.kpis.map(kd => { const k = resolve(kd); return `<button class="kpi" data-kpi="${k.id}" data-screen="${s.id}" data-ref="${kd.ref ? '1' : ''}" type="button"><span class="k-label">${esc(k.label)}</span><span class="k-value">—</span><span class="k-delta"></span><canvas class="spark" width="100" height="22"></canvas><span class="k-target"></span></button>`; }).join('')}</div>
      <div class="charts">${s.charts.map((c, i) => c.type === 'matrix' ? `<figure class="matrix-fig"><figcaption>${esc(c.title)}</figcaption><div class="matrix" data-chart="${i}"></div></figure>` : `<figure><figcaption>${esc(c.title)}</figcaption><canvas data-chart="${i}"></canvas></figure>`).join('')}</div></div>`;
    return el;
  }
  function refreshScreen(el) {
    const s = SCREEN[el.dataset.id];
    el.querySelectorAll('.kpi').forEach(tile => {
      const k = resolve({ id: tile.dataset.kpi, ref: tile.dataset.ref ? tile.dataset.kpi : undefined, label: tile.querySelector('.k-label').textContent });
      const { v, delta, na, forecast } = valueOf(k); const st = na ? 'none' : statusOf(k, v);
      tile.dataset.status = st; tile.classList.toggle('na', na); tile.classList.toggle('forecast', forecast);
      tile.querySelector('.k-value').textContent = na ? 'global' : fmt(v, k.fmt);
      const dEl = tile.querySelector('.k-delta'); dEl.textContent = na ? 'pas de ventilation par ligne' : (delta == null ? '' : fmtDelta(delta, k.fmt) + ' vs ' + MONTHS[state.asof - 1]); dEl.dataset.tone = na ? 'flat' : deltaTone(k, delta);
      tile.querySelector('.k-target').textContent = k.target != null ? ((k.targetLabel || 'cible') + ' ' + fmt(k.target, k.fmt)) + (forecast ? ' · prévision' : '') : (forecast ? 'prévision' : '');
      const sp = tile.querySelector('.spark'); if (!na) C.spark(sp, seriesOf(k), { splitAt: RT, asof: state.asof, color: (k.homeScreen || s).color, target: k.target }); else { sp.getContext('2d').clearRect(0, 0, sp.width, sp.height); }
    });
    const al = screenAlerts(s.id); const counts = { critical: 0, serious: 0, warning: 0 }; al.forEach(a => { if (counts[a.sev] != null) counts[a.sev]++; });
    el.querySelector('.sc-alerts').innerHTML = Object.entries(counts).filter(([, c]) => c).map(([sev, c]) => `<i class="dot ${sev}" title="${c} alerte(s) ${sev}">${c}</i>`).join('');
    el.querySelectorAll('[data-chart]').forEach(node => drawChart(node, s.charts[+node.dataset.chart], s));
  }
  function drawChart(node, c, s) {
    const color = s.color; const asof = state.asof;
    if (c.type === 'matrix') { return drawMatrix(node, c); }
    if (c.type === 'bridge') { return C.bridge(node, { steps: c.steps, unit: 'M€' }); }
    if (c.ref) {
      const k = KPI[c.ref].k; const data = seriesOf(k); const lineCol = state.line && k.byLine ? LINE[state.line].color : color;
      if (c.byLineCompare) {
        const labels = WALL.LINES.map(l => l.id); const est = WALL.LINES.map(l => k.byLine[l.id][asof]); const obj = WALL.LINES.map(l => c.byLineCompare[l.id]);
        return C.bars(node, { labels, series: [{ name: 'Objectif', data: obj, neutral: true }, { name: 'Estimé ' + MONTHS[asof], data: est, color }], highlight: state.line ? labels.indexOf(state.line) : null, dec: 1, unit: 'Md€' });
      }
      if (c.type === 'line') return C.line(node, { labels: MONTHS, series: [{ name: k.label, data, color: lineCol }], target: k.target, targetLabel: k.targetLabel, splitAt: RT, asof, dec: dec(k.fmt), unit: unitOf(k.fmt) });
      return C.bars(node, { labels: MONTHS, series: [{ name: k.label, data, color: lineCol }], asof, splitAt: RT, dec: dec(k.fmt), unit: unitOf(k.fmt) });
    }
    const series = c.series.map(sr => Object.assign({}, sr, { color }));
    const highlight = c.lineKeys && state.line ? c.labels.indexOf(state.line) : null;
    if (c.type === 'line') return C.line(node, { labels: c.labels, series, splitAt: c.labels === MONTHS ? RT : null, asof: c.labels === MONTHS ? asof : null, dec: 0 });
    return C.bars(node, { labels: c.labels, series, highlight, dec: c.series[0].data.some(v => v % 1) ? 1 : 0 });
  }
  function drawMatrix(node, c) {
    const cells = []; for (let g = 4; g >= 1; g--) for (let p = 1; p <= 4; p++) { const pts = c.points.filter(x => x.p === p && x.g === g); const crit = p * g; const lvl = crit >= 12 ? 4 : crit >= 8 ? 3 : crit >= 4 ? 2 : 1; cells.push(`<div class="mcell l${lvl}" title="P${p} × G${g} = ${crit}">${pts.map(x => `<span>${esc(x.l)}</span>`).join('')}</div>`); }
    node.innerHTML = `<div class="maxis-y"><b>Gravité</b><i>4</i><i>3</i><i>2</i><i>1</i></div><div class="mgrid">${cells.join('')}</div><div class="maxis-x"><i>1</i><i>2</i><i>3</i><i>4</i><b>Probabilité</b></div>`;
  }

  /* ------------------------------------------------ Mur & ZUI ----- */
  function buildWall() {
    const wall = $('wall'); wall.innerHTML = ''; wall.style.width = WALL_W + 'px'; wall.style.height = WALL_H + 'px';
    for (const s of WALL.SCREENS) wall.appendChild(buildScreen(s));
    wall.querySelectorAll('.kpi').forEach(t => t.addEventListener('click', (e) => { e.stopPropagation(); if (dragged) return; const k = resolve({ id: t.dataset.kpi, ref: t.dataset.ref ? t.dataset.kpi : undefined }); go({ view: 'screen', screen: t.dataset.ref ? k.homeScreen.id : t.dataset.screen, kpi: k.id }); }));
    wall.querySelectorAll('.screen').forEach(sc => { sc.addEventListener('click', (e) => { if (dragged) return; if (state.view === 'wall' || state.screen !== sc.dataset.id) go({ view: 'screen', screen: sc.dataset.id, kpi: null }); }); });
    refreshAll();
  }
  function refreshAll() { document.querySelectorAll('.screen').forEach(refreshScreen); if (ui.inspector && state.kpi) renderInspector(); renderTimeline(); renderHeader(); }

  function viewportSize() { const r = $('viewport').getBoundingClientRect(); return { vw: r.width, vh: r.height }; }
  function applyTransform(animate) {
    if (ui.mobile) return;
    const { vw, vh } = viewportSize(); let t;
    if (state.free) t = state.free;
    else if (state.view === 'wall') { const s = Math.min((vw - 48) / WALL_W, (vh - 48) / WALL_H); t = { s, tx: (vw - WALL_W * s) / 2, ty: (vh - WALL_H * s) / 2 }; }
    else { const sc = SCREEN[state.screen]; const left = (sc.pos[0] - 1) * (SW + GAP), top = (sc.pos[1] - 1) * (SH + GAP); const availW = vw - (ui.inspector ? INSP_W : 0) - 40; const s = Math.min(availW / SW, (vh - 40) / SH, 1.35); t = { s, tx: (availW - SW * s) / 2 + 20 - left * s, ty: (vh - SH * s) / 2 - top * s }; }
    const st = $('stage'); st.style.transition = animate === false ? 'none' : ''; st.style.transform = `translate(${t.tx}px, ${t.ty}px) scale(${t.s})`; cur = t;
    document.body.classList.toggle('zoomed', t.s > 0.75);
  }
  // molette, glisser, pincer
  let dragged = false, drag = null; const pointers = new Map(); let pinch = null;
  function initZui() {
    const vp = $('viewport');
    vp.addEventListener('wheel', (e) => { if (ui.mobile) return; e.preventDefault(); const f = Math.exp(-e.deltaY * 0.0015); const r = vp.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top; const s = Math.max(0.12, Math.min(2.5, cur.s * f)); const k = s / cur.s; state.free = { s, tx: mx - (mx - cur.tx) * k, ty: my - (my - cur.ty) * k }; applyTransform(false); }, { passive: false });
    vp.addEventListener('pointerdown', (e) => { if (ui.mobile) return; if (e.target.closest('#minimap, #hint')) return; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); vp.setPointerCapture(e.pointerId); if (pointers.size === 1) { drag = { x: e.clientX, y: e.clientY, tx: cur.tx, ty: cur.ty }; dragged = false; } else if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: cur.s, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, tx: cur.tx, ty: cur.ty }; drag = null; } });
    vp.addEventListener('pointermove', (e) => { if (!pointers.has(e.pointerId)) return; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size === 2) { const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const s = Math.max(0.12, Math.min(2.5, pinch.s * d / pinch.d)); const r = vp.getBoundingClientRect(); const mx = pinch.cx - r.left, my = pinch.cy - r.top; const k = s / pinch.s; state.free = { s, tx: mx - (mx - pinch.tx) * k, ty: my - (my - pinch.ty) * k }; applyTransform(false); dragged = true; return; }
      if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (!dragged && Math.hypot(dx, dy) > 5) dragged = true; if (dragged) { state.free = { s: cur.s, tx: drag.tx + dx, ty: drag.ty + dy }; applyTransform(false); } } });
    const up = (e) => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; if (pointers.size === 0) { drag = null; setTimeout(() => { dragged = false; }, 0); } };
    vp.addEventListener('pointerup', up); vp.addEventListener('pointercancel', up);
    vp.addEventListener('dblclick', (e) => { if (e.target.closest('.screen')) return; state.free = null; applyTransform(); });
    window.addEventListener('resize', () => { checkMobile(); applyTransform(false); });
  }
  function checkMobile() { const m = window.innerWidth < 720; if (m !== ui.mobile) { ui.mobile = m; document.body.classList.toggle('mobile', m); if (m) $('stage').style.transform = 'none'; else applyTransform(false); if (m) requestAnimationFrame(() => document.querySelectorAll('.screen').forEach(refreshScreen)); } }

  /* ------------------------------------------------ Navigation ---- */
  function hashOf(s) { let h = s.view === 'wall' ? '#/wall' : `#/s/${s.screen}` + (s.kpi ? `/k/${s.kpi}` : ''); const q = []; if (s.asof !== RT) q.push('asof=' + s.asof); if (s.line) q.push('line=' + s.line); return h + (q.length ? '?' + q.join('&') : ''); }
  function parseHash() {
    const h = location.hash || '#/wall'; const [path, qs] = h.split('?'); const q = new URLSearchParams(qs || ''); const parts = path.replace(/^#\/?/, '').split('/');
    const next = { view: 'wall', screen: null, kpi: null, asof: state.asof, line: state.line };
    if (parts[0] === 's' && SCREEN[parts[1]]) { next.view = 'screen'; next.screen = parts[1]; if (parts[2] === 'k' && KPI[parts[3]]) next.kpi = parts[3]; }
    if (q.has('asof')) { const a = parseInt(q.get('asof')); if (a >= 0 && a < 12) next.asof = a; } else next.asof = RT;
    next.line = q.has('line') && LINE[q.get('line')] ? q.get('line') : null;
    return next;
  }
  function go(patch) { const s = Object.assign({}, state, patch); if (patch.view === 'wall') { s.screen = null; s.kpi = null; } const h = hashOf(s); if (h === location.hash) render(s); else location.hash = h; }
  function render(next) {
    const prevAsof = state.asof, prevLine = state.line, prevScreen = state.screen, prevKpi = state.kpi;
    Object.assign(state, next); state.free = null;
    if (state.screen) state.focus = ORDER.indexOf(SCREEN[state.screen]);
    ui.inspector = !!state.kpi; $('inspector').classList.toggle('hidden', !ui.inspector);
    document.querySelectorAll('.screen').forEach(el => { el.classList.toggle('active', el.dataset.id === state.screen); el.classList.toggle('dim', state.view === 'screen' && el.dataset.id !== state.screen); });
    document.querySelectorAll('.kpi').forEach(t => t.classList.toggle('selected', !!state.kpi && t.dataset.kpi === state.kpi && (t.dataset.screen === state.screen || t.dataset.ref === '1' && KPI[t.dataset.kpi].s.id === state.screen)));
    document.body.dataset.view = state.view;
    if (prevAsof !== state.asof || prevLine !== state.line) refreshAll(); else { if (ui.inspector && (prevKpi !== state.kpi || prevScreen !== state.screen)) renderInspector(); renderHeader(); }
    renderCrumbs(); renderMinimap(); renderHint(); applyTransform();
    if (ui.mobile) { const el = state.screen ? document.querySelector(`.screen[data-id="${state.screen}"]`) : null; document.body.classList.toggle('solo', !!el); if (el) requestAnimationFrame(() => { refreshScreen(el); window.scrollTo({ top: 0 }); }); }
    if (state.kpi && prevKpi !== state.kpi) { const t = document.querySelector(`.screen[data-id="${state.screen}"] .kpi[data-kpi="${state.kpi}"]`); if (t) { t.classList.remove('pulse'); void t.offsetWidth; t.classList.add('pulse'); state.kfocus = [...t.parentElement.children].indexOf(t); } }
  }
  function nextScreen(d) { const i = state.screen ? ORDER.indexOf(SCREEN[state.screen]) : state.focus; const j = (i + d + ORDER.length) % ORDER.length; if (state.view === 'wall') { state.focus = j; renderMinimap(); focusWall(); } else go({ view: 'screen', screen: ORDER[j].id, kpi: null }); }
  function focusWall() { document.querySelectorAll('.screen').forEach((el, i) => el.classList.toggle('focus', state.view === 'wall' && ORDER[i] && el.dataset.id === ORDER[state.focus].id)); }

  /* ------------------------------------------------ En-tête ------- */
  function renderHeader() {
    $('asof-chip').innerHTML = `<b>${MONTHS[state.asof]} ${M.year}</b>${state.asof > RT ? ' · prévision' : (state.asof === RT ? ' · dernier réel' : ' · réel')}`;
    const sel = $('line-sel'); if (sel.value !== (state.line || '')) sel.value = state.line || '';
    $('line-chip').classList.toggle('on', !!state.line);
  }
  function renderCrumbs() {
    const c = $('crumbs'); const parts = [`<a href="#/wall" data-go="wall">Mur</a>`];
    if (state.screen) { const s = SCREEN[state.screen]; parts.push(`<a href="${hashOf({ view: 'screen', screen: s.id, kpi: null, asof: state.asof, line: state.line })}"><i style="background:${s.color}"></i>${esc(s.title)}</a>`); }
    if (state.kpi) parts.push(`<span>${esc(KPI[state.kpi].k.label)}</span>`);
    c.innerHTML = parts.join('<em>›</em>');
  }
  function renderMinimap() {
    const mm = $('minimap'); mm.innerHTML = ORDER.map((s, i) => `<button type="button" data-id="${s.id}" class="${s.id === state.screen ? 'on' : ''} ${state.view === 'wall' && i === state.focus ? 'focus' : ''}" style="--c:${s.color}" title="${esc(s.title)} (${i + 1})"><b>${i + 1}</b>${esc(s.short)}</button>`).join('');
    mm.querySelectorAll('button').forEach(b => b.addEventListener('click', () => go({ view: 'screen', screen: b.dataset.id, kpi: null })));
  }
  function renderHint() {
    const h = $('hint'); if (ui.present) { h.innerHTML = '<kbd>→</kbd> suivant · <kbd>←</kbd> précédent · <kbd>Échap</kbd> quitter'; return; }
    h.innerHTML = state.view === 'wall' ? '<kbd>↑↓←→</kbd> choisir · <kbd>↵</kbd> ouvrir · <kbd>1</kbd>–<kbd>9</kbd> écran · <kbd>/</kbd> rechercher · molette : zoom · <kbd>?</kbd> aide'
      : state.kpi ? '<kbd>←→</kbd> indicateur · <kbd>⇧←→</kbd> écran · <kbd>Échap</kbd> fermer · <kbd>X</kbd> comparer · <kbd>B</kbd> enregistrer la vue'
      : '<kbd>←→</kbd> indicateur · <kbd>↵</kbd> détail · <kbd>⇧←→</kbd> écran · <kbd>Échap</kbd> mur · <kbd>,</kbd> <kbd>.</kbd> mois';
  }

  /* ------------------------------------------------ Inspecteur ---- */
  function renderInspector() {
    const box = $('inspector'); const { k, s } = KPI[state.kpi]; const kk = Object.assign({}, k, { homeScreen: s }); const { v, delta, na, forecast } = valueOf(kk); const st = na ? 'none' : statusOf(kk, v);
    const kIdx = s.kpis.findIndex(x => (x.ref || x.id) === k.id); const total = s.kpis.length;
    const rel = WALL.ALERTS.filter(a => a.kpi === k.id); const ev = WALL.CALENDAR.filter(e => e.s === s.id).filter(e => new Date(e.d) >= TODAY).slice(0, 3);
    const stLabel = { good: 'conforme à la cible', warning: 'à surveiller', serious: 'hors cible', none: '' }[st];
    box.innerHTML = `<div class="in-head"><div><span class="chip" style="background:${s.color}">${esc(s.short)}</span> <span class="in-owner">${esc(s.owner)} · ${esc(k.source || M.source)}</span></div><div class="in-nav"><button type="button" id="in-prev" title="Indicateur précédent (←)">‹</button><span>${kIdx + 1}/${total}</span><button type="button" id="in-next" title="Indicateur suivant (→)">›</button><button type="button" id="in-close" title="Fermer (Échap)">✕</button></div></div>
      <h3>${esc(k.label)}</h3>
      <div class="in-hero" data-status="${st}"><div class="in-value">${na ? '<span class="na">Pas de ventilation par ligne</span>' : fmt(v, k.fmt)}</div><div class="in-sub">${na ? '' : `<span class="delta" data-tone="${deltaTone(kk, delta)}">${fmtDelta(delta, k.fmt)} vs ${MONTHS[Math.max(0, state.asof - 1)]}</span>`}${k.target != null ? `<span class="target">${esc(k.targetLabel || 'cible')} ${fmt(k.target, k.fmt)}</span>` : ''}${stLabel ? `<span class="st">${stLabel}</span>` : ''}${forecast ? '<span class="fc">prévision</span>' : ''}</div></div>
      <figure><figcaption>Trajectoire ${M.year} — réel puis prévision${state.line && k.byLine ? ' · ' + esc(LINE[state.line].name) : ''}</figcaption><canvas id="in-chart"></canvas></figure>
      ${k.byLine ? `<h4>Par ligne · ${MONTHS[state.asof]}</h4><table class="lines">${WALL.LINES.map(l => { const lv = k.byLine[l.id][state.asof]; const mx = Math.max(...WALL.LINES.map(x => k.byLine[x.id][state.asof])); const pv = state.asof ? k.byLine[l.id][state.asof - 1] : null; return `<tr class="${state.line === l.id ? 'on' : ''}" data-line="${l.id}"><td><i style="background:${l.color}"></i>${esc(l.name)}</td><td class="num">${fmt(lv, k.fmt)}</td><td class="num delta" data-tone="${deltaTone(kk, pv == null ? null : lv - pv)}">${pv == null ? '' : fmtDelta(lv - pv, k.fmt)}</td><td class="bar"><b style="width:${mx ? lv / mx * 100 : 0}%;background:${l.color}"></b></td></tr>`; }).join('')}</table><p class="tiny">Cliquer une ligne applique le filtre à tout le mur.</p>` : ''}
      ${k.comment ? `<h4>Lecture</h4><p class="comment">${esc(k.comment)}</p>` : ''}
      ${rel.length ? `<h4>Alertes liées</h4><ul class="in-alerts">${rel.map(a => `<li class="${a.sev}"><i></i>${esc(a.m)}</li>`).join('')}</ul>` : ''}
      ${ev.length ? `<h4>Prochaines échéances de l'unité</h4><ul class="in-ev">${ev.map(e => `<li><b>${e.d.slice(8)}/${e.d.slice(5, 7)}</b> ${esc(e.n)}</li>`).join('')}</ul>` : ''}
      <div class="in-actions"><button type="button" id="in-link">Copier le lien</button><button type="button" id="in-save">Enregistrer la vue</button><button type="button" id="in-compare">Comparer l'écran…</button></div>
      <p class="tiny">Données fictives · dernière mise à jour ${M.updated} · source : ${esc(k.source || M.source)}</p>`;
    requestAnimationFrame(() => C.line($('in-chart'), { labels: MONTHS, series: [{ name: k.label, data: seriesOf(kk), color: state.line && k.byLine ? LINE[state.line].color : s.color }], target: k.target, targetLabel: k.targetLabel, splitAt: RT, asof: state.asof, dec: dec(k.fmt), unit: unitOf(k.fmt) }));
    $('in-close').onclick = () => go({ kpi: null }); $('in-prev').onclick = () => stepKpi(-1); $('in-next').onclick = () => stepKpi(1);
    $('in-link').onclick = () => copyLink(); $('in-save').onclick = () => saveView(); $('in-compare').onclick = () => openCompare(s.id, null);
    box.querySelectorAll('tr[data-line]').forEach(tr => tr.addEventListener('click', () => go({ line: state.line === tr.dataset.line ? null : tr.dataset.line })));
  }
  function stepKpi(d) { const s = SCREEN[state.screen]; const ids = s.kpis.map(x => x.ref || x.id); let i = ids.indexOf(state.kpi); if (i < 0) i = state.kfocus || 0; const j = (i + d + ids.length) % ids.length; const kd = s.kpis[j]; if (kd.ref) go({ view: 'screen', screen: KPI[kd.ref].s.id, kpi: kd.ref }); else go({ kpi: ids[j] }); }
  function moveKpiFocus(d) { const s = SCREEN[state.screen]; const tiles = [...document.querySelectorAll(`.screen[data-id="${s.id}"] .kpi`)]; if (state.kpi) return stepKpi(d); state.kfocus = ((state.kfocus || 0) + d + tiles.length) % tiles.length; tiles.forEach((t, i) => t.classList.toggle('focus', i === state.kfocus)); }

  /* ------------------------------------------------ Tiroir -------- */
  function openDrawer(tab) { ui.drawer = tab; const d = $('drawer'); d.classList.remove('hidden'); d.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === tab)); renderDrawer(); }
  function closeDrawer() { ui.drawer = null; $('drawer').classList.add('hidden'); }
  function renderDrawer() {
    const body = $('drawer-body');
    if (ui.drawer === 'alerts') {
      const list = WALL.ALERTS.slice().sort((a, b) => SEV_RANK[a.sev] - SEV_RANK[b.sev]);
      body.innerHTML = `<p class="tiny">${list.filter(a => a.sev !== 'good').length} alertes actives · cliquer pour ouvrir l'indicateur concerné</p>` + list.map(a => { const s = SCREEN[a.screen]; return `<button type="button" class="al ${a.sev}" data-screen="${a.screen}" data-kpi="${a.kpi}" data-line="${a.line || ''}"><i></i><div><div class="al-m">${esc(a.m)}</div><div class="al-meta"><span class="chip" style="background:${s.color}">${esc(s.short)}</span> ${esc(KPI[a.kpi].k.label)}${a.line ? ' · ' + esc(LINE[a.line].name) : ''} · depuis le ${a.since.slice(8)}/${a.since.slice(5, 7)}</div></div></button>`; }).join('');
      body.querySelectorAll('.al').forEach(b => b.addEventListener('click', () => { go({ view: 'screen', screen: b.dataset.screen, kpi: b.dataset.kpi, line: b.dataset.line || state.line }); if (ui.mobile) closeDrawer(); }));
    } else {
      let lastM = ''; body.innerHTML = `<div class="legend">${Object.entries(WALL.CAL_TYPES).map(([, t]) => `<span><i style="background:${t.c}"></i>${t.n}</span>`).join('')}</div>` + WALL.CALENDAR.map(e => { const d = new Date(e.d); const m = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); const head = m !== lastM ? `<h4>${m}</h4>` : ''; lastM = m; const days = Math.round((d - TODAY) / 864e5); const s = SCREEN[e.s]; return head + `<button type="button" class="ev ${days <= 3 ? 'soon' : ''}" data-screen="${e.s}"><span class="ev-d"><b>${e.d.slice(8)}</b><i>${['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'][d.getDay()]}</i></span><span class="ev-b"><span class="ev-n">${esc(e.n)}</span><span class="ev-m"><i style="background:${WALL.CAL_TYPES[e.t].c}"></i>${WALL.CAL_TYPES[e.t].n} · <span class="chip" style="background:${s.color}">${esc(s.short)}</span> · ${days === 0 ? 'aujourd\'hui' : 'J+' + days}</span></span></button>`; }).join('');
      body.querySelectorAll('.ev').forEach(b => b.addEventListener('click', () => { go({ view: 'screen', screen: b.dataset.screen, kpi: null }); if (ui.mobile) closeDrawer(); }));
    }
  }

  /* ------------------------------------------------ Ligne de temps  */
  function renderTimeline() {
    const t = $('months'); t.innerHTML = MONTHS.map((m, i) => `<button type="button" class="${i === state.asof ? 'on' : ''} ${i > RT ? 'fc' : ''} ${i === RT ? 'today' : ''}" data-i="${i}" title="${m} ${M.year}${i > RT ? ' (prévision)' : i === RT ? ' (dernier mois réel)' : ''}">${m}</button>`).join('');
    t.querySelectorAll('button').forEach(b => b.addEventListener('click', () => go({ asof: +b.dataset.i })));
    const up = WALL.CALENDAR.filter(e => new Date(e.d) >= TODAY).slice(0, 5);
    $('upcoming').innerHTML = up.map(e => { const days = Math.round((new Date(e.d) - TODAY) / 864e5); return `<button type="button" data-screen="${e.s}" title="${esc(e.n)}"><b>J+${days}</b><i style="background:${WALL.CAL_TYPES[e.t].c}"></i>${esc(e.n)}</button>`; }).join('');
    $('upcoming').querySelectorAll('button').forEach(b => b.addEventListener('click', () => go({ view: 'screen', screen: b.dataset.screen, kpi: null })));
    $('play').classList.toggle('on', !!ui.playing);
  }
  function togglePlay() { if (ui.playing) { clearInterval(ui.playing); ui.playing = null; renderTimeline(); return; } let i = state.asof >= 11 ? -1 : state.asof; ui.playing = setInterval(() => { i++; if (i > 11) { togglePlay(); return; } go({ asof: i }); }, 900); renderTimeline(); }

  /* ------------------------------------------------ Palette ------- */
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function score(q, text) { const t = norm(text); if (!q) return 1; if (t.includes(q)) return 3 + (t.startsWith(q) ? 1 : 0); let i = 0; for (const ch of t) { if (ch === q[i]) i++; if (i === q.length) return 1; } return 0; }
  function items() {
    const out = [];
    ORDER.forEach((s, i) => out.push({ kind: 'Écran', title: `${i + 1} · ${s.title}`, sub: s.unit, key: s.title + ' ' + s.unit + ' ' + s.owner, run: () => go({ view: 'screen', screen: s.id, kpi: null }) }));
    for (const id in KPI) { const { k, s } = KPI[id]; out.push({ kind: 'Indicateur', title: k.label, sub: s.title, key: k.label + ' ' + s.title, run: () => go({ view: 'screen', screen: s.id, kpi: id }) }); }
    WALL.ALERTS.forEach(a => out.push({ kind: 'Alerte', title: a.m, sub: SCREEN[a.screen].title, key: a.m, sev: a.sev, run: () => go({ view: 'screen', screen: a.screen, kpi: a.kpi, line: a.line || state.line }) }));
    WALL.CALENDAR.forEach(e => out.push({ kind: 'Échéance', title: `${e.d.slice(8)}/${e.d.slice(5, 7)} · ${e.n}`, sub: SCREEN[e.s].title, key: e.n, run: () => go({ view: 'screen', screen: e.s, kpi: null }) }));
    WALL.LINES.forEach(l => out.push({ kind: 'Filtre', title: 'Ligne : ' + l.name, sub: 'filtre appliqué à tout le mur', key: 'filtre ligne ' + l.name + ' ' + l.id, run: () => go({ line: l.id }) }));
    out.push({ kind: 'Filtre', title: 'Toutes les lignes', sub: 'retirer le filtre', key: 'filtre toutes lignes retirer', run: () => go({ line: null }) });
    MONTHS.forEach((m, i) => out.push({ kind: 'Date', title: `Date de référence : ${m} ${M.year}${i > RT ? ' (prévision)' : ''}`, sub: 'curseur temporel', key: 'date mois ' + m, run: () => go({ asof: i }) }));
    out.push({ kind: 'Action', title: 'Vue mur', sub: 'W', key: 'vue mur accueil', run: () => go({ view: 'wall' }) });
    out.push({ kind: 'Action', title: 'Mode présentation COMEX', sub: 'P · 5 écrans commentés', key: 'presentation comex diaporama', run: () => startPresentation(WALL.PRESENTATION, 14000) });
    out.push({ kind: 'Action', title: 'Rotation automatique des écrans', sub: 'R · pour projection murale', key: 'rotation automatique projection', run: () => startPresentation(ORDER.map(s => ({ screen: s.id, note: s.intro })), 10000) });
    out.push({ kind: 'Action', title: 'Comparer deux écrans', sub: 'X', key: 'comparer cote a cote split', run: () => openCompare(state.screen || 'fin', null) });
    out.push({ kind: 'Action', title: 'Alertes', sub: 'A', key: 'alertes vigilance', run: () => openDrawer('alerts') });
    out.push({ kind: 'Action', title: 'Calendrier de gestion', sub: 'C', key: 'calendrier gestion echeances', run: () => openDrawer('calendar') });
    out.push({ kind: 'Action', title: 'Enregistrer la vue courante', sub: 'B', key: 'enregistrer vue favori bookmark', run: () => saveView() });
    out.push({ kind: 'Action', title: 'Copier le lien de la vue', sub: 'lien profond', key: 'copier lien partager url', run: () => copyLink() });
    out.push({ kind: 'Action', title: 'Plein écran', sub: 'F', key: 'plein ecran fullscreen', run: () => toggleFullscreen() });
    out.push({ kind: 'Action', title: 'Aide clavier', sub: '?', key: 'aide raccourcis clavier', run: () => toggleHelp(true) });
    views().forEach((v, i) => out.push({ kind: 'Vue enregistrée', title: v.name, sub: v.hash, key: 'vue ' + v.name, run: () => { location.hash = v.hash; }, del: i }));
    return out;
  }
  let palItems = [], palIdx = 0;
  function openPalette(prefill) { ui.palette = true; $('palette').classList.remove('hidden'); const inp = $('pal-input'); inp.value = prefill || ''; inp.focus(); searchPalette(); }
  function closePalette() { ui.palette = false; $('palette').classList.add('hidden'); }
  function searchPalette() {
    const q = norm($('pal-input').value.trim()); let scored = items().map(it => ({ it, sc: score(q, it.key + ' ' + it.title) })).filter(x => x.sc > 0); if (scored.some(x => x.sc >= 3)) scored = scored.filter(x => x.sc >= 3); palItems = scored.sort((a, b) => b.sc - a.sc).slice(0, 14).map(x => x.it);
    if (!q) palItems = palItems.filter(it => it.kind === 'Écran' || it.kind === 'Action' || it.kind === 'Vue enregistrée').slice(0, 14);
    palIdx = 0; renderPalette();
  }
  function renderPalette() {
    $('pal-list').innerHTML = palItems.map((it, i) => `<li class="${i === palIdx ? 'on' : ''}" data-i="${i}"><span class="pk ${it.sev || ''}">${it.kind}</span><span class="pt">${esc(it.title)}</span><span class="ps">${esc(it.sub || '')}</span>${it.del != null ? `<button type="button" class="pdel" data-del="${it.del}" title="Supprimer">✕</button>` : ''}</li>`).join('') || '<li class="empty">Aucun résultat</li>';
    $('pal-list').querySelectorAll('li[data-i]').forEach(li => { li.addEventListener('click', (e) => { if (e.target.closest('.pdel')) { const vs = views(); vs.splice(+e.target.dataset.del, 1); localStorage.setItem('wall.views', JSON.stringify(vs)); searchPalette(); return; } runPalette(+li.dataset.i); }); });
  }
  function runPalette(i) { const it = palItems[i]; if (!it) return; closePalette(); it.run(); }

  /* ------------------------------------------------ Présentation -- */
  function startPresentation(seq, dwell) {
    stopPresentation(); ui.present = { seq, dwell, i: -1, timer: null }; $('present').classList.remove('hidden'); document.body.classList.add('presenting'); presentStep(1);
  }
  function presentStep(d) {
    const p = ui.present; if (!p) return; p.i = (p.i + d + p.seq.length) % p.seq.length; const st = p.seq[p.i];
    go({ view: 'screen', screen: st.screen, kpi: st.kpi || null });
    $('pr-note').innerHTML = `<b>${p.i + 1}/${p.seq.length}</b> ${esc(st.note || '')}`; const bar = $('pr-bar'); bar.style.transition = 'none'; bar.style.width = '0%'; void bar.offsetWidth; bar.style.transition = `width ${p.dwell}ms linear`; bar.style.width = '100%';
    clearTimeout(p.timer); p.timer = setTimeout(() => presentStep(1), p.dwell); renderHint();
  }
  function stopPresentation() { if (!ui.present) return; clearTimeout(ui.present.timer); ui.present = null; $('present').classList.add('hidden'); document.body.classList.remove('presenting'); renderHint(); }

  /* ------------------------------------------------ Comparaison --- */
  function openCompare(a, b) {
    ui.compare = { a: a || ORDER[0].id, b: b || ORDER[(ORDER.indexOf(SCREEN[a || ORDER[0].id]) + 1) % ORDER.length].id }; $('compare').classList.remove('hidden');
    ['a', 'b'].forEach(side => { const sel = $('cmp-' + side); sel.innerHTML = ORDER.map(s => `<option value="${s.id}">${esc(s.title)}</option>`).join(''); sel.value = ui.compare[side]; sel.onchange = () => { ui.compare[side] = sel.value; renderPane(side); }; });
    renderPane('a'); renderPane('b');
  }
  function renderPane(side) {
    const pane = $('pane-' + side); pane.innerHTML = ''; const el = buildScreen(SCREEN[ui.compare[side]], { compare: true }); const wrap = document.createElement('div'); wrap.className = 'pane-wrap'; wrap.appendChild(el); pane.appendChild(wrap);
    requestAnimationFrame(() => { const r = pane.getBoundingClientRect(); const s = Math.min((r.width - 16) / SW, (window.innerHeight - 140) / SH); wrap.style.width = SW * s + 'px'; wrap.style.height = SH * s + 'px'; el.style.transform = `scale(${s})`; refreshScreen(el); });
    el.querySelectorAll('.kpi').forEach(t => t.addEventListener('click', () => { closeCompare(); const k = resolve({ id: t.dataset.kpi, ref: t.dataset.ref ? t.dataset.kpi : undefined }); go({ view: 'screen', screen: t.dataset.ref ? k.homeScreen.id : t.dataset.screen, kpi: k.id }); }));
  }
  function closeCompare() { ui.compare = null; $('compare').classList.add('hidden'); }

  /* ------------------------------------------------ Vues, liens --- */
  function views() { try { return JSON.parse(localStorage.getItem('wall.views') || '[]'); } catch (e) { return []; } }
  function saveView() { const name = window.prompt('Nom de la vue à enregistrer', (state.screen ? SCREEN[state.screen].title : 'Mur') + (state.kpi ? ' — ' + KPI[state.kpi].k.label : '') + ' · ' + MONTHS[state.asof] + (state.line ? ' · ' + state.line : '')); if (!name) return; const vs = views(); vs.push({ name, hash: location.hash || '#/wall' }); localStorage.setItem('wall.views', JSON.stringify(vs)); toast('Vue enregistrée : ' + name + ' (retrouvez-la dans la recherche).'); }
  function copyLink() { const url = location.href.split('#')[0] + (location.hash || '#/wall'); (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('Lien copié : ' + url), () => toast('Lien : ' + url)); }
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 3200); }
  function toggleFullscreen() { if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); else document.exitFullscreen(); }
  function toggleHelp(on) { ui.help = on == null ? !ui.help : on; $('help').classList.toggle('hidden', !ui.help); }

  /* ------------------------------------------------ Clavier ------- */
  function initKeys() {
    window.addEventListener('keydown', (e) => {
      const typing = e.target.matches('input, textarea, select'); const k = e.key;
      if (ui.palette) { if (k === 'Escape') { closePalette(); } else if (k === 'ArrowDown') { palIdx = Math.min(palItems.length - 1, palIdx + 1); renderPalette(); e.preventDefault(); } else if (k === 'ArrowUp') { palIdx = Math.max(0, palIdx - 1); renderPalette(); e.preventDefault(); } else if (k === 'Enter') { runPalette(palIdx); } return; }
      if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
      if (typing) return;
      if (k === '/') { e.preventDefault(); openPalette(); return; }
      if (ui.present) { if (k === 'ArrowRight' || k === ' ') { e.preventDefault(); presentStep(1); } else if (k === 'ArrowLeft') { presentStep(-1); } else if (k === 'Escape') stopPresentation(); return; }
      if (k === 'Escape') { if (ui.help) return toggleHelp(false); if (ui.compare) return closeCompare(); if (ui.drawer) return closeDrawer(); if (state.free) { state.free = null; return applyTransform(); } if (state.kpi) return go({ kpi: null }); if (state.view === 'screen') return go({ view: 'wall' }); return; }
      const lk = k.toLowerCase();
      if (/^[1-9]$/.test(k)) { const s = ORDER[+k - 1]; if (s) go({ view: 'screen', screen: s.id, kpi: null }); return; }
      if (k === '0' || lk === 'w') return go({ view: 'wall' });
      if (lk === 'a') return ui.drawer === 'alerts' ? closeDrawer() : openDrawer('alerts');
      if (lk === 'c') return ui.drawer === 'calendar' ? closeDrawer() : openDrawer('calendar');
      if (lk === 'p') return startPresentation(WALL.PRESENTATION, 14000);
      if (lk === 'r') return startPresentation(ORDER.map(s => ({ screen: s.id, note: s.intro })), 10000);
      if (lk === 'x') return ui.compare ? closeCompare() : openCompare(state.screen || 'fin', null);
      if (lk === 'b') return saveView();
      if (lk === 'f') return toggleFullscreen();
      if (k === '?' || lk === 'h') return toggleHelp();
      if (lk === 'l') { const ids = [null, ...WALL.LINES.map(l => l.id)]; return go({ line: ids[(ids.indexOf(state.line) + 1) % ids.length] }); }
      if (k === ',' ) return go({ asof: Math.max(0, state.asof - 1) });
      if (k === '.') return go({ asof: Math.min(11, state.asof + 1) });
      if (k === ' ') { e.preventDefault(); return togglePlay(); }
      if (k === 'Enter') { if (state.view === 'wall') return go({ view: 'screen', screen: ORDER[state.focus].id, kpi: null }); if (!state.kpi) { const s = SCREEN[state.screen]; const kd = s.kpis[state.kfocus || 0]; if (kd) return kd.ref ? go({ view: 'screen', screen: KPI[kd.ref].s.id, kpi: kd.ref }) : go({ kpi: kd.id }); } return; }
      if (k.startsWith('Arrow')) {
        e.preventDefault();
        if (state.view === 'wall') { const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -COLS, ArrowDown: COLS }[k]; state.focus = (state.focus + d + ORDER.length) % ORDER.length; renderMinimap(); focusWall(); return; }
        if (e.shiftKey || k === 'ArrowUp' || k === 'ArrowDown') return nextScreen(k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 1);
        return moveKpiFocus(k === 'ArrowLeft' ? -1 : 1);
      }
    });
  }

  /* ------------------------------------------------ Démarrage ----- */
  function init() {
    checkMobile(); buildWall(); initZui(); initKeys();
    $('line-sel').innerHTML = '<option value="">Toutes les lignes</option>' + WALL.LINES.map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('');
    $('line-sel').addEventListener('change', (e) => go({ line: e.target.value || null }));
    $('btn-search').onclick = () => openPalette(); $('btn-alerts').onclick = () => ui.drawer === 'alerts' ? closeDrawer() : openDrawer('alerts'); $('btn-cal').onclick = () => ui.drawer === 'calendar' ? closeDrawer() : openDrawer('calendar');
    $('btn-present').onclick = () => startPresentation(WALL.PRESENTATION, 14000); $('btn-compare').onclick = () => openCompare(state.screen || 'fin', null); $('btn-save').onclick = () => saveView(); $('btn-full').onclick = () => toggleFullscreen(); $('btn-help').onclick = () => toggleHelp();
    $('btn-wall').onclick = () => go({ view: 'wall' }); $('drawer-close').onclick = closeDrawer; $('cmp-close').onclick = closeCompare; $('help-close').onclick = () => toggleHelp(false); $('pr-stop').onclick = stopPresentation; $('pr-next').onclick = () => presentStep(1); $('pr-prev').onclick = () => presentStep(-1);
    $('drawer').querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => openDrawer(b.dataset.tab)));
    $('pal-input').addEventListener('input', searchPalette); $('palette').addEventListener('click', (e) => { if (e.target === $('palette')) closePalette(); });
    $('play').onclick = togglePlay; $('asof-chip').onclick = () => $('timeline').classList.toggle('collapsed');
    $('crumbs').addEventListener('click', (e) => { const a = e.target.closest('a'); if (!a) return; e.preventDefault(); location.hash = a.getAttribute('href'); });
    $('help').addEventListener('click', (e) => { if (e.target === $('help')) toggleHelp(false); });
    const clock = () => { $('clock').textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }; clock(); setInterval(clock, 15000);
    window.addEventListener('hashchange', () => render(parseHash()));
    render(parseHash()); focusWall();
    requestAnimationFrame(() => applyTransform(false));
    if (!location.hash) history.replaceState(null, '', '#/wall');
    // premier passage : les canvases ont besoin de leur taille réelle
    setTimeout(() => refreshAll(), 60);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  WALL.app = { go, state, openPalette, startPresentation, openCompare, openDrawer };
})();
