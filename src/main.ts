import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { MainScene } from './scenes/MainScene'

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
  scene: [BootScene, MainScene],
})
