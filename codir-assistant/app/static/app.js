/* Assistant CODIR FIN — interface locale.
 * Chaîne audio : micro → détection de parole (RMS) → segment → /api/stt (ou reconnaissance navigateur)
 *              → /api/sessions/{id}/listen|ask → réponse affichée → /api/tts (ou voix navigateur).
 * Aucune clé n'est présente ici : le navigateur ne parle qu'au serveur local.
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const state = {
    status: null, session: null, addressNext: false, micState: 'stopped', // stopped | listening | paused
    speaking: false, lastSilenceStart: null, pendingAsk: null, lastTurnId: null, seenSeq: 0,
    sttProvider: 'none', ttsProvider: 'none', interventions: [], autospeakBusy: false,
  };

  // ------------------------------------------------------------ utilitaires
  const toast = (msg, err = false) => { const t = $('toast'); t.textContent = msg; t.hidden = false; t.className = err ? 'err' : ''; clearTimeout(t._h); t._h = setTimeout(() => t.hidden = true, err ? 6000 : 3000); };
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const tag = (s, cls) => `<span class="tag ${cls || s}">${esc(s)}</span>`;
  async function api(path, opts = {}, retries = 0) {
    for (let attempt = 0; ; attempt++) {
      try {
        const r = await fetch(path, Object.assign({ headers: opts.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {} }, opts));
        setNet(true);
        if (!r.ok) { let d = ''; try { d = (await r.json()).detail; } catch {} const e = new Error(typeof d === 'string' ? d : `HTTP ${r.status}`); e.status = r.status; throw e; }
        const ct = r.headers.get('content-type') || '';
        return ct.includes('application/json') ? r.json() : r;
      } catch (e) {
        if (e.name === 'AbortError') throw e;
        if (!e.status) setNet(false);
        if (attempt >= retries || e.status) throw e;
        await new Promise(res => setTimeout(res, 500 * 2 ** attempt)); // reconnexion progressive
      }
    }
  }
  const post = (p, body, extra = {}, retries = 0) => api(p, Object.assign({ method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body || {}) }, extra), retries);
  const patch = (p, body) => api(p, { method: 'PATCH', body: JSON.stringify(body) });
  function setNet(ok) { const el = $('st-net'); el.textContent = ok ? 'Serveur : connecté' : 'Serveur : injoignable'; el.className = 'pill ' + (ok ? 'ok' : 'err'); }

  // ------------------------------------------------------------ état global
  async function loadStatus() {
    try { state.status = await api('/api/status'); } catch (e) { return; }
    const s = state.status, cfg = s.settings;
    const m = $('st-model');
    m.textContent = 'Modèle : ' + (s.llm_ready ? cfg.llm.model + (s.llm_simulated ? ' (SIMULÉ)' : '') : 'non configuré');
    m.className = 'pill ' + (s.llm_ready ? (s.llm_simulated ? 'warn' : 'ok') : 'err');
    const i = $('st-index');
    i.textContent = `Index : ${s.documents.total} doc., ${s.documents.chunks} extraits · recherche ${s.search_mode}`;
    i.className = 'pill ' + (s.documents.total ? 'ok' : 'warn');
    state.sttProvider = cfg.stt.provider; state.ttsProvider = cfg.tts.provider;
    $('audio-note').textContent = `Transcription : ${describe(cfg.stt)} · Synthèse : ${describe(cfg.tts)} · L'audio brut n'est pas conservé.`;
    setSession(s.session);
    renderSettings();
  }
  const describe = (p) => p.provider === 'browser' ? 'navigateur (audio envoyé au fournisseur du navigateur)' : p.provider === 'none' ? 'désactivée' : `${p.model || ''} via ${p.base_url}` + (p.key_configured === false ? ' — clé manquante' : '');

  function setSession(sess) {
    state.session = sess;
    const active = !!sess && sess.status === 'active';
    $('btn-session-start').hidden = active; $('btn-session-close').hidden = !active;
    $('session-info').textContent = active ? `Séance « ${sess.title} » démarrée ${new Date(sess.started_at).toLocaleString('fr-FR')} (id ${sess.id})` : 'Aucune séance active. Démarrer une séance pour activer le micro.';
    if (active) $('mode-select').value = sess.mode;
    $('st-mode').textContent = 'Mode : ' + ({ dialogue_dirige: 'A. dialogue dirigé', codir_assiste: 'B. CODIR assisté', codir_actif: 'C. CODIR actif (exp.)' }[active ? sess.mode : $('mode-select').value] || '…');
    ['btn-mic-start', 'btn-ask', 'btn-listen-text', 'btn-address'].forEach(id => $(id).disabled = !active);
    if (!active && state.micState !== 'stopped') stopMic();
    if (active) { refreshSidePanels(); loadTranscript(); }
  }

  // ------------------------------------------------------------ séance
  $('btn-session-start').onclick = async () => {
    try { setSession(await post('/api/sessions', { title: $('session-title').value, mode: $('mode-select').value })); $('conversation').innerHTML = ''; state.seenSeq = 0; loadTranscript(); }
    catch (e) { toast(e.message, true); }
  };
  $('btn-session-close').onclick = async () => { if (!state.session) return; stopMic(); await post(`/api/sessions/${state.session.id}/close`); await loadStatus(); toast('Séance clôturée.'); };
  $('mode-select').onchange = async () => {
    if (state.session && state.session.status === 'active') { try { setSession(await patch(`/api/sessions/${state.session.id}`, { mode: $('mode-select').value })); toast('Mode modifié.'); } catch (e) { toast(e.message, true); } }
    else $('st-mode').textContent = 'Mode : ' + $('mode-select').selectedOptions[0].textContent;
  };

  // ------------------------------------------------------------ conversation
  function addMsg(kind, text, meta, extraCls = '') {
    const c = $('conversation');
    const d = document.createElement('div'); d.className = `msg ${kind} ${extraCls}`;
    d.innerHTML = (meta ? `<div class="meta">${esc(meta)}</div>` : '') + esc(text);
    c.appendChild(d); c.scrollTop = c.scrollHeight; return d;
  }
  async function loadTranscript() {
    if (!state.session) return;
    try {
      const utts = await api(`/api/sessions/${state.session.id}/utterances?since_seq=${state.seenSeq}`);
      for (const u of utts) { if (u.seq <= state.seenSeq) continue; state.seenSeq = u.seq; addMsg(u.kind, u.text, `${u.speaker || (u.kind === 'assistant' ? 'assistant' : 'participant')} · ${new Date(u.ts).toLocaleTimeString('fr-FR')} · ${u.source || ''}`); }
    } catch {}
  }

  async function submitText(text, addressed, source) {
    if (!state.session || !text.trim()) return;
    const speaker = $('speaker').value.trim() || null;
    let addr = addressed;
    let t = text.trim();
    const m = t.match(/^\s*(assistant|l'assistant)\s*[,:!?]?\s*/i);
    if (m && !addr) { addr = true; t = t.slice(m[0].length) || t; }
    if (addr) return ask(t, speaker, source);
    return listen(t, speaker, source);
  }

  async function ask(text, speaker, source) {
    // une nouvelle question rend la précédente obsolète côté client ; le serveur annule le tour précédent
    if (state.pendingAsk) { state.pendingAsk.abort(); state.pendingAsk = null; if (state.lastTurnId) post(`/api/turns/${state.lastTurnId}/cancel`).catch(() => {}); }
    stopVoice();
    const ctrl = new AbortController(); state.pendingAsk = ctrl;
    const wait = addMsg('system', 'L’assistant recherche…');
    try {
      const r = await post(`/api/sessions/${state.session.id}/ask`, { text, speaker, source }, { signal: ctrl.signal });
      if (ctrl !== state.pendingAsk) return; // réponse devenue obsolète
      wait.remove(); state.lastTurnId = r.turn_id;
      handleTurnResult(r, true);
    } catch (e) { wait.remove(); if (e.name !== 'AbortError') { toast(e.message, true); addMsg('system', 'Erreur : ' + e.message); } }
    finally { if (ctrl === state.pendingAsk) state.pendingAsk = null; loadTranscript(); }
  }

  async function listen(text, speaker, source) {
    try {
      const r = await post(`/api/sessions/${state.session.id}/listen`, { text, speaker, source }, {}, 1);
      handleTurnResult(r, false);
    } catch (e) { toast('Segment non traité : ' + e.message, true); }
    finally { loadTranscript(); }
  }

  function handleTurnResult(r, addressed) {
    loadTranscript();
    if (r.erreur) { addMsg('system', 'Erreur modèle : ' + r.erreur); return; }
    if (!r.traite) { if (r.motif && addressed) addMsg('system', r.motif); return; }
    if (r.repondre && r.reponse_ecrite) {
      state.seenSeq = Math.max(state.seenSeq, 0);
      renderSources(r);
      if ($('voice-on').checked && r.reponse_orale) speak(r.reponse_orale);
    }
    if (r.references_rejetees && r.references_rejetees.length) toast(`Références non vérifiables écartées : ${r.references_rejetees.join(', ')}`, true);
    const p = r.propositions || {};
    const n = (p.souvenirs || []).length + (p.decisions || []).length + (p.actions || []).length + (p.clarifications || []).length;
    if (n) toast(`${n} proposition(s) enregistrée(s) (à valider dans les onglets).`);
    if (r.intervention && r.intervention.enregistree) { toast('Nouvelle intervention proposée.'); maybeAutoSpeak(r.intervention.intervention); }
    refreshSidePanels();
  }

  $('ask-form').onsubmit = (e) => { e.preventDefault(); const v = $('ask-input').value; $('ask-input').value = ''; submitText(v, true, 'clavier'); };
  $('btn-listen-text').onclick = () => { const v = $('ask-input').value; $('ask-input').value = ''; submitText(v, false, 'clavier'); };
  $('btn-address').onclick = () => { state.addressNext = !state.addressNext; $('btn-address').classList.toggle('primary', state.addressNext); $('listen-text').textContent = state.addressNext ? 'Prochain segment adressé à l’assistant' : listenLabel(); };

  // ------------------------------------------------------------ sources
  function renderSources(r) {
    const box = $('sources');
    let html = `<div class="card ${r.simule ? 'simulated' : ''}"><div class="title">Réponse${r.simule ? ' — MODE SIMULÉ (aucune validation réelle)' : ''}</div><div>${esc(r.reponse_ecrite)}</div>
      <div class="small muted">Modèle : ${esc(r.modele)} · recherche ${esc(r.mode_recherche)} · ${esc(r.controle_references)}</div></div>`;
    if (!r.sources.length) html += '<p class="muted">Aucune source citée : la réponse ne s’appuie sur aucun extrait retrouvé.</p>';
    for (const s of r.sources) html += `<div class="card"><div class="title">${esc(s.document)} ${tag(s.statut_document)} <span class="muted small">${esc(s.repere)}${s.version ? ' · version ' + esc(s.version) : ''}${s.date_contenu ? ' · contenu daté ' + esc(s.date_contenu) : ''}</span></div><div class="quote">${esc(s.extrait)}</div><div class="small muted">${esc(s.chunk_id)}</div></div>`;
    for (const m of r.souvenirs_cites || []) html += `<div class="card"><div class="title">Souvenir ${tag(m.statut)} ${m.a_reexaminer ? tag('à réexaminer', 'review') : ''}</div>${esc(m.contenu)}<div class="small muted">${esc(m.memory_id)}</div></div>`;
    box.innerHTML = html;
    if (!$('tab-sources').classList.contains('active')) toast('Sources mises à jour (onglet Sources).');
  }

  // ------------------------------------------------------------ panneaux latéraux
  async function refreshSidePanels() {
    if (!state.session) return;
    const sid = state.session.id;
    try {
      const [ints, clars, mems, decs, acts] = await Promise.all([
        api(`/api/sessions/${sid}/interventions`), api(`/api/sessions/${sid}/clarifications?status=ouverte`),
        api(`/api/memories${$('mem-filter').value ? '?status=' + $('mem-filter').value : ''}`), api('/api/decisions'), api('/api/actions')]);
      state.interventions = ints; renderInterventions(ints); renderClarifications(clars); renderMemories(mems); renderDecisions(decs); renderActions(acts);
    } catch {}
  }
  function renderInterventions(list) {
    const pending = list.filter(i => i.status === 'proposee' || i.status === 'reportee');
    $('badge-int').textContent = pending.length;
    $('interventions').innerHTML = list.length ? list.map(i => `<div class="card"><div class="title">${tag(i.status)} ${tag(i.trigger)} <span class="muted small">${new Date(i.ts).toLocaleTimeString('fr-FR')}</span></div>
      <div>${esc(i.text)}</div><div class="small muted">Motif : ${esc(i.motif)} · Sources : ${i.sources.length ? i.sources.map(esc).join(', ') : 'aucune'}</div>
      ${pending.includes(i) ? `<div class="actions"><button class="small-btn primary" data-act="lire" data-id="${i.id}">Lire à voix haute</button><button class="small-btn" data-act="reverifier" data-id="${i.id}">Revérifier l’utilité</button><button class="small-btn" data-act="reporter" data-id="${i.id}">Reporter</button><button class="small-btn danger" data-act="rejeter" data-id="${i.id}">Rejeter</button></div>` : ''}</div>`).join('') : '<p class="muted">Aucune intervention proposée.</p>';
  }
  $('interventions').onclick = async (e) => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const { act, id } = b.dataset;
    try {
      if (act === 'lire') { const it = await post(`/api/interventions/${id}/lire`); addMsg('assistant', it.text, 'intervention lue par l’animateur'); if ($('voice-on').checked) speak(it.text); }
      else if (act === 'reverifier') { const v = await post(`/api/interventions/${id}/reverifier`); toast((v.toujours_utile ? 'Toujours utile : ' : 'Devenue inutile : ') + v.motif); }
      else await post(`/api/interventions/${id}/${act}`);
      refreshSidePanels();
    } catch (err) { toast(err.message, true); }
  };
  $('btn-suspend').onclick = async () => { if (state.session) { await post(`/api/sessions/${state.session.id}/interventions/suspendre`); stopVoice(); refreshSidePanels(); toast('Interventions suspendues (reportées).'); } };

  async function maybeAutoSpeak(it) {
    // Mode C : lecture automatique uniquement lors d'une pause détectée, après revérification serveur.
    if (!state.session || state.session.mode !== 'codir_actif' || !$('voice-on').checked || state.autospeakBusy) return;
    state.autospeakBusy = true;
    try {
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        const silence = state.micState === 'listening' && state.lastSilenceStart ? Date.now() - state.lastSilenceStart : (state.micState === 'stopped' ? 99999 : 0);
        if (silence >= 1500 && !state.speaking) {
          const v = await post(`/api/interventions/${it.id}/autoriser-lecture-auto`, { silence_ms: Math.round(silence) });
          if (v.autorisee) { addMsg('assistant', v.intervention.text, 'intervention automatique (mode actif)'); speak(v.intervention.text); }
          else toast('Lecture automatique refusée : ' + v.motif);
          refreshSidePanels(); return;
        }
        await new Promise(r => setTimeout(r, 400));
      }
      toast('Pas de pause détectée : intervention laissée dans la file.');
    } catch (e) { toast(e.message, true); } finally { state.autospeakBusy = false; }
  }

  function renderClarifications(list) {
    $('clarifications-box').innerHTML = list.length ? `<div class="panel-title">Demandes de confirmation</div>` + list.map(c => `<div class="card"><div>${esc(c.question)}</div><div class="small muted">Motif : ${esc(c.reason)}</div>
      <div class="actions"><input placeholder="Réponse" data-clar-input="${c.id}" size="24"><button class="small-btn" data-clar="${c.id}" data-st="repondue">Confirmer</button><button class="small-btn" data-clar="${c.id}" data-st="ignoree">Ignorer</button></div></div>`).join('') : '';
  }
  $('clarifications-box').onclick = async (e) => {
    const b = e.target.closest('button[data-clar]'); if (!b) return;
    const answer = (document.querySelector(`[data-clar-input="${b.dataset.clar}"]`) || {}).value || null;
    await post(`/api/clarifications/${b.dataset.clar}`, { answer, status: b.dataset.st });
    if (answer && b.dataset.st === 'repondue') submitText(`Confirmation : ${answer}`, false, 'clavier');
    refreshSidePanels();
  };

  const srcLabel = (m) => { const r = m.source_ref || {}; if (m.source_type === 'document') return `document ${r.document_id || ''} · extrait ${r.chunk_id || ''}`; if (m.source_type === 'seance') return `séance ${r.session_id || ''} · énoncé ${r.utterance_id || 'n/c'}`; return 'saisie utilisateur'; };
  function renderMemories(list) {
    $('badge-mem').textContent = list.filter(m => m.status === 'declare' || m.status === 'a_confirmer' || m.needs_review).length;
    $('memories').innerHTML = list.length ? list.map(m => `<div class="card"><div class="title">${tag(m.status)} ${tag(m.type, 'type')} ${m.needs_review ? tag('à réexaminer', 'review') : ''} ${m.dossier ? tag(m.dossier, 'dossier') : ''}</div>
      <div contenteditable="true" data-mem-content="${m.id}">${esc(m.content)}</div>
      <div class="small muted">Source : ${esc(srcLabel(m))} · auteur : ${esc(m.author || 'non identifié')} · effet : ${esc(m.effective_at || 'n/c')}${m.review_reason ? ' · ' + esc(m.review_reason) : ''}${m.relations && m.relations.length ? ' · relations : ' + esc(m.relations.map(r => r.type + ' ' + r.memory_id).join(', ')) : ''}</div>
      <div class="actions"><button class="small-btn primary" data-mem="${m.id}" data-st="valide">Valider</button><button class="small-btn" data-mem="${m.id}" data-st="a_confirmer">À confirmer</button><button class="small-btn" data-mem="${m.id}" data-st="conteste">Contester</button><button class="small-btn" data-mem-save="${m.id}">Enregistrer la correction</button><button class="small-btn" data-mem-hist="${m.id}">Historique</button><button class="small-btn danger" data-mem-del="${m.id}">Supprimer</button></div><div class="small muted" data-hist="${m.id}"></div></div>`).join('') : '<p class="muted">Mémoire vide.</p>';
  }
  $('memories').onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    try {
      if (b.dataset.mem) await post(`/api/memories/${b.dataset.mem}/status`, { status: b.dataset.st, motif: 'Validation dans l’interface' });
      else if (b.dataset.memSave) { const content = document.querySelector(`[data-mem-content="${b.dataset.memSave}"]`).innerText.trim(); await patch(`/api/memories/${b.dataset.memSave}`, { content, motif: 'Correction dans l’interface' }); toast('Correction historisée.'); }
      else if (b.dataset.memHist) { const h = await api(`/api/memories/${b.dataset.memHist}/history`); document.querySelector(`[data-hist="${b.dataset.memHist}"]`).textContent = h.map(x => `${x.ts} ${x.actor} ${JSON.stringify(x.change)}`).join('\n'); return; }
      else if (b.dataset.memDel) { if (!confirm('Supprimer ce souvenir ?')) return; await api(`/api/memories/${b.dataset.memDel}`, { method: 'DELETE' }); }
      refreshSidePanels();
    } catch (err) { toast(err.message, true); }
  };
  $('mem-filter').onchange = refreshSidePanels;
  $('mem-form').onsubmit = async (e) => { e.preventDefault(); if (!$('mem-content').value.trim()) return; await post('/api/memories', { content: $('mem-content').value, dossier: $('mem-dossier').value || null, type: 'fait', status: 'declare' }); $('mem-content').value = ''; refreshSidePanels(); };

  function renderDecisions(list) {
    $('badge-dec').textContent = list.filter(d => d.status === 'proposee').length + '/' + (state._actPending || 0);
    $('decisions').innerHTML = list.length ? list.map(d => `<div class="card"><div class="title">${tag(d.status)} ${d.dossier ? tag(d.dossier, 'dossier') : ''} <span class="muted small">proposée par ${esc(d.proposed_by)}</span></div><div>${esc(d.objet)}</div>
      <div class="actions">${d.status !== 'validee' ? `<button class="small-btn primary" data-dec="${d.id}" data-st="validee">Valider la décision</button>` : ''}${d.status !== 'rejetee' ? `<button class="small-btn danger" data-dec="${d.id}" data-st="rejetee">Rejeter</button>` : ''}</div></div>`).join('') : '<p class="muted">Aucune décision.</p>';
  }
  function renderActions(list) {
    state._actPending = list.filter(a => a.status === 'proposee').length;
    $('badge-dec').textContent = ($('decisions').querySelectorAll('.tag.proposee').length) + '/' + state._actPending;
    $('actions').innerHTML = list.length ? list.map(a => `<div class="card"><div class="title">${tag(a.status)} ${(a.champs_manquants || []).map(f => tag(f + ' manquant', 'missing')).join('')}</div><div>${esc(a.objet)}</div>
      <div class="row small"><label>Responsable <input data-act-field="responsable" data-id="${a.id}" value="${esc(a.responsable || '')}" size="12"></label><label>Échéance <input data-act-field="echeance" data-id="${a.id}" value="${esc(a.echeance || '')}" size="10"></label><label>Dossier <input data-act-field="dossier" data-id="${a.id}" value="${esc(a.dossier || '')}" size="10"></label></div>
      <div class="actions"><button class="small-btn" data-act-save="${a.id}">Enregistrer</button>${a.status === 'proposee' ? `<button class="small-btn primary" data-act-st="${a.id}" data-st="validee">Valider l’action</button><button class="small-btn danger" data-act-st="${a.id}" data-st="rejetee">Rejeter</button>` : ''}${a.status === 'validee' ? `<button class="small-btn" data-act-st="${a.id}" data-st="terminee">Terminée</button>` : ''}</div></div>`).join('') : '<p class="muted">Aucune action.</p>';
  }
  const actFields = (id) => { const o = {}; document.querySelectorAll(`[data-act-field][data-id="${id}"]`).forEach(i => o[i.dataset.actField] = i.value); return o; };
  $('tab-decisions').onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    try {
      if (b.dataset.dec) await patch(`/api/decisions/${b.dataset.dec}`, { status: b.dataset.st });
      else if (b.dataset.actSave) await patch(`/api/actions/${b.dataset.actSave}`, actFields(b.dataset.actSave));
      else if (b.dataset.actSt) await patch(`/api/actions/${b.dataset.actSt}`, Object.assign(actFields(b.dataset.actSt), { status: b.dataset.st }));
      else return;
      refreshSidePanels();
    } catch (err) { toast(err.message, true); }
  };
  $('dec-form').onsubmit = async (e) => { e.preventDefault(); if (!$('dec-objet').value.trim()) return; await post('/api/decisions', { objet: $('dec-objet').value, dossier: $('dec-dossier').value || null }); $('dec-objet').value = ''; refreshSidePanels(); };
  $('act-form').onsubmit = async (e) => { e.preventDefault(); if (!$('act-objet').value.trim()) return; await post('/api/actions', { objet: $('act-objet').value, responsable: $('act-resp').value || null, echeance: $('act-ech').value || null }); $('act-objet').value = ''; refreshSidePanels(); };
  $('btn-minutes').onclick = async () => { if (!state.session) return; const m = await api(`/api/sessions/${state.session.id}/minutes`); $('minutes').hidden = false; $('minutes').textContent = m.markdown; };

  // ------------------------------------------------------------ documents
  async function loadDocuments() {
    const d = await api('/api/documents');
    $('docs-dir').textContent = `Répertoire : ${d.docs_dir} · formats : ${d.formats.join(', ')} · PDF image → OCR requis (non pris en charge en V1)`;
    $('documents').innerHTML = d.documents.length ? d.documents.map(doc => `<div class="card"><div class="title">${esc(doc.name)} ${tag(doc.index_state)} ${tag(doc.doc_status)}</div>
      <div class="small muted">${doc.chunk_count} extrait(s) · empreinte ${esc((doc.sha256 || '').slice(0, 12))} · import ${esc(doc.imported_at)} · fichier modifié ${esc(doc.file_modified_at || 'n/c')}${doc.index_error ? ' · ' + esc(doc.index_error) : ''}${doc.deleted_at ? ' · supprimé du répertoire le ' + esc(doc.deleted_at) : ''}</div>
      ${doc.deleted_at ? '' : `<div class="row small"><select data-doc-status="${doc.id}">${['inconnu', 'reference_validee', 'document_de_travail', 'archive'].map(s => `<option value="${s}" ${doc.doc_status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <input placeholder="Version" data-doc-version="${doc.id}" value="${esc(doc.version_label || '')}" size="8"><input placeholder="Date du contenu" data-doc-date="${doc.id}" value="${esc(doc.content_date || '')}" size="12"><button class="small-btn" data-doc-save="${doc.id}">Enregistrer</button><button class="small-btn" data-doc-view="${doc.id}">Extraits</button></div>`}<pre class="minutes small" data-doc-chunks="${doc.id}" hidden></pre></div>`).join('') : '<p class="muted">Aucun document. Déposer des fichiers dans le répertoire puis « Actualiser ».</p>';
  }
  $('documents').onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.docSave) { const id = b.dataset.docSave; await patch(`/api/documents/${id}`, { doc_status: document.querySelector(`[data-doc-status="${id}"]`).value, version_label: document.querySelector(`[data-doc-version="${id}"]`).value, content_date: document.querySelector(`[data-doc-date="${id}"]`).value }); toast('Métadonnées enregistrées.'); loadDocuments(); }
    if (b.dataset.docView) { const r = await api(`/api/documents/${b.dataset.docView}/chunks`); const pre = document.querySelector(`[data-doc-chunks="${b.dataset.docView}"]`); pre.hidden = !pre.hidden; pre.textContent = r.chunks.map(c => `[${c.id}] ${c.page ? 'page ' + c.page : (c.section ? 'section « ' + c.section + '» ' : '') + (c.paragraph_ref || '')}\n${c.text}\n`).join('\n'); }
  };
  $('btn-refresh-docs').onclick = async () => { const r = await post('/api/documents/refresh'); toast(`Actualisation : ${r.indexed.length} indexé(s), ${r.unchanged.length} inchangé(s), ${r.unusable.length} inexploitable(s), ${r.removed.length} supprimé(s)` + (r.reviews.length ? `, ${r.reviews.length} souvenir(s) à réexaminer` : '')); loadDocuments(); loadStatus(); };
  $('file-input').onchange = async () => {
    for (const f of $('file-input').files) { const fd = new FormData(); fd.append('file', f); try { const r = await post('/api/documents/upload', fd); toast(`${f.name} : ${r.document.index_state}${r.document.index_error ? ' — ' + r.document.index_error : ''}`, r.document.index_state !== 'indexe'); } catch (e) { toast(e.message, true); } }
    $('file-input').value = ''; loadDocuments(); loadStatus();
  };

  // ------------------------------------------------------------ réglages
  function renderSettings() {
    const c = state.status.settings, pe = state.status.provider_errors || {};
    const kv = (o) => Object.entries(o).map(([k, v]) => `<div>${esc(k)}</div><div>${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</div>`).join('');
    $('settings').innerHTML = `<div class="kv">${kv({ 'Serveur': `${c.host}:${c.port} (local uniquement)`, 'Répertoire documents': c.docs_dir, 'Modèle': c.llm, 'Transcription': c.stt, 'Synthèse': c.tts, 'Embeddings': c.embeddings, 'Interventions': c.intervention, 'Erreurs de configuration': Object.keys(pe).length ? pe : 'aucune' })}</div><p class="small muted">Les clés sont lues côté serveur depuis le fichier .env et ne sont jamais transmises au navigateur.</p>`;
    $('retention').innerHTML = `<div class="kv">${kv(c.retention)}</div>`;
  }
  $('btn-diag').onclick = async () => { $('diag').innerHTML = '<p class="muted">Test en cours…</p>'; const d = await post('/api/diagnostics'); $('diag').innerHTML = Object.entries(d).map(([k, v]) => `<div class="card"><b>${esc(k)}</b> ${tag(v.ok ? 'ok' : 'échec', v.ok ? 'valide' : 'erreur')} <span class="small">${esc(v.detail)}</span></div>`).join(''); };

  // ------------------------------------------------------------ onglets
  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => { document.querySelectorAll('#tabs button, .tab').forEach(x => x.classList.remove('active')); b.classList.add('active'); $('tab-' + b.dataset.tab).classList.add('active'); if (b.dataset.tab === 'documents') loadDocuments(); });

  // ------------------------------------------------------------ AUDIO : capture
  const audio = { stream: null, ctx: null, analyser: null, recorder: null, chunks: [], speech: false, speechStart: 0, silenceSince: 0, noise: 0.01, raf: null, recog: null, partialEl: null, mime: '' };
  const listenLabel = () => state.micState === 'listening' ? (state.speaking ? 'Assistant en train de parler (micro ignoré)' : 'Écoute active — en attente de parole') : state.micState === 'paused' ? 'Micro suspendu (aucun envoi)' : 'Écoute inactive';
  function setIndicator(cls) { const el = $('listen-indicator'); el.className = 'indicator ' + cls; $('listen-text').textContent = state.addressNext ? 'Prochain segment adressé à l’assistant' : listenLabel(); const p = $('st-audio'); p.textContent = 'Micro : ' + ({ listening: 'écoute', speech: 'parole détectée', paused: 'suspendu', off: 'arrêté', speaking: 'voix assistant' }[cls] || cls); p.className = 'pill ' + (cls === 'off' ? '' : cls === 'paused' ? 'warn' : 'ok'); }
  function micButtons() { const s = state.micState; $('btn-mic-start').disabled = s !== 'stopped' || !state.session; $('btn-mic-pause').disabled = s !== 'listening'; $('btn-mic-pause').hidden = s === 'paused'; $('btn-mic-resume').hidden = s !== 'paused'; $('btn-mic-resume').disabled = s !== 'paused'; $('btn-mic-stop').disabled = s === 'stopped'; }

  async function startMic() {
    if (!state.session) return;
    if (state.sttProvider === 'none') { toast('Transcription désactivée (STT_PROVIDER=none) : utiliser le clavier.', true); return; }
    try {
      audio.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (e) { toast('Micro refusé ou indisponible : ' + e.message, true); return; }
    audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = audio.ctx.createMediaStreamSource(audio.stream);
    audio.analyser = audio.ctx.createAnalyser(); audio.analyser.fftSize = 1024; src.connect(audio.analyser);
    state.micState = 'listening'; state.lastSilenceStart = Date.now(); setIndicator('listening'); micButtons();
    if (state.sttProvider === 'browser') startBrowserRecognition(); else { audio.mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'].find(m => MediaRecorder.isTypeSupported(m)) || ''; }
    vadLoop();
  }
  function pauseMic() { if (state.micState !== 'listening') return; state.micState = 'paused'; audio.stream.getTracks().forEach(t => t.enabled = false); stopRecorder(false); if (audio.recog) { try { audio.recog.stop(); } catch {} } setIndicator('paused'); micButtons(); }
  function resumeMic() { if (state.micState !== 'paused') return; audio.stream.getTracks().forEach(t => t.enabled = true); state.micState = 'listening'; state.lastSilenceStart = Date.now(); if (state.sttProvider === 'browser') startBrowserRecognition(); setIndicator('listening'); micButtons(); }
  function stopMic() { stopRecorder(false); if (audio.recog) { try { audio.recog.onend = null; audio.recog.stop(); } catch {} audio.recog = null; } if (audio.raf) cancelAnimationFrame(audio.raf); if (audio.stream) audio.stream.getTracks().forEach(t => t.stop()); if (audio.ctx) audio.ctx.close().catch(() => {}); audio.stream = audio.ctx = null; state.micState = 'stopped'; setIndicator('off'); micButtons(); $('level').value = 0; if (audio.partialEl) { audio.partialEl.remove(); audio.partialEl = null; } }
  $('btn-mic-start').onclick = startMic; $('btn-mic-pause').onclick = pauseMic; $('btn-mic-resume').onclick = resumeMic; $('btn-mic-stop').onclick = stopMic;

  // Détection de parole par énergie (RMS) avec plancher de bruit adaptatif.
  function vadLoop() {
    if (!audio.analyser) return;
    const buf = new Float32Array(audio.analyser.fftSize); audio.analyser.getFloatTimeDomainData(buf);
    let sum = 0; for (const v of buf) sum += v * v; const rms = Math.sqrt(sum / buf.length);
    $('level').value = Math.min(1, rms * 8);
    const now = Date.now();
    if (state.micState === 'listening') {
      if (!audio.speech) audio.noise = audio.noise * 0.98 + rms * 0.02;
      const threshold = Math.max(0.015, audio.noise * 3);
      if (state.speaking) {
        // voix de l'assistant en cours : rien n'est envoyé ; interruption vocale si demandée et parole nette
        if ($('barge-in').checked && rms > Math.max(0.05, threshold * 2)) { if (!audio.bargeSince) audio.bargeSince = now; else if (now - audio.bargeSince > 400) { stopVoice(); toast('Voix interrompue par un participant.'); } } else audio.bargeSince = 0;
      } else if (state.sttProvider !== 'browser') {
        if (rms > threshold) {
          audio.silenceSince = 0; state.lastSilenceStart = null;
          if (!audio.speech) { audio.speech = true; audio.speechStart = now; startRecorder(); setIndicator('speech'); }
        } else if (audio.speech) {
          if (!audio.silenceSince) audio.silenceSince = now;
          else if (now - audio.silenceSince > 900) { audio.speech = false; state.lastSilenceStart = now; stopRecorder(now - audio.speechStart > 400); setIndicator('listening'); }
        } else if (!state.lastSilenceStart) state.lastSilenceStart = now;
        if (audio.speech && now - audio.speechStart > 60000) { audio.speech = false; stopRecorder(true); } // segment max 60 s
      }
    }
    audio.raf = requestAnimationFrame(vadLoop);
  }
  function startRecorder() {
    if (!audio.stream || audio.recorder) return;
    try { audio.recorder = new MediaRecorder(audio.stream, audio.mime ? { mimeType: audio.mime } : undefined); } catch (e) { toast('Enregistrement impossible : ' + e.message, true); return; }
    audio.chunks = [];
    audio.recorder.ondataavailable = (e) => { if (e.data.size) audio.chunks.push(e.data); };
    audio.recorder.onstop = () => { const send = audio.recorder._send; const blob = new Blob(audio.chunks, { type: audio.recorder.mimeType }); audio.recorder = null; audio.chunks = []; if (send) sendSegment(blob); else if (audio.partialEl) { audio.partialEl.remove(); audio.partialEl = null; } };
    audio.recorder.start();
    audio.partialEl = addMsg('partial', '🎙 Parole en cours…');
  }
  function stopRecorder(send) { if (!audio.recorder) return; audio.recorder._send = send; if (audio.recorder.state !== 'inactive') audio.recorder.stop(); else audio.recorder = null; }

  async function sendSegment(blob) {
    const el = audio.partialEl; audio.partialEl = null;
    if (el) el.textContent = '⏳ Transcription en cours…';
    const fd = new FormData(); fd.append('file', blob, 'segment.webm');
    try {
      const r = await post('/api/stt', fd, {}, 2);
      if (el) el.remove();
      if (!r.text) return;
      const addressed = state.addressNext; if (addressed) { state.addressNext = false; $('btn-address').classList.remove('primary'); setIndicator(state.micState === 'listening' ? 'listening' : 'paused'); }
      await submitText(r.text, addressed, 'micro');
    } catch (e) { if (el) { el.textContent = '⚠ Transcription échouée : ' + e.message; el.classList.add('system'); } }
  }

  // Reconnaissance vocale du navigateur (partiels natifs). L'audio part chez le fournisseur du navigateur.
  function startBrowserRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast('Reconnaissance vocale non disponible dans ce navigateur (utiliser Chrome/Edge ou STT_PROVIDER=openai_compatible).', true); stopMic(); return; }
    const rec = new SR(); rec.lang = (state.status.settings.stt.language || 'fr') + '-FR'; rec.continuous = true; rec.interimResults = true;
    rec.onresult = (e) => {
      if (state.speaking) return; // ne pas réingérer la voix de l'assistant
      let interim = '', finals = [];
      for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) finals.push(t); else interim += t; }
      if (interim) { if (!audio.partialEl) audio.partialEl = addMsg('partial', ''); audio.partialEl.textContent = '🎙 ' + interim; setIndicator('speech'); state.lastSilenceStart = null; }
      for (const t of finals) { if (audio.partialEl) { audio.partialEl.remove(); audio.partialEl = null; } state.lastSilenceStart = Date.now(); setIndicator('listening'); const addressed = state.addressNext; if (addressed) { state.addressNext = false; $('btn-address').classList.remove('primary'); } submitText(t, addressed, 'micro'); }
    };
    rec.onerror = (e) => { if (e.error !== 'no-speech' && e.error !== 'aborted') toast('Reconnaissance : ' + e.error, true); };
    rec.onend = () => { if (state.micState === 'listening' && audio.recog === rec) { try { rec.start(); } catch {} } }; // reconnexion automatique
    audio.recog = rec; try { rec.start(); } catch (e) { toast(e.message, true); }
  }

  // ------------------------------------------------------------ AUDIO : synthèse
  const voice = { el: null, ctrl: null };
  async function speak(text) {
    stopVoice();
    if (!text) return;
    state.speaking = true; $('btn-voice-stop').disabled = false; setIndicator(state.micState === 'listening' ? 'speaking' : state.micState === 'paused' ? 'paused' : 'off');
    const done = () => { state.speaking = false; $('btn-voice-stop').disabled = true; state.lastSilenceStart = Date.now(); setIndicator(state.micState === 'listening' ? 'listening' : state.micState === 'paused' ? 'paused' : 'off'); };
    try {
      if (state.ttsProvider === 'browser') {
        if (!window.speechSynthesis) { toast('Synthèse vocale du navigateur indisponible.', true); done(); return; }
        const u = new SpeechSynthesisUtterance(text); u.lang = 'fr-FR'; u.onend = done; u.onerror = done; voice.el = u; speechSynthesis.speak(u);
      } else if (state.ttsProvider === 'openai_compatible') {
        voice.ctrl = new AbortController();
        const r = await api('/api/tts', { method: 'POST', body: JSON.stringify({ text }), signal: voice.ctrl.signal });
        const blob = await r.blob(); if (!state.speaking) return;
        const el = new Audio(URL.createObjectURL(blob)); voice.el = el; el.onended = done; el.onerror = () => { toast('Lecture audio impossible.', true); done(); };
        await el.play();
      } else { toast('Synthèse désactivée (TTS_PROVIDER=none) : réponse affichée uniquement.'); done(); }
    } catch (e) { if (e.name !== 'AbortError') toast('Synthèse vocale : ' + e.message, true); done(); }
  }
  function stopVoice() {
    if (voice.ctrl) { voice.ctrl.abort(); voice.ctrl = null; }
    if (voice.el instanceof HTMLAudioElement) { voice.el.pause(); voice.el.src = ''; }
    if (window.speechSynthesis) speechSynthesis.cancel();
    voice.el = null;
    if (state.speaking) { state.speaking = false; $('btn-voice-stop').disabled = true; state.lastSilenceStart = Date.now(); setIndicator(state.micState === 'listening' ? 'listening' : state.micState === 'paused' ? 'paused' : 'off'); }
  }
  $('btn-voice-stop').onclick = stopVoice;

  // ------------------------------------------------------------ démarrage
  loadStatus().then(loadDocuments);
  setInterval(() => { loadStatus(); if (state.session && state.session.status === 'active') { refreshSidePanels(); loadTranscript(); } }, 8000);
  micButtons();
})();
