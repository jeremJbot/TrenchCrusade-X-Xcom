/* =====================================================================
   Boucle de jeu, entrées, horloge, missions, interactions.
   ===================================================================== */
'use strict';
(function () {
  const DFIN = window.DFIN;
  const T = DFIN.T;
  const UI = DFIN.UI;
  const TIME_SCALE = 20; // secondes de jeu par seconde réelle

  class Game {
    constructor() {
      this.map = DFIN.buildMap();
      this.world = new DFIN.World(this.map);
      this.canvas = document.getElementById('game');
      this.renderer = new DFIN.Renderer(this.canvas, this.map, this.world);
      this.clock = 8 * 60 + 32; // minutes
      this.keys = {}; this.running = false; this.last = 0;
      this.missions = DFIN.MISSIONS; this.missionIndex = 0; this.mission = null; this.completed = [];
      this.facts = []; this.met = new Set(); this.viewedReports = new Set(); this.coffees = 0; this.newsIdx = {};
      this.talkingTo = null; this.pendingTalk = null; this.pendingObj = null; this.boost = 0; this.deadlineWarned = false;
      this.tips = { calendar: false, cockpit: false };
      UI.init(this);
      this._input();
      UI.showIntro(() => this.start());
    }

    /* ------------------------------------------------ Horloge ------- */
    clockString() { const h = Math.floor(this.clock / 60) % 24, m = Math.floor(this.clock % 60); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }
    countdownTo(h, m) { const d = h * 60 + m - this.clock; if (d <= 0) return 'EN COURS'; const hh = Math.floor(d / 60), mm = Math.floor(d % 60); return '−' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); }

    /* ------------------------------------------------ Personnes ----- */
    person(id) { return DFIN.PEOPLE.find(p => p.id === id); }
    personName(id) { const p = this.person(id); return p ? p.name : id; }
    personUnit(id) { const p = this.person(id); return p ? p.unit : 'dir'; }
    npc(id) { return this.world.npcs.find(n => n.id === id); }

    /* ------------------------------------------------ Missions ------ */
    nextMissionDef() { return this.missions[this.missionIndex] || null; }
    missionComplete() { return !!this.mission && this.mission.def.items.every(it => this.mission.done[it.id]); }
    markerFor(npc) {
      if (this.mission) {
        if (this.missionComplete()) return npc.id === this.mission.def.giver ? '!' : null;
        return this.mission.def.items.some(it => it.who === npc.id && !this.mission.done[it.id]) ? '?' : null;
      }
      const nx = this.nextMissionDef(); return nx && nx.giver === npc.id ? '!' : null;
    }
    startMission(def) { this.mission = { def, done: {} }; this.deadlineWarned = false; UI.updateHud(); UI.toast(`<b>Nouvelle mission :</b> ${def.title}`, 'gold'); DFIN.audio.chime(); }
    finishMission() { const def = this.mission.def; this.completed.push(def.id); this.mission = null; this.missionIndex++; UI.updateHud(); UI.toast(`<b>Mission terminée :</b> ${def.reward}`, 'ok'); DFIN.audio.chime(); const nx = this.nextMissionDef(); if (nx) setTimeout(() => UI.toast(`${this.personName(nx.giver)} aimerait vous voir (${DFIN.UNITS.find(u => u.id === this.personUnit(nx.giver)).name}).`), 2500); }
    addFact(who, text) { this.facts.push({ t: this.clockString(), who, text }); }

    onReportViewed(unitId) { if (!this.viewedReports.size) return; void unitId; }
    onCalendarViewed() { if (!this.tips.calendar) { this.tips.calendar = true; UI.toast('Le calendrier de gestion est aussi affiché sur l\'écran de gauche du cockpit.'); } }
    onCockpitViewed() { if (!this.tips.cockpit) { this.tips.cockpit = true; UI.toast('Cliquez sur une unité pour ouvrir son reporting détaillé.'); } }

    /* ------------------------------------------------ Démarrage ----- */
    start() {
      DFIN.audio.init(); DFIN.audio.resume(); this.running = true; this.last = performance.now();
      UI.updateHud();
      UI.toast('<b>08:32 — Plateau F.</b> Hélène Marchetti (Directrice financière) vous attend dans son bureau, en haut à gauche.', 'gold');
      setTimeout(() => this.npc('sandrine') && this.world.npcBubble(this.npc('sandrine'), 'Elle vous attend !', 4), 1500);
      requestAnimationFrame((t) => this.frame(t));
    }

    /* ------------------------------------------------ Entrées ------- */
    _input() {
      window.addEventListener('keydown', (e) => {
        if (e.repeat) return; const k = e.key.toLowerCase();
        if (k === 'escape') { if (UI.panelOpen) UI.closePanel(); else if (UI.dialogOpen) this.endTalk(); return; }
        if (UI.dialogOpen && /^[1-9]$/.test(k) && !UI.panelOpen) { UI.pickOption(parseInt(k) - 1); return; }
        if (UI.panelOpen) return;
        if (k === 'e' || k === ' ' || k === 'enter') { e.preventDefault(); if (!UI.dialogOpen) this.interact(); return; }
        if (UI.dialogOpen) return;
        if (k === 'n' || k === 'tab') { e.preventDefault(); UI.openPanel('notebook'); return; }
        if (k === 'c') { UI.openPanel('calendar'); return; }
        if (k === 'm') { UI.openPanel('plan'); return; }
        if (k === 'h' || k === '?') { UI.openPanel('help'); return; }
        this.keys[k] = true; this.keys[e.code] = true;
      });
      window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; this.keys[e.code] = false; });
      window.addEventListener('blur', () => { this.keys = {}; });
      const c = this.canvas;
      c.addEventListener('wheel', (e) => { e.preventDefault(); this.renderer.targetZoom = Math.max(0.8, Math.min(3, this.renderer.targetZoom * (e.deltaY > 0 ? 0.9 : 1.1))); }, { passive: false });
      let downAt = null;
      c.addEventListener('pointerdown', (e) => { e.preventDefault(); downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; });
      c.addEventListener('pointerup', (e) => {
        if (!downAt) return; const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y); downAt = null; if (moved > 12) return;
        if (UI.panelOpen) return; if (UI.dialogOpen) { this.endTalk(); return; }
        DFIN.audio.resume();
        const w = this.renderer.screenToWorld(e.clientX, e.clientY);
        // clic sur un PNJ ?
        let hit = null, bd = 18; for (const n of this.world.npcs) { const d = Math.hypot(n.x - w.x, n.y - w.y); if (d < bd) { bd = d; hit = n; } }
        if (hit) { this.walkToNpc(hit); return; }
        const tx = Math.floor(w.x / T), ty = Math.floor(w.y / T);
        const obj = this.map.objAt[tx + ',' + ty];
        if (obj && obj.id) { this.walkToObject(obj); return; }
        if (this.world.walkable(tx, ty)) { const p = this.world.tileOf(this.world.player); this.world.setPath(this.world.player, this.world.findPath(p.x, p.y, tx, ty)); this.pendingTalk = null; this.pendingObj = null; }
      });
      // tactile : joystick virtuel (glisser) + bouton d'action ; aucune sélection de texte
      document.addEventListener('touchstart', (e) => { if (e.target.closest('#panel-body, #dlg-text')) return; if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
      document.addEventListener('gesturestart', (e) => e.preventDefault());
      document.addEventListener('contextmenu', (e) => { if (!e.target.closest('#panel-body')) e.preventDefault(); });
      this.joy = { active: false, id: null, cx: 0, cy: 0, vx: 0, vy: 0 };
      const pad = document.getElementById('touchpad'); if (pad) {
        if (window.matchMedia('(pointer: coarse)').matches) pad.classList.remove('hidden');
        const base = pad.querySelector('.joy'), knob = pad.querySelector('.joy-knob'); const R = 34;
        const setKnob = (dx, dy) => { knob.style.transform = `translate(${dx}px, ${dy}px)`; };
        base.addEventListener('pointerdown', (e) => { e.preventDefault(); base.setPointerCapture(e.pointerId); const r = base.getBoundingClientRect(); this.joy.active = true; this.joy.id = e.pointerId; this.joy.cx = r.left + r.width / 2; this.joy.cy = r.top + r.height / 2; this.joy.vx = 0; this.joy.vy = 0; base.classList.add('on'); });
        const move = (e) => { if (!this.joy.active || e.pointerId !== this.joy.id) return; e.preventDefault(); let dx = e.clientX - this.joy.cx, dy = e.clientY - this.joy.cy; const d = Math.hypot(dx, dy); if (d > R) { dx = dx / d * R; dy = dy / d * R; } setKnob(dx, dy); const dead = 6; this.joy.vx = Math.abs(dx) > dead ? dx / R : 0; this.joy.vy = Math.abs(dy) > dead ? dy / R : 0; };
        const end = (e) => { if (e.pointerId !== this.joy.id) return; this.joy.active = false; this.joy.vx = 0; this.joy.vy = 0; setKnob(0, 0); base.classList.remove('on'); };
        base.addEventListener('pointermove', move); base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end);
        pad.querySelector('[data-act]').addEventListener('pointerdown', (e) => { e.preventDefault(); DFIN.audio.resume(); if (UI.panelOpen) return; if (UI.dialogOpen) { this.endTalk(); return; } this.interact(); });
      }
    }

    walkToNpc(n) {
      const p = this.world.player; const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d < 1.7 * T) { this.talk(n); return; }
      const nt = this.world.tileOf(n); const adj = this.world.adjacentFree(nt.x, nt.y, p); if (!adj) return;
      const pt = this.world.tileOf(p); const path = this.world.findPath(pt.x, pt.y, adj.x, adj.y); if (!path) return;
      this.world.setPath(p, path); this.pendingTalk = n; this.pendingObj = null;
    }
    walkToObject(o) {
      const p = this.world.player; const pt = this.world.tileOf(p);
      let best = null, bl = Infinity;
      for (let y = o.y - 1; y <= o.y + o.h; y++) for (let x = o.x - 1; x <= o.x + o.w; x++) { if (!this.world.walkable(x, y)) continue; const path = this.world.findPath(pt.x, pt.y, x, y); if (path && path.length < bl) { bl = path.length; best = path; } }
      if (best) { this.world.setPath(p, best); this.pendingObj = o; this.pendingTalk = null; } else if (bl === Infinity && this._objNear(o, 1.3)) this.useObject(o);
    }
    _objNear(o, dist) { const p = this.world.player; const ddx = Math.max(o.x * T - p.x, 0, p.x - (o.x + o.w) * T), ddy = Math.max(o.y * T - p.y, 0, p.y - (o.y + o.h) * T); return Math.hypot(ddx, ddy) < dist * T; }

    /* ------------------------------------------------ Interaction --- */
    currentTarget() {
      const n = this.world.nearestNpc(1.7); if (n) return { npc: n };
      const o = this.world.nearestObject(1.25); if (o) return { obj: o };
      return null;
    }
    interact() {
      const t = this.currentTarget(); if (!t) return;
      if (t.npc) this.talk(t.npc); else this.useObject(t.obj);
    }

    objLabel(o) {
      return { console: 'Consulter le pupitre de pilotage', screen_l: 'Regarder l\'écran (calendrier)', screen_c: 'Regarder le mur d\'écrans', screen_r: 'Regarder l\'écran (alertes)', calendar: 'Consulter le calendrier de gestion', wallcal: 'Calendrier mural BUD', coffee: 'Prendre un café', vending: 'Distributeur', copier: 'Copieur', comite: 'Table du Comité', books: 'Bibliothèque', books_fis: 'Rayonnage fiscal', racks: 'Baies serveurs — état des systèmes', minirack: 'Mini-baie du Lab', robot: 'Robot du Lab', safe: 'Coffre-fort des polices', ticker_fin: 'Écran de marché' }[o.id] || (o.id.startsWith('printer_') ? 'Imprimante' : 'Examiner');
    }
    useObject(o) {
      DFIN.audio.blip();
      if (o.id === 'console' || o.id.startsWith('screen_')) { UI.openPanel('cockpit'); return; }
      if (o.id === 'calendar') { UI.openPanel('calendar'); return; }
      if (o.id === 'wallcal') { UI.openPanel('calendar', 'bud'); return; }
      if (o.id === 'racks' || o.id === 'minirack') { UI.openPanel('report', 'srv'); return; }
      if (o.id === 'robot') { UI.toast('🤖 Le robot du Lab : « J\'ai lu 1 840 factures ce matin. Aucune ne parlait de moi. »'); this.addFact('Robot du Lab', 'Assistant IA de lecture de factures : 1 840 factures traitées, 12 anomalies remontées à la comptabilité fournisseurs.'); return; }
      if (o.id === 'safe') { UI.toast('🔒 Coffre des polices d\'assurance : TRC, RC maître d\'ouvrage, dommages-ouvrage. La combinaison est le montant de la franchise, paraît-il.'); return; }
      if (o.id === 'ticker_fin') { UI.toast('📈 Écran de marché : mid-swap 20 ans 2,71 % · OAT 10 ans 3,12 % · spread green bond visé +38 pb. (Valeurs fictives.)'); return; }
      if (o.id === 'books_fis') { UI.toast('📚 Code général des impôts 2026, BOFiP annoté, doctrine TVA des établissements publics. Le marque-page est à l\'article 256 B.'); return; }
      if (o.id === 'comite') { UI.openPanel('meetings'); return; }
      if (o.id === 'coffee') { this.coffees++; this.boost = 45; DFIN.audio.coffee(); const r = DFIN.pick(DFIN.RUMORS); UI.toast(`☕ <b>Café n°${this.coffees}.</b> Vitesse +25 % pendant 45 s.<br><i>Rumeur entendue : « ${r} »</i>`, 'gold'); this.addFact('Machine à café', r); return; }
      if (o.id === 'vending') { UI.toast('Le distributeur propose des barres de céréales hors de prix. Vous renoncez, pour l\'atterrissage budgétaire.'); return; }
      if (o.id === 'copier') { UI.toast('Le copieur imprime le reporting d\'août de Sophie. 42 pages. Recto-verso, heureusement.'); return; }
      if (o.id === 'books') { UI.toast('Rapports financiers annuels 2011–2025. Celui de 2019 est corné à la page des provisions.'); return; }
      if (o.id.startsWith('printer_')) { const u = DFIN.UNITS.find(u => u.id === o.id.slice(8)); UI.toast(`Imprimante ${u.short} : dernier document — « ${DFIN.REPORTS[u.id].title} ».`); return; }
    }

    /* ------------------------------------------------ Dialogues ----- */
    talk(n) {
      this.talkingTo = n; this.world.startTalk(n); this.world.player.path = null; this.pendingTalk = null;
      const first = !this.met.has(n.id); this.met.add(n.id);
      UI.openDialog(n, this.dialogContent(n, first ? n.data.greet : this.nextNews(n, false)));
    }
    endTalk() { if (this.talkingTo) { this.world.endTalk(this.talkingTo); this.talkingTo = null; } UI.closeDialog(); }
    nextNews(n, record) {
      const list = DFIN.NEWS[n.id] || [n.data.greet]; const i = this.newsIdx[n.id] || 0; const txt = list[i % list.length]; this.newsIdx[n.id] = i + 1;
      if (record) { if (!this.facts.some(f => f.text === txt)) this.addFact(n.name, txt); }
      return txt;
    }
    dialogContent(n, text) {
      const u = DFIN.UNITS.find(x => x.id === n.unit); const opts = [];
      // options de mission
      if (this.mission) {
        const m = this.mission;
        for (const it of m.def.items) if (it.who === n.id && !m.done[it.id]) opts.push({ kind: 'mission', label: `[Demande] ${it.ask}`, action: () => { m.done[it.id] = true; this.addFact(n.name, it.fact); UI.updateHud(); DFIN.audio.chime(); UI.toast(`✔ <b>${it.label}</b> obtenu.`, 'ok'); UI.setDialog(this.dialogContent(n, it.answer)); } });
        if (n.id === m.def.giver && this.missionComplete()) opts.push({ kind: 'mission', label: `[Mission] Remettre les éléments : ${m.def.title}`, action: () => { const outro = m.def.outro; this.finishMission(); UI.setDialog(this.dialogContent(n, outro)); } });
        else if (n.id === m.def.giver) opts.push({ kind: 'mission', label: '[Mission] Où en suis-je ?', action: () => { const rest = m.def.items.filter(it => !m.done[it.id]).map(it => `${it.label} (${this.personName(it.who)})`); UI.setDialog(this.dialogContent(n, `Il vous manque encore : ${rest.join(', ')}. ${this.clock > this._deadlineMin(m.def) ? 'Et vous êtes en retard.' : 'Ne traînez pas.'}`)); } });
      } else {
        const nx = this.nextMissionDef();
        if (nx && nx.giver === n.id) opts.push({ kind: 'mission', label: `[Mission] « ${nx.title} »`, action: () => { this.startMission(nx); UI.setDialog(this.dialogContent(n, nx.intro)); } });
      }
      opts.push({ label: 'Quoi de neuf ?', action: () => UI.setDialog(this.dialogContent(n, this.nextNews(n, true))) });
      if (DFIN.REPORTS[n.unit] && n.unit !== 'caf') opts.push({ label: `Montre-moi ton reporting (${u.short})`, action: () => UI.openPanel('report', n.unit) });
      opts.push({ label: 'Points de vigilance', action: () => { const al = DFIN.REPORTS[n.unit].alerts; UI.setDialog(this.dialogContent(n, al.length ? al.map(a => (a.t === 'bad' ? '🔴 ' : a.t === 'warn' ? '🟠 ' : a.t === 'ok' ? '🟢 ' : 'ℹ️ ') + a.m).join('  ') : 'Rien à signaler.')); al.forEach(a => { if (a.t !== 'ok' && !this.facts.some(f => f.text === a.m)) this.addFact(n.name, a.m); }); } });
      opts.push({ label: 'Calendrier de gestion de l\'unité', action: () => UI.openPanel('calendar', n.unit === 'pil' ? null : n.unit) });
      opts.push({ kind: 'bye', label: 'À plus tard', action: () => this.endTalk() });
      return { text, options: opts };
    }
    _deadlineMin(def) { const [h, m] = def.deadline.split(':').map(Number); return h * 60 + m; }

    /* ------------------------------------------------ Boucle -------- */
    frame(t) {
      if (!this.running) return;
      let dt = (t - this.last) / 1000; this.last = t; if (dt > 0.1) dt = 0.1;
      this.clock += dt * TIME_SCALE / 60;
      if (this.boost > 0) this.boost -= dt;
      this.world.player.speed = this.boost > 0 ? 148 : 118;
      const p = this.world.player; let moving = false;
      if (!UI.isOpen()) {
        let vx = 0, vy = 0; const k = this.keys;
        if (k['arrowup'] || k['KeyW'] || k['z'] || k['w']) vy -= 1; if (k['arrowdown'] || k['KeyS'] || k['s']) vy += 1;
        if (k['arrowleft'] || k['KeyA'] || k['q'] || k['a']) vx -= 1; if (k['arrowright'] || k['KeyD'] || k['d']) vx += 1;
        if (!vx && !vy && this.joy && this.joy.active) { vx = this.joy.vx; vy = this.joy.vy; }
        if (vx || vy) { moving = this.world.movePlayer(vx, vy, dt); this.pendingTalk = null; this.pendingObj = null; }
        else if (p.path) { moving = this.world.followPath(p, dt); if (!moving) { if (this.pendingTalk) { const n = this.pendingTalk; this.pendingTalk = null; if (Math.hypot(n.x - p.x, n.y - p.y) < 2.2 * T) this.talk(n); } else if (this.pendingObj) { const o = this.pendingObj; this.pendingObj = null; if (this._objNear(o, 1.5)) this.useObject(o); } } }
        p.walk = moving ? ((p.walk || 0) + dt * 2.6) % 1 : null;
      } else p.walk = null;
      this.world.update(dt);
      // invite d'interaction
      if (!UI.isOpen()) { const tg = this.currentTarget(); if (tg && tg.npc) { const mk = this.markerFor(tg.npc); UI.setPrompt(`E — Parler à ${tg.npc.name}${mk === '!' ? '  (!)' : mk === '?' ? '  (?)' : ''}`); const tt = this.world.tileOf(tg.npc); this.renderer.highlight = { x: tt.x, y: tt.y, w: 1, h: 1 }; } else if (tg && tg.obj) { UI.setPrompt(`E — ${this.objLabel(tg.obj)}`); this.renderer.highlight = { x: tg.obj.x, y: tg.obj.y, w: tg.obj.w, h: tg.obj.h, tall: tg.obj.type === 'screen' }; } else { UI.setPrompt(null); this.renderer.highlight = null; } }
      else { UI.setPrompt(null); this.renderer.highlight = null; }
      // si l'interlocuteur s'éloigne (impossible : il est figé) ; rappel de délai
      if (this.mission && !this.deadlineWarned && this.clock > this._deadlineMin(this.mission.def)) { this.deadlineWarned = true; const g = this.npc(this.mission.def.giver); UI.toast(`⏰ <b>${this.personName(this.mission.def.giver)}</b> : « ${this.mission.def.deadline}, c'était le délai. Où en êtes-vous ? »`, 'bad'); if (g) this.world.npcBubble(g, 'Alors, ces éléments ?', 5); }
      if (Math.floor(this.clock) !== this._lastMin) { this._lastMin = Math.floor(this.clock); document.getElementById('clock').textContent = this.clockString(); }
      DFIN.audio.update(dt, moving && !UI.isOpen(), 0);
      this.renderer.updateCamera(dt);
      this.renderer.draw(this, dt);
      requestAnimationFrame((tt) => this.frame(tt));
    }
  }

  const boot = () => { window.game = new Game(); };
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', boot); else boot();
})();
