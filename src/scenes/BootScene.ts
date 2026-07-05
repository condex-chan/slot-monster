import Phaser from 'phaser'
import { generateMonsterTextures, generateSymbolTextures } from '../assets/textures'
import manifest from '../assets/manifest.json'
import { restoreIntoGameState } from '../core/save'
import { gameState } from '../core/state'
import { applyMuted } from '../ui/muteButton'

// 起動時の準備（セーブ復元・外部アセットロード・動的テクスチャ生成）を終えたら Main へ渡す。
// 外部アセットは manifest 記載のファイルだけを読む（存在確認のリクエストを飛ばさない）。
// 読み込んだキーは textures.exists によりコード生成テクスチャより優先される
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  preload() {
    for (const [key, file] of Object.entries<string>(manifest.images)) {
      this.load.image(key, file)
    }
    for (const [key, file] of Object.entries<string>(manifest.audio)) {
      this.load.audio(key, file)
    }
  }

  create() {
    restoreIntoGameState(gameState)
    applyMuted(this.game) // 復元したミュート設定を音を出す前に反映
    generateSymbolTextures(this)
    generateMonsterTextures(this)
    this.scene.start('Title')
  }
}
