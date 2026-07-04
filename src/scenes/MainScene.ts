import Phaser from 'phaser'

// メイン画面: スロット中央＋パーティ表示＋各種メーター（後続 feature で実装）
export class MainScene extends Phaser.Scene {
  constructor() {
    super('Main')
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
