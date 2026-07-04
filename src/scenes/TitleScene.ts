import Phaser from 'phaser'
import { hasSavedGame } from '../core/save'

// タイトル画面: 表示と入力のみ。セーブ復元は Boot 済みなので、
// ここでは「つづきから」かどうかの文言判定だけを行う
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title')
  }

  create() {
    this.add
      .text(480, 170, 'モンスロ（仮）', {
        fontSize: '64px',
        color: '#ffd700',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    this.add
      .text(480, 250, 'スロットで稼ぎ、ラッシュで登り、配合で強くなる', {
        fontSize: '22px',
        color: '#e8d8ff',
      })
      .setOrigin(0.5)

    const label = hasSavedGame() ? 'つづきから' : 'スタート'
    const button = this.add
      .text(480, 380, label, {
        fontSize: '30px',
        color: '#ffffff',
        backgroundColor: '#7a2ea0',
        padding: { x: 36, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    button.on('pointerdown', () => this.scene.start('Main'))

    // 目を引く軽い明滅（操作は待たせない）
    this.tweens.add({
      targets: button,
      alpha: 0.72,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  }
}
