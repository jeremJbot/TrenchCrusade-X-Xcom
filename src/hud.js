/* Trench Crusade × XCOM — DOM HUD */
window.TC = window.TC || {};
(function () {
  const $ = (id) => document.getElementById(id);
  const T = (k, p) => TC.T(k, p);
  const HUD = { scene: null, el: {} };
  TC.HUD = HUD;

  const IDS = ['hud', 'topbar', 'turn-label', 'phase-label', 'objective-label', 'faith-val', 'blood-val', 'faith-pill', 'blood-pill', 'btn-menu', 'banner', 'banner-text', 'banner-sub', 'preview', 'log', 'unitcard', 'portrait', 'uc-name', 'uc-ap', 'uc-hp-fill', 'uc-hp-txt', 'uc-stats', 'uc-status', 'actions', 'btn-prev', 'btn-next', 'btn-cancel', 'btn-endturn', 'overlay'];
  HUD.ensure = function () { if (HUD.el.hud) return; IDS.forEach(id => HUD.el[id] = $(id)); };
  HUD.init = function (scene) {
    HUD.scene = scene; HUD.ensure();
    ['hud', 'topbar', 'turn-label', 'phase-label', 'objective-label', 'faith-val', 'blood-val', 'faith-pill', 'blood-pill', 'btn-menu', 'banner', 'banner-text', 'banner-sub', 'preview', 'log', 'unitcard', 'portrait', 'uc-name', 'uc-ap', 'uc-hp-fill', 'uc-hp-txt', 'uc-stats', 'uc-status', 'actions', 'btn-prev', 'btn-next', 'btn-cancel', 'btn-endturn', 'overlay'].forEach(id => HUD.el[id] = $(id));
    HUD.el['btn-endturn'].onclick = () => scene.onEndTurnPressed();
    HUD.el['btn-cancel'].onclick = () => scene.cancelMode();
    HUD.el['btn-prev'].onclick = () => scene.cycleUnit(-1);
    HUD.el['btn-next'].onclick = () => scene.cycleUnit(1);
    HUD.el['btn-menu'].onclick = () => scene.openPauseMenu();
    HUD.el['unitcard'].onclick = () => { if (scene.selected) scene.focusUnit(scene.selected); };
    HUD.show(true); HUD.refreshStatic();
    if (!HUD._ro && window.ResizeObserver) { HUD._ro = new ResizeObserver(() => HUD.syncBottom()); HUD._ro.observe(HUD.el.bottom || document.getElementById('bottom')); }
    HUD.syncBottom();
  };
  HUD.syncBottom = function () { const b = document.getElementById('bottom'); if (b) document.documentElement.style.setProperty('--bottom-h', b.offsetHeight + 'px'); };
  HUD.show = (v) => { HUD.ensure(); HUD.el.hud.classList.toggle('hidden', !v); };
  HUD.refreshStatic = function () { HUD.el['btn-endturn'].textContent = T('endTurn'); HUD.el['btn-cancel'].textContent = T('cancel'); };
  HUD.refreshTop = function (st) {
    HUD.el['turn-label'].textContent = `${T('turn')} ${Math.min(st.turn, TC.RULES.turnLimit)} ${T('of')} ${TC.RULES.turnLimit}`;
    const ph = HUD.el['phase-label']; ph.textContent = st.phase === 'na' ? T('phaseNA') : T('phaseH'); ph.classList.toggle('heretic', st.phase !== 'na');
    HUD.el['faith-val'].textContent = st.faith; HUD.el['blood-val'].textContent = st.blood;
    let obj; if (st.relic.state === 'altar') obj = T('objRelicAltar'); else if (st.relic.state === 'carried') { const b = st.units.find(u => u.id === st.relic.bearer); obj = T('objRelicCarried', { name: b ? TC.Rules.unitName(b) : '?' }); } else obj = T('objRelicGround');
    if (st.pendingReinf.length) obj += ' · ' + T('pendingReinf', { n: st.pendingReinf.reduce((a, g) => a + g.units.length, 0) });
    HUD.el['objective-label'].textContent = obj;
    const btn = HUD.el['btn-endturn']; btn.disabled = st.phase !== 'na' || HUD.scene.busy; btn.textContent = st.phase === 'na' ? T('endTurn') : T('enemyTurn');
    const anyAP = st.phase === 'na' && TC.Rules.alive(st, 'na').some(u => u.ap > 0); btn.classList.toggle('pulse', st.phase === 'na' && !anyAP);
  };
  HUD.bump = (which) => { const el = HUD.el[which + '-pill']; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };

  HUD.banner = function (text, sub, cls, ms) {
    const b = HUD.el.banner; b.className = cls || ''; HUD.el['banner-text'].textContent = text; HUD.el['banner-sub'].textContent = sub || ''; b.classList.remove('hidden');
    clearTimeout(HUD._bt); HUD._bt = setTimeout(() => b.classList.add('hidden'), ms || 1600);
  };
  HUD.log = function (text, cls) {
    const l = HUD.el.log; const d = document.createElement('div'); d.className = 'line' + (cls ? ' ' + cls : ''); d.textContent = text; l.appendChild(d);
    while (l.children.length > 4) l.removeChild(l.firstChild); setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 6000);
  };

  HUD.unitCard = function (u, st) {
    const card = HUD.el.unitcard; if (!u) { card.classList.add('hidden'); return; }
    card.classList.remove('hidden'); card.classList.toggle('enemy', u.faction === 'h');
    const p = HUD.el.portrait; p.innerHTML = ''; const cv = document.createElement('canvas'); const src = TC.Art.unitCanvas(u.type); cv.width = 64; cv.height = 96; const ctx = cv.getContext('2d'); ctx.save(); if (u.faction === 'na') { ctx.translate(64, 0); ctx.scale(-1, 1); } ctx.drawImage(src, 0, 0); ctx.restore(); if (!u.alive) cv.style.filter = 'grayscale(1) brightness(.5)'; p.appendChild(cv);
    HUD.el['uc-name'].textContent = TC.Rules.unitName(u) + (u.nameKey ? ' · ' + TC.TU(u.type) : '');
    let ap = ''; for (let i = 0; i < 2; i++) ap += `<span class="ap${i < u.ap ? '' : ' off'}"></span>`; HUD.el['uc-ap'].innerHTML = (u.faction === 'na' ? T('ap') + ' ' : '') + (u.faction === 'na' ? ap : '');
    const pct = Math.max(0, u.hp / u.maxHp * 100); const f = HUD.el['uc-hp-fill']; f.style.width = pct + '%'; f.classList.toggle('low', pct <= 40); HUD.el['uc-hp-txt'].textContent = `${u.hp} / ${u.maxHp} ${T('hp')}`;
    const rw = TC.Rules.rangedWeapon(u) || TC.Rules.flameWeapon(u); const mw = TC.Rules.meleeWeapon(u);
    let stats = `<span>${T('aim')} <b>${TC.Rules.effAim(u)}</b></span><span>${T('def')} <b>${TC.Rules.effDef(u)}</b></span><span>${T('mob')} <b>${TC.Rules.effMob(u)}</b></span><span>${T('armor')} <b>${u.def.armor}</b></span>`;
    if (rw) stats += `<span>${TC.TW(rw.id)} <b>${rw.dmg[0]}-${rw.dmg[1]}</b> · ${T('ammo')} <b>${u.ammo[rw.id]}/${rw.ammo}</b></span>`; if (mw) stats += `<span>${TC.TW(mw.id)} <b>${mw.dmg[0]}-${mw.dmg[1]}</b></span>`;
    if (u.grenades) stats += `<span>💣 <b>${u.grenades}</b></span>`;
    HUD.el['uc-stats'].innerHTML = stats;
    const sts = []; const map = { burning: 'stBurning', bleeding: 'stBleeding', blessed: 'stBlessed', cursed: 'stCursed', mutated: 'stMutated', suppressed: 'stSuppressed' };
    for (const k in map) if (u.statuses[k]) sts.push(`<span class="st ${k}">${T(map[k])} ${u.statuses[k]}</span>`);
    if (u.hunkered) sts.push(`<span class="st hunkered">${T('stHunkered')}</span>`); if (u.overwatch) sts.push(`<span class="st overwatch">${T('stOverwatch')}</span>`); if (u.hasRelic) sts.push(`<span class="st relic">⚱ ${T('stRelic')}</span>`);
    HUD.el['uc-status'].innerHTML = sts.join('');
  };

  HUD.actions = function (u, st, mode) {
    const box = HUD.el.actions; box.innerHTML = ''; if (!u || u.faction !== 'na' || st.phase !== 'na' || st.over) return;
    const names = { shoot: 'actShoot', melee: 'actMelee', overwatch: 'actOverwatch', hunker: 'actHunker', reload: 'actReload', grenade: 'actGrenade', flame: 'actFlame', aimed: 'actAimed', rally: 'actRally', bless: 'actBless', light: 'actLight', holyfire: 'actHolyFire', pray: 'actPray', relic: 'actRelic', droprelic: 'actDropRelic' };
    for (const id of TC.Rules.availableAbilities(st, u)) {
      const ab = TC.ABILITIES[id]; if (!ab) continue; const can = TC.Rules.canUse(st, u, id);
      if (id === 'pray' && !TC.Rules.adjacentShrine(st, u)) continue; if (id === 'relic' && !TC.Rules.canTakeRelic(st, u)) continue;
      const b = document.createElement('button'); b.className = 'act' + (ab.holy ? ' holy' : '') + (ab.danger ? ' danger' : '') + (mode === id ? ' selected' : ''); b.disabled = !can.ok;
      let cost = ab.faith ? `<span class="cost faith">${ab.faith}✚</span>` : `<span class="cost">${ab.cost}${T('ap')}</span>`;
      let badge = ''; if (id === 'grenade') badge = `<span class="badge">×${u.grenades}</span>`; if (id === 'flame') { const w = TC.Rules.flameWeapon(u); badge = `<span class="badge">×${u.ammo[w.id]}</span>`; } if (id === 'rally' && u.cooldowns.rally > 0) badge = `<span class="badge">⏳${u.cooldowns.rally}</span>`;
      b.innerHTML = `${cost}${badge}<span class="ico">${ab.ico}</span><span>${T(names[id])}</span>`;
      b.onclick = (e) => { e.stopPropagation(); HUD.scene.onAction(id); };
      b.oncontextmenu = (e) => { e.preventDefault(); };
      let pressT; b.ontouchstart = () => { pressT = setTimeout(() => HUD.tooltip(T('d' + names[id].charAt(0).toUpperCase() + names[id].slice(1))), 450); }; b.ontouchend = b.ontouchcancel = () => clearTimeout(pressT);
      box.appendChild(b);
    }
  };
  HUD.tooltip = function (txt) { HUD.log(txt); };
  HUD.cancelVisible = (v) => HUD.el['btn-cancel'].classList.toggle('hidden', !v);

  HUD.preview = function (data) {
    const p = HUD.el.preview; if (!data) { p.classList.add('hidden'); p.innerHTML = ''; return; }
    p.classList.remove('hidden'); let html = '';
    if (data.kind === 'attack') {
      const cls = data.hit >= 70 ? 'high' : (data.hit >= 40 ? 'mid' : 'low');
      const cov = data.cover === 0 ? `<b style="color:#e0463f">${T('pvFlank')}</b>` : (data.cover === 1 ? T('pvHalf') : T('pvFull'));
      html = `<div class="pv-big ${cls}">${data.auto ? T('pvAuto') : data.hit + '%'}</div><div class="pv-lines"><div><b>${data.name}</b> · ${data.targetName}</div><div>${T('pvDmg')} <b>${data.dmg[0]}–${data.dmg[1]}</b> · ${T('pvCrit')} <b>${data.crit}%</b></div><div><small>${T('pvCover')}: ${cov} · ${T('pvRange')} ${data.dist.toFixed(1)}</small></div></div><button class="pv-fire${data.holy ? ' holy' : ''}" id="pv-fire">${T('pvFire')}</button>`;
    } else if (data.kind === 'move') {
      html = `<div class="pv-big ${data.ap === 1 ? 'high' : 'mid'}">${data.ap} ${T('ap')}</div><div class="pv-lines"><div><b>${T('pvMoveCost')}</b> ${data.ap === 2 ? '· ' + T('pvDash') : ''}</div>${data.ow ? `<div style="color:#f0b34a">${T('pvOwWarn')}</div>` : ''}<div><small>${T('pvCover')}: ${data.coverTxt}</small></div></div><button class="pv-fire" id="pv-fire">${T('pvConfirm')}</button>`;
    } else if (data.kind === 'area') {
      html = `<div class="pv-big mid">${data.count}</div><div class="pv-lines"><div><b>${data.name}</b></div><div>${T('pvTargets')}: ${data.targets || '—'}</div><div><small>${T('pvDmg')} <b>${data.dmg}</b></small></div></div><button class="pv-fire${data.holy ? ' holy' : ''}" id="pv-fire">${T('pvFire')}</button>`;
    } else if (data.kind === 'support') {
      html = `<div class="pv-big high">${data.ico}</div><div class="pv-lines"><div><b>${data.name}</b> · ${data.targetName}</div><div><small>${data.desc}</small></div></div><button class="pv-fire holy" id="pv-fire">${T('pvConfirm')}</button>`;
    }
    p.innerHTML = html; const btn = document.getElementById('pv-fire'); if (btn) btn.onclick = (e) => { e.stopPropagation(); HUD.scene.confirmPreview(); };
  };

  HUD.modal = function (html, buttons, cls) {
    HUD.ensure(); const o = HUD.el.overlay; o.innerHTML = ''; o.className = cls || ''; const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = html;
    if (buttons && buttons.length) { const row = document.createElement('div'); row.className = 'btns'; buttons.forEach(b => { const btn = document.createElement('button'); btn.textContent = b.label; if (b.secondary) btn.className = 'secondary'; btn.onclick = () => { TC.Audio.play('ui'); b.fn && b.fn(); }; row.appendChild(btn); }); m.appendChild(row); }
    o.appendChild(m); o.classList.remove('hidden'); return m;
  };
  HUD.closeModal = () => { HUD.ensure(); HUD.el.overlay.className = 'hidden'; HUD.el.overlay.innerHTML = ''; };
  HUD.helpHtml = function () { return `<h2>${T('helpTitle')}</h2><div class="help-grid">${T('help').map(h => `<div class="k">${h[0]}</div><div>${h[1]}</div>`).join('')}</div>`; };
})();
