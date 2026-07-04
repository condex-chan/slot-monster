import Phaser from 'phaser'

class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create() {
    this.add
      .text(480, 270, 'モンスロ（仮）', {
        fontSize: '48px',
        color: '#ffd700',
      })
      .setOrigin(0.5)
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  backgroundColor: '#1a1026',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene],
})
