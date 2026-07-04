import Phaser from 'phaser'
import { bgm } from '../assets/bgm'
import { clearSavedGame, hasSavedGame } from '../core/save'
import { createInitialState, gameState } from '../core/state'
import { addButton, setButtonColor } from '../ui/button'
import { applyMuted } from '../ui/muteButton'
import { fadeIn, fadeToScene } from '../ui/transitions'

// タイトル画面: 表示と入力のみ。セーブ復元は Boot 済みなので、
// ここでは「つづきから」かどうかの文言判定だけを行う
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title')
  }

  create() {
    bgm.enter(this, 'Title')
    fadeIn(this)
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

    const hasSave = hasSavedGame()
    const button = addButton(this, 480, 380, hasSave ? 'つづきから' : 'スタート', {
      fontSize: 30,
      padding: { x: 36, y: 12 },
      onClick: () => fadeToScene(this, 'Main'),
    })

    // セーブがあるときだけ「はじめから」。誤操作でデータが消えないよう2段階確認
    if (hasSave) {
      let armed = false
      const newGame = addButton(this, 480, 452, 'はじめから', {
        fontSize: 18,
        color: '#37474f',
        padding: { x: 20, y: 8 },
        onClick: () => {
          if (!armed) {
            armed = true
            newGame.setText('セーブを消してはじめから？（もう一度クリック）')
            setButtonColor(newGame, '#b23b3b')
            return
          }
          clearSavedGame()
          Object.assign(gameState, createInitialState())
          applyMuted(this.game) // ミュート設定も初期値へ戻す
          fadeToScene(this, 'Main')
        },
      })
    }

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
