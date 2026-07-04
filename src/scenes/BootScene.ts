import Phaser from 'phaser'
import { generateSymbolTextures } from '../assets/textures'

// 起動時の準備（動的テクスチャ生成など）を終えたら Main へ渡す
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create() {
    generateSymbolTextures(this)
    this.scene.start('Main')
  }
}
