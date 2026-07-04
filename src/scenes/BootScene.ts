import Phaser from 'phaser'

// 起動時の準備（後続 feature で動的テクスチャ生成などをここに置く）を終えたら Main へ渡す
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create() {
    this.scene.start('Main')
  }
}
