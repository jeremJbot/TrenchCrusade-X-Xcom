/* Boot: build procedural textures */
window.TC = window.TC || {};
TC.sceneFactories = TC.sceneFactories || [];
TC.sceneFactories.push(function () {
TC.BootScene = class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    TC.Art.build(this);
    TC.setLang(TC.getLang());
    const el = document.getElementById('loading'); if (el) el.remove();
    this.scene.start('Menu');
  }
};
});
