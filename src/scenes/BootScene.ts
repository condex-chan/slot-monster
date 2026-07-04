import Phaser from 'phaser'
import { generateMonsterTextures, generateSymbolTextures } from '../assets/textures'
import { restoreIntoGameState } from '../core/save'
import { gameState } from '../core/state'

// 起動時の準備（セーブ復元・動的テクスチャ生成）を終えたら Main へ渡す
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create() {
    restoreIntoGameState(gameState)
    generateSymbolTextures(this)
    generateMonsterTextures(this)
    this.scene.start('Main')
  }
}
