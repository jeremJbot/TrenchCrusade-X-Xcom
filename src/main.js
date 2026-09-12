/* Trench Crusade × XCOM — entry point */
window.TC = window.TC || {};
(function () {
  function start() {
    if (!window.Phaser) { setTimeout(start, 50); return; }
    (TC.sceneFactories || []).forEach(f => f()); TC.sceneFactories = [];
    const config = {
      type: Phaser.AUTO, parent: 'game', backgroundColor: '#0b0907',
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER, width: window.innerWidth, height: window.innerHeight },
      render: { antialias: true, pixelArt: false, roundPixels: false, powerPreference: 'high-performance' },
      input: { activePointers: 3 },
      scene: [TC.BootScene, TC.MenuScene, TC.BattleScene],
    };
    TC.game = new Phaser.Game(config);
    const unlock = () => { TC.Audio.init(); };
    document.addEventListener('pointerdown', unlock, { passive: true }); document.addEventListener('touchstart', unlock, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
