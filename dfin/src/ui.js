/* =====================================================================
   Interface DOM : HUD, dialogue, panneaux (reporting, calendrier,
   cockpit, carnet, plan), toasts, intro, graphiques canvas.
   ===================================================================== */
'use strict';
(function () {
  const DFIN = window.DFIN;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const unitOf = (id) => DFIN.UNITS.find(u => u.id === id);
  const fmtDate = (d) => { const [y, m, dd] = d.split('-'); return dd + '/' + m + '/' + y; };
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const DAYS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

  const UI = {
    game: null, dialogOpen: false, panelOpen: false, typeTimer: null,

    init(game) {
      this.game = game;
      $('btn-close-panel').onclick = () => this.closePanel();
      $('btn-help').onclick = () => this.openPanel('help');
      $('btn-notebook').onclick = () => this.openPanel('notebook');
      $('btn-calendar').onclick = () => this.openPanel('calendar');
      $('btn-plan').onclick = () => this.openPanel('plan');
      $('btn-sound').onclick = () => { const on = DFIN.audio.toggle(); $('btn-sound').textContent = on ? '🔊' : '🔇'; };
      $('panel').addEventListener('click', (e) => { const b = e.target.closest('[data-open-report]'); if (b) this.openPanel('report', b.dataset.openReport); const f = e.target.closest('[data-cal-filter]'); if (f) this.openPanel('calendar', f.dataset.calFilter === 'all' ? null : f.dataset.calFilter); });
    },

    isOpen() { return this.dialogOpen || this.panelOpen; },

    /* ------------------------------------------------ Intro --------- */
    showIntro(onStart) {
      const o = $('intro'); o.classList.remove('hidden');
      $('btn-start').onclick = () => { o.classList.add('hidden'); onStart(); };
    },

    /* ------------------------------------------------ HUD ----------- */
    setPrompt(text) { const p = $('prompt'); if (!text) { p.classList.add('hidden'); return; } p.textContent = text; p.classList.remove('hidden'); },
    updateHud() {
      const g = this.game; $('clock').textContent = g.clockString();
      const m = g.mission; const tr = $('tracker');
      if (!m) { const next = g.nextMissionDef(); tr.innerHTML = next ? `<div class="tr-title">Prochaine mission</div><div class="tr-sub">Allez voir <b>${esc(g.personName(next.giver))}</b> (${esc(unitOf(g.personUnit(next.giver)).name)})</div>` : `<div class="tr-title">Journée bouclée</div><div class="tr-sub">Continuez à explorer le plateau.</div>`; return; }
      tr.innerHTML = `<div class="tr-title">${esc(m.def.title)} <span class="tr-dl">avant ${m.def.deadline}</span></div>` + m.def.items.map(it => `<div class="tr-item ${m.done[it.id] ? 'done' : ''}">${m.done[it.id] ? '✔' : '○'} ${esc(it.label)} <span class="tr-who">— ${esc(g.personName(it.who).split(' ')[0])}</span></div>`).join('') + (g.missionComplete() ? `<div class="tr-item ret">→ Retour vers ${esc(g.personName(m.def.giver))}</div>` : '');
    },
    toast(text, kind) {
      const box = $('toasts'); const el = document.createElement('div'); el.className = 'toast ' + (kind || ''); el.innerHTML = text; box.appendChild(el);
      requestAnimationFrame(() => el.classList.add('show'));
      setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 5200);
    },

    /* ------------------------------------------------ Dialogue ------ */
    openDialog(npc, content) {
      this.dialogOpen = true; const d = $('dialog'); d.classList.remove('hidden');
      const u = unitOf(npc.unit);
      DFIN.art.drawPortrait($('portrait'), npc.data, npc.data.mood);
      $('dlg-name').textContent = npc.name; $('dlg-role').textContent = npc.role;
      const chip = $('dlg-unit'); chip.textContent = u.name; chip.style.background = u.color;
      $('dlg-mood').textContent = 'humeur : ' + npc.data.mood;
      this.setDialog(content);
    },
    setDialog(content) {
      const txt = $('dlg-text'); if (this.typeTimer) clearInterval(this.typeTimer);
      const full = content.text; let i = 0; txt.textContent = '';
      this.typeTimer = setInterval(() => { i += 2; txt.textContent = full.slice(0, i); if (i >= full.length) { clearInterval(this.typeTimer); this.typeTimer = null; } }, 12);
      txt.onclick = () => { if (this.typeTimer) { clearInterval(this.typeTimer); this.typeTimer = null; txt.textContent = full; } };
      const opts = $('dlg-options'); opts.innerHTML = '';
      content.options.forEach((o, idx) => { const b = document.createElement('button'); b.className = 'opt ' + (o.kind || ''); b.innerHTML = `<span class="k">${idx + 1}</span>${esc(o.label)}`; b.onclick = () => { DFIN.audio.blip(); o.action(); }; opts.appendChild(b); });
      this.currentOptions = content.options;
    },
    closeDialog() { this.dialogOpen = false; $('dialog').classList.add('hidden'); if (this.typeTimer) { clearInterval(this.typeTimer); this.typeTimer = null; } this.currentOptions = null; },
    pickOption(n) { if (this.currentOptions && this.currentOptions[n]) { DFIN.audio.blip(); this.currentOptions[n].action(); } },

    /* ------------------------------------------------ Panneaux ------ */
    openPanel(kind, arg) {
      const p = $('panel'); const body = $('panel-body'); const title = $('panel-title');
      p.classList.remove('hidden'); this.panelOpen = true; DFIN.audio.blip();
      p.style.setProperty('--accent', '#4fb3d9');
      body.innerHTML = ''; body.scrollTop = 0;
      if (kind === 'report') this._report(arg, title, body);
      else if (kind === 'calendar') this._calendar(arg, title, body);
      else if (kind === 'cockpit') this._cockpit(title, body);
      else if (kind === 'notebook') this._notebook(title, body);
      else if (kind === 'plan') this._plan(title, body);
      else if (kind === 'meetings') this._meetings(title, body);
      else this._help(title, body);
    },
    closePanel() { $('panel').classList.add('hidden'); this.panelOpen = false; },

    _kpis(kpis) { return `<div class="kpis">${kpis.map(k => `<div class="kpi ${k.t || ''}"><div class="kl">${esc(k.l)}</div><div class="kv">${esc(k.v)}</div>${k.s ? `<div class="ks">${esc(k.s)}</div>` : ''}</div>`).join('')}</div>`; },
    _alerts(alerts) { return alerts.length ? `<ul class="alerts">${alerts.map(a => `<li class="${a.t}"><span class="dot"></span>${esc(a.m)}</li>`).join('')}</ul>` : '<p class="muted">Aucune alerte.</p>'; },

    _report(unitId, title, body) {
      const u = unitOf(unitId), r = DFIN.REPORTS[unitId]; if (!r) return;
      $('panel').style.setProperty('--accent', u.color);
      title.innerHTML = `<span class="chip" style="background:${u.color}">${esc(u.short)}</span> ${esc(r.title)}`;
      const people = DFIN.PEOPLE.filter(p => p.unit === unitId);
      const g = this.game; const prev = g.viewedReports.has(unitId); g.viewedReports.add(unitId);
      body.innerHTML = `
        <p class="lead">${esc(u.name)} — ${esc(u.desc)}</p>
        ${this._kpis(r.kpis)}
        <div class="chart-wrap"><div class="chart-title">${esc(r.chart.title)}</div><canvas class="chart" width="900" height="300"></canvas><div class="legend">${r.chart.series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div></div>
        <h3>Commentaires de gestion</h3><ul class="comments">${r.comments.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
        <h3>Points de vigilance</h3>${this._alerts(r.alerts)}
        <h3>Équipe</h3><div class="people">${people.map(p => `<div class="person"><canvas width="56" height="56"></canvas><div><b>${esc(p.name)}</b><br><span class="muted">${esc(p.role)}</span></div></div>`).join('')}</div>
        <p class="muted small">Dernière mise à jour ${g.clockString()} · ${prev ? 'déjà consulté' : 'première consultation'} · données fictives.</p>`;
      this.drawChart(body.querySelector('canvas.chart'), r.chart);
      body.querySelectorAll('.person canvas').forEach((c, i) => DFIN.art.drawPortrait(c, people[i], people[i].mood));
      g.onReportViewed(unitId);
    },

    _calendar(filter, title, body) {
      title.innerHTML = '📅 Calendrier de gestion — septembre → décembre 2026';
      const today = DFIN.COMPANY.today;
      const units = [...new Set(DFIN.CALENDAR.map(e => e.u))];
      const filters = `<div class="filters"><button class="f ${!filter ? 'on' : ''}" data-cal-filter="all">Toutes les unités</button>${units.map(uid => { const u = unitOf(uid); return `<button class="f ${filter === uid ? 'on' : ''}" data-cal-filter="${uid}" style="--c:${u.color}">${esc(u.short)}</button>`; }).join('')}</div>`;
      const legend = `<div class="legend cal">${Object.entries(DFIN.CAL_TYPES).map(([k, v]) => `<span><i style="background:${v.c}"></i>${esc(v.n)}</span>`).join('')}</div>`;
      const events = DFIN.CALENDAR.filter(e => !filter || e.u === filter);
      // grilles mensuelles compactes
      let grids = '<div class="months">';
      for (let m = 8; m <= 11; m++) {
        const first = new Date(2026, m, 1); const nd = new Date(2026, m + 1, 0).getDate(); const off = (first.getDay() + 6) % 7;
        let cells = ''; for (let i = 0; i < off; i++) cells += '<i></i>';
        for (let d = 1; d <= nd; d++) {
          const key = `2026-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; const evs = events.filter(e => e.d === key);
          const isToday = m === today.getMonth() && d === today.getDate(); const wk = ((off + d - 1) % 7) >= 5;
          cells += `<b class="${isToday ? 'today' : ''} ${wk ? 'wk' : ''}" title="${evs.map(e => e.n).join(' / ')}">${d}${evs.length ? `<em>${evs.slice(0, 3).map(e => `<u style="background:${DFIN.CAL_TYPES[e.t].c}"></u>`).join('')}</em>` : ''}</b>`;
        }
        grids += `<div class="month"><h4>${MONTHS[m]}</h4><div class="grid">${DAYS.map(d => `<s>${d}</s>`).join('')}${cells}</div></div>`;
      }
      grids += '</div>';
      let list = ''; let lastM = '';
      for (const e of events) {
        const dd = new Date(e.d); const mlabel = MONTHS[dd.getMonth()] + ' ' + dd.getFullYear(); if (mlabel !== lastM) { list += `<h3>${mlabel}</h3>`; lastM = mlabel; }
        const days = Math.round((dd - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 864e5);
        const u = unitOf(e.u); const t = DFIN.CAL_TYPES[e.t];
        list += `<div class="ev ${days <= 3 ? 'soon' : ''}"><div class="ev-date"><b>${e.d.slice(8)}</b><span>${DAYS[(dd.getDay() + 6) % 7]}</span></div><div class="ev-body"><div class="ev-n">${esc(e.n)}</div><div class="ev-meta"><span class="chip" style="background:${u.color}">${esc(u.short)}</span><span class="chip t" style="background:${t.c}">${esc(t.n)}</span><span class="jj">${days === 0 ? 'aujourd\'hui' : 'J+' + days}</span></div></div><button class="mini" data-open-report="${e.u}">reporting</button></div>`;
      }
      body.innerHTML = filters + legend + grids + list;
      this.game.onCalendarViewed();
    },

    _meetings(title, body) {
      title.innerHTML = '🏛️ Salle du Comité — réservations';
      const evs = DFIN.CALENDAR.filter(e => e.t === 'comite');
      body.innerHTML = `<p class="lead">Aujourd'hui : <b>COMEX à 11:00</b> (salle du Conseil, étage 6). La salle du Comité accueille les comités d'engagement, de trésorerie et d'audit de la direction financière.</p><h3>Prochains comités</h3>` + evs.map(e => `<div class="ev"><div class="ev-date"><b>${e.d.slice(8)}</b><span>${e.d.slice(5, 7)}</span></div><div class="ev-body"><div class="ev-n">${esc(e.n)}</div><div class="ev-meta"><span class="chip" style="background:${unitOf(e.u).color}">${esc(unitOf(e.u).short)}</span></div></div></div>`).join('');
    },

    _cockpit(title, body) {
      title.innerHTML = '🖥️ Cockpit de pilotage — vue consolidée';
      const r = DFIN.REPORTS.pil; const g = this.game;
      const cards = DFIN.UNITS.filter(u => !['dir', 'pil', 'caf'].includes(u.id)).map(u => { const rr = DFIN.REPORTS[u.id]; const bad = rr.alerts.filter(a => a.t === 'bad').length, warn = rr.alerts.filter(a => a.t === 'warn').length; return `<button class="ucard" data-open-report="${u.id}" style="--c:${u.color}"><div class="uc-h"><span class="chip" style="background:${u.color}">${esc(u.short)}</span>${esc(u.name)}</div><div class="uc-k">${rr.kpis.slice(0, 2).map(k => `<div><span>${esc(k.l)}</span><b>${esc(k.v)}</b></div>`).join('')}</div><div class="uc-a">${bad ? `<span class="bad">● ${bad}</span>` : ''}${warn ? `<span class="warn">● ${warn}</span>` : ''}<span class="ok">● ${rr.alerts.filter(a => a.t === 'ok').length}</span> <span class="muted">→ ouvrir le reporting</span></div></button>`; }).join('');
      body.innerHTML = `<div class="ticker"><span>${DFIN.TICKER.join('  ◆  ')}  ◆  ${DFIN.TICKER.join('  ◆  ')}</span></div>
        <div class="cockpit-head"><div><div class="muted">Horloge plateau</div><div class="big">${g.clockString()}</div></div><div><div class="muted">COMEX dans</div><div class="big gold">${g.countdownTo(11, 0)}</div></div><div><div class="muted">Flux SAP</div><div class="big ok">OK · 07:50</div></div></div>
        ${this._kpis(r.kpis)}
        <div class="two"><div class="chart-wrap"><div class="chart-title">${esc(DFIN.REPORTS.tre.chart.title)}</div><canvas class="chart c1" width="900" height="300"></canvas></div><div class="chart-wrap"><div class="chart-title">${esc(DFIN.REPORTS.inv.chart.title)}</div><canvas class="chart c2" width="900" height="300"></canvas></div></div>
        <h3>Unités</h3><div class="ucards">${cards}</div>
        <h3>Alertes consolidées</h3>${this._alerts(r.alerts)}`;
      this.drawChart(body.querySelector('.c1'), DFIN.REPORTS.tre.chart); this.drawChart(body.querySelector('.c2'), DFIN.REPORTS.inv.chart);
      g.onCockpitViewed();
    },

    _notebook(title, body) {
      title.innerHTML = '📓 Carnet du DAF adjoint'; const g = this.game;
      const mis = g.missions.map((m, i) => { const st = g.completed.includes(m.id) ? 'done' : (g.mission && g.mission.def.id === m.id) ? 'active' : 'locked'; return `<div class="mis ${st}"><b>${i + 1}. ${esc(m.title)}</b> <span class="chip">${st === 'done' ? 'terminée' : st === 'active' ? 'en cours' : 'à venir'}</span><div class="muted small">Donneur d'ordre : ${esc(g.personName(m.giver))} · avant ${m.deadline}</div>${st !== 'locked' ? `<ul>${m.items.map(it => `<li>${(g.mission && g.mission.def.id === m.id && g.mission.done[it.id]) || st === 'done' ? '✔' : '○'} ${esc(it.label)} — ${esc(g.personName(it.who))}</li>`).join('')}</ul>` : ''}${st === 'done' ? `<div class="reward">★ ${esc(m.reward)}</div>` : ''}</div>`; }).join('');
      const facts = g.facts.slice().reverse().map(f => `<li><span class="time">${f.t}</span> <b>${esc(f.who)}</b> — ${esc(f.text)}</li>`).join('');
      body.innerHTML = `<div class="stats"><div><b>${g.facts.length}</b><span>infos collectées</span></div><div><b>${g.met.size}</b><span>collègues rencontrés / ${DFIN.PEOPLE.length}</span></div><div><b>${g.viewedReports.size}</b><span>reportings consultés</span></div><div><b>${g.coffees}</b><span>cafés</span></div></div>
        <h3>Missions</h3>${mis}<h3>Informations collectées</h3>${facts ? `<ul class="facts">${facts}</ul>` : '<p class="muted">Rien pour l\'instant. Allez parler aux équipes.</p>'}`;
    },

    _plan(title, body) {
      title.innerHTML = '🗺️ Plan du plateau F';
      body.innerHTML = `<p class="lead">Chaque pod de l'open space est une unité de la direction financière. Le cockpit (mur d'écrans) est au nord, encadré par le bureau de la Directrice financière et la salle du Comité. Le <b>kiosque du calendrier de gestion</b> est au centre de l'open space.</p>
        <div class="units">${DFIN.UNITS.map(u => `<div class="unit" style="--c:${u.color}"><div class="u-h"><span class="chip" style="background:${u.color}">${esc(u.short)}</span><b>${esc(u.name)}</b></div><div class="muted small">${esc(u.desc)}</div><div class="u-p">${DFIN.PEOPLE.filter(p => p.unit === u.id).map(p => esc(p.name.split(' ')[0])).join(' · ')}</div>${DFIN.REPORTS[u.id] && u.id !== 'caf' ? `<button class="mini" data-open-report="${u.id}">reporting</button>` : ''}</div>`).join('')}</div>`;
    },

    _help(title, body) {
      title.innerHTML = '❓ Comment jouer';
      body.innerHTML = `<div class="help">
        <h3>Objectif</h3><p>Vous êtes le <b>DAF adjoint</b>. Faites le tour du plateau, parlez aux équipes, consultez leurs reportings et le calendrier de gestion, et rapportez à la Directrice financière ce dont elle a besoin avant le COMEX.</p>
        <h3>Commandes</h3>
        <ul><li><kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd> / <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / flèches : se déplacer</li>
        <li><b>Clic</b> sur le sol : y aller · <b>clic</b> sur un collègue : aller lui parler</li>
        <li><kbd>E</kbd> ou <kbd>Espace</kbd> : parler / consulter (quand l'invite apparaît)</li>
        <li><kbd>1</kbd>…<kbd>6</kbd> : choisir une réponse dans un dialogue</li>
        <li><kbd>N</kbd> carnet · <kbd>C</kbd> calendrier · <kbd>M</kbd> plan · <kbd>Échap</kbd> fermer · molette : zoom</li></ul>
        <h3>Repères</h3><ul><li><b style="color:#c9a34a">!</b> au-dessus d'une tête : une mission ou une remise vous attend.</li><li><b style="color:#4fb3d9">?</b> : cette personne détient un élément demandé.</li><li>Le <b>mur d'écrans</b> et le <b>pupitre</b> du cockpit ouvrent la vue consolidée ; le <b>kiosque</b> central ouvre le calendrier de gestion ; la <b>machine à café</b> donne des rumeurs (et de la vitesse).</li></ul>
        <p class="muted small">Prototype de concept. Toutes les données (personnes, chiffres, dates) sont fictives.</p></div>`;
    },

    /* ------------------------------------------------ Graphiques ---- */
    drawChart(canvas, ch) {
      if (!canvas) return; const ctx = canvas.getContext('2d'); const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const padL = 70, padR = 20, padT = 16, padB = 40; const cw = w - padL - padR, chh = h - padT - padB;
      const all = ch.series.flatMap(s => s.data); let mx = Math.max(...all), mn = ch.type === 'bar' ? 0 : Math.min(...all);
      const span = mx - mn || 1; mx += span * 0.1; if (ch.type !== 'bar') mn -= span * 0.1;
      const y = v => padT + chh - (v - mn) / (mx - mn) * chh;
      ctx.strokeStyle = 'rgba(128,128,128,0.25)'; ctx.fillStyle = '#8a8f99'; ctx.font = '13px system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let i = 0; i <= 4; i++) { const v = mn + (mx - mn) * i / 4; const yy = y(v); ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy); ctx.stroke(); ctx.fillText(v >= 100 ? Math.round(v).toLocaleString('fr-FR') : v.toFixed(v >= 10 ? 0 : 1), padL - 8, yy); }
      const n = ch.labels.length; const gx = i => padL + (i + 0.5) * cw / n;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ch.labels.forEach((l, i) => ctx.fillText(l, gx(i), padT + chh + 8));
      if (ch.type === 'bar') {
        const ns = ch.series.length; const bw = (cw / n) * 0.7 / ns;
        ch.series.forEach((s, si) => { ctx.fillStyle = s.color; s.data.forEach((v, i) => { const x = gx(i) - (ns * bw) / 2 + si * bw; ctx.fillRect(x + 1, y(v), bw - 2, padT + chh - y(v)); }); });
      } else {
        ch.series.forEach(s => { ctx.strokeStyle = s.color; ctx.lineWidth = 3; ctx.setLineDash(s.dash ? [8, 6] : []); ctx.beginPath(); s.data.forEach((v, i) => i ? ctx.lineTo(gx(i), y(v)) : ctx.moveTo(gx(i), y(v))); ctx.stroke(); ctx.setLineDash([]); if (!s.dash) { ctx.fillStyle = s.color; s.data.forEach((v, i) => { ctx.beginPath(); ctx.arc(gx(i), y(v), 4.5, 0, 7); ctx.fill(); }); } });
        ctx.lineWidth = 1;
      }
    },
  };

  DFIN.UI = UI;
})();
