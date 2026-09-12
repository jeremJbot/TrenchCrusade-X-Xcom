/* Menu: animated backdrop + DOM panels */
window.TC = window.TC || {};
TC.sceneFactories = TC.sceneFactories || [];
TC.sceneFactories.push(function () {
TC.MenuScene = class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }
  create() {
    const T = TC.T; const W = this.scale.width, H = this.scale.height; const A = TC.Art;
    this.cameras.main.setBackgroundColor('#0b0907');
    // backdrop: ground diamonds
    const ox = W / 2, oy = H * 0.22;
    for (let y = -8; y < 12; y++) for (let x = -8; x < 12; x++) { const wx = ox + (x - y) * A.HW, wy = oy + (x + y) * A.HH; const n = ((x * 11 + y * 17 + x * y) % 10 + 10) % 10; const d = Math.hypot(x, y); const gv = Math.round(Math.max(90, 220 - d * 14)); this.add.image(wx, wy, 'mud' + n).setDepth(0).setTint((gv << 16) | (gv << 8) | gv); }
    const props = [['wall', -1, -2], ['glass', 0, -2], ['wall2', 1, -2], ['wall', -2, -1], ['lowwall', 2, -1], ['altar', 0, 0], ['tree', -5, 1], ['sandbag', -3, 2], ['grave', 4, 2], ['shrine_lit', -3, 4], ['post', 3, 4], ['tree2', 5, -3], ['lowwall2', -4, -1], ['sandbag', 3, 1], ['grave', -6, 3]];
    props.forEach(([k, x, y]) => { const wx = ox + (x - y) * A.HW, wy = oy + (x + y) * A.HH; this.add.image(wx, wy + 16, k).setOrigin(0.5, 1).setDepth(x + y + 1); if (k === 'shrine_lit' || k === 'post' || k === 'altar') { const gl = this.add.image(wx, wy - 14, 'glow').setTint(0xffa040).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35).setScale(0.8).setDepth(x + y + 1.1); this.tweens.add({ targets: gl, alpha: { from: 0.25, to: 0.45 }, scale: { from: 0.7, to: 0.9 }, duration: 900 + Math.random() * 600, yoyo: true, repeat: -1 }); } });
    // units silhouettes
    [['captain', -1, 3], ['yeoman', -2, 4], ['priest', 0, 4], ['legionnaire', 3, -1], ['executioner', 4, 0], ['wolf', 5, -1]].forEach(([k, x, y]) => { const wx = ox + (x - y) * A.HW, wy = oy + (x + y) * A.HH; const s = this.add.image(wx, wy + 8, 'unit_' + k).setOrigin(0.5, 1).setDepth(x + y + 1.5); if (TC.UNIT_TYPES[k].faction === 'na') s.setFlipX(true); });
    // fog + embers
    this.fog1 = this.add.tileSprite(W / 2, H / 2, W * 2, H * 2, 'fog').setAlpha(0.6).setDepth(50).setScale(1.5); this.fog2 = this.add.tileSprite(W / 2, H / 2, W * 2, H * 2, 'fog').setAlpha(0.4).setDepth(51).setScale(2.2);
    this.add.particles(0, 0, 'particle', { x: { min: 0, max: W }, y: H + 10, lifespan: 6000, speedY: { min: -30, max: -60 }, speedX: { min: -15, max: 15 }, scale: { start: 0.25, end: 0 }, alpha: { start: 0.8, end: 0 }, tint: [0xffa040, 0xff6020, 0xd8b45a], frequency: 120, blendMode: 'ADD' }).setDepth(60);
    const dark = this.add.graphics().setDepth(70); dark.fillGradientStyle(0x0b0907, 0x0b0907, 0x0b0907, 0x0b0907, 1, 1, 0, 0); dark.fillRect(0, 0, W, H * 0.18);
    this.showMenu();
    this.scale.on('resize', () => this.scene.restart());
  }
  update(t, dt) { if (this.fog1) { this.fog1.tilePositionX += dt * 0.01; this.fog2.tilePositionX -= dt * 0.006; this.fog2.tilePositionY += dt * 0.003; } }
  showMenu() {
    const T = TC.T; TC.HUD.show(false);
    const html = `<div style="text-align:center;margin-bottom:6px"><div style="font-family:var(--font-title);font-weight:900;font-size:30px;letter-spacing:.14em;color:var(--gold2);text-shadow:0 0 24px rgba(216,180,90,.5),0 2px 0 #000">${T('title')}</div><div style="font-family:var(--font-title);font-size:11px;letter-spacing:.35em;color:var(--bone);opacity:.7;margin:2px 0 8px">× XCOM</div><div style="font-size:19px;font-style:italic;color:var(--bone)">${T('subtitle')}</div><div style="font-size:12px;opacity:.7;margin-top:4px">${T('tagline')}</div></div>
      <div class="row"><span>${T('language')}</span><div class="toggle" id="lang-toggle"><button data-l="fr" class="${TC.getLang() === 'fr' ? 'on' : ''}">FR</button><button data-l="en" class="${TC.getLang() === 'en' ? 'on' : ''}">EN</button></div></div>
      <div class="row"><span>${T('sound')}</span><div class="toggle" id="snd-toggle"><button data-s="1" class="${!TC.Audio.muted ? 'on' : ''}">${T('on')}</button><button data-s="0" class="${TC.Audio.muted ? 'on' : ''}">${T('off')}</button></div></div>`;
    const m = TC.HUD.modal(html, [
      { label: T('play'), fn: () => this.showBriefing() },
      { label: T('howto'), secondary: true, fn: () => { TC.HUD.modal(TC.HUD.helpHtml(), [{ label: T('back'), fn: () => this.showMenu() }]); } },
    ], 'menu');
    m.querySelectorAll('#lang-toggle button').forEach(b => b.onclick = () => { TC.setLang(b.dataset.l); TC.Audio.play('ui'); this.showMenu(); });
    m.querySelectorAll('#snd-toggle button').forEach(b => b.onclick = () => { TC.Audio.init(); TC.Audio.setMuted(b.dataset.s === '0'); TC.Audio.play('ui'); this.showMenu(); });
  }
  showBriefing() {
    const T = TC.T; TC.Audio.init(); TC.Audio.play('bell');
    const html = `<h2>${T('briefingTitle')}</h2><div class="sub">${T('subtitle')}</div><p>${T('briefing1')}</p><p>${T('briefing2')}</p><p style="color:var(--blood2)">${T('briefing3')}</p><h3>${T('objectives')}</h3><ul><li>${T('objPrimary')}</li><li>${T('objAlt')}</li><li>${T('objLimit')}</li><li>${T('objBonus')}</li></ul>`;
    TC.HUD.modal(html, [{ label: T('begin'), fn: () => { TC.HUD.closeModal(); TC.Audio.startAmbient(); this.scene.start('Battle', { seed: (Date.now() & 0xffffff) }); } }, { label: T('back'), secondary: true, fn: () => this.showMenu() }]);
  }
};
});
