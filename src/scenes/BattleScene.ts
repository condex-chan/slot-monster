import Phaser from 'phaser'

// バトルラッシュ画面の骨格。自動戦闘エンジンとの接続は F8 で実装する
export class BattleScene extends Phaser.Scene {
  constructor() {
    super('Battle')
  }

  create() {
    this.add
      .text(480, 200, 'バトルラッシュ！', { fontSize: '48px', color: '#ff5fd7' })
      .setOrigin(0.5)

    const back = this.add
      .text(480, 340, 'メインへ戻る', {
        fontSize: '26px',
        color: '#ffffff',
        backgroundColor: '#7a2ea0',
        padding: { x: 24, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    back.on('pointerdown', () => this.scene.start('Main'))
  }
}
