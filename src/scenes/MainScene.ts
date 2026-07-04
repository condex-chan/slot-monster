import Phaser from 'phaser'
import { mulberry32, type Rng } from '../core/rng'
import { drawRole } from '../core/slot'
import { REEL_STRIP, isReach, resolveOutcome, reelWindow, type Outcome } from '../core/reels'
import { BET, canSpin, payoutFor } from '../core/economy'
import { CEILING_SPINS, entersBattle, nextCeilingCount, spinsUntilCeiling } from '../core/ceiling'
import { gameState } from '../core/state'
import type { RoleId } from '../data/paytable'
import { getInstance } from '../core/collection'
import { getSpecies } from '../data/monsters'
import { monsterTextureKey, symbolTextureKey } from '../assets/keys'

// メイン画面: 表示と入力のみ。抽選・出目解決は src/core/ に委譲する
const REEL_X = [360, 480, 600]
const ROW_Y = [170, 270, 370]
const CELL_W = 104
const WINDOW_H = 300

export class MainScene extends Phaser.Scene {
  private rng!: Rng
  private cells: Phaser.GameObjects.Image[][] = []
  private spinTimers: (Phaser.Time.TimerEvent | null)[] = [null, null, null]
  private button!: Phaser.GameObjects.Text
  private phase: 'idle' | 'spinning' = 'idle'
  private stoppedCount = 0
  private outcome: Outcome | null = null
  private currentRole: RoleId = 'none'
  private coinText!: Phaser.GameObjects.Text
  private winText!: Phaser.GameObjects.Text
  private ceilingText!: Phaser.GameObjects.Text
  private ceilingBar!: Phaser.GameObjects.Rectangle

  constructor() {
    super('Main')
  }

  create() {
    this.rng = mulberry32(Date.now() >>> 0)

    this.add
      .text(480, 40, 'モンスロ（仮）', { fontSize: '28px', color: '#ffd700' })
      .setOrigin(0.5)

    this.coinText = this.add.text(24, 24, '', { fontSize: '24px', color: '#ffe24a' })
    this.add.text(
      24,
      56,
      `階層 ${gameState.floor}F ／ 最高 ${gameState.bestFloor}F`,
      { fontSize: '18px', color: '#9cd8ff' },
    )
    this.winText = this.add
      .text(480, 90, '', { fontSize: '22px', color: '#7CFC00' })
      .setOrigin(0.5)

    // 天井メーター（右上）: 残りが減るほどバーが縮む
    this.ceilingText = this.add
      .text(936, 24, '', { fontSize: '18px', color: '#ff9cee' })
      .setOrigin(1, 0)
    this.add.rectangle(836, 58, 200, 12, 0x000000, 0.5).setOrigin(0.5, 0)
    this.ceilingBar = this.add
      .rectangle(736, 58, 200, 12, 0xff5fd7)
      .setOrigin(0, 0)
    this.refreshCeilingUi()

    // リール窓と中央有効ライン
    for (let reel = 0; reel < 3; reel++) {
      this.add.rectangle(REEL_X[reel], 270, CELL_W, WINDOW_H, 0x000000, 0.4)
      const column: Phaser.GameObjects.Image[] = []
      for (let row = 0; row < 3; row++) {
        const symbol = REEL_STRIP[(reel * 3 + row) % REEL_STRIP.length]
        column.push(this.add.image(REEL_X[reel], ROW_Y[row], symbolTextureKey(symbol)))
      }
      this.cells.push(column)
    }
    this.add
      .rectangle(480, 270, CELL_W * 3 + 40, 100)
      .setStrokeStyle(3, 0xffd700, 0.9)

    this.button = this.add
      .text(480, 480, 'スピン', {
        fontSize: '32px',
        color: '#ffffff',
        backgroundColor: '#7a2ea0',
        padding: { x: 28, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    this.button.on('pointerdown', () => this.onButton())

    this.createPartyDisplay()
    this.refreshCoinUi()
  }

  /** パーティ3体を左下に表示（待機モーションの上下ゆれ） */
  private createPartyDisplay() {
    this.add.text(24, 400, 'パーティ', { fontSize: '16px', color: '#cccccc' })
    gameState.party.forEach((uid, i) => {
      const speciesId = getInstance(gameState, uid).speciesId
      const x = 80 + i * 82
      const img = this.add.image(x, 470, monsterTextureKey(speciesId)).setScale(0.75)
      this.tweens.add({
        targets: img,
        y: 462,
        duration: 700 + i * 90,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      })
      this.add
        .text(x, 512, getSpecies(speciesId).label, { fontSize: '13px', color: '#cccccc' })
        .setOrigin(0.5)
    })

    const menu: [string, string, string][] = [
      ['育成', 'Roster', '#2e7d32'],
      ['図鑑', 'Dex', '#1565c0'],
      ['確率表', 'Odds', '#5d4037'],
    ]
    menu.forEach(([label, sceneKey, color], i) => {
      const btn = this.add
        .text(884, 480 - i * 52, label, {
          fontSize: '20px',
          color: '#ffffff',
          backgroundColor: color,
          padding: { x: 14, y: 7 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
      btn.on('pointerdown', () => this.scene.start(sceneKey))
    })
  }

  /** 残高表示とスピンボタンの有効/無効を状態から再計算する */
  private refreshCoinUi() {
    this.coinText.setText(`コイン: ${gameState.coins}`)
    const spinnable = this.phase === 'spinning' || canSpin(gameState.coins, BET)
    if (spinnable) {
      this.button.setInteractive({ useHandCursor: true })
      this.button.setAlpha(1)
    } else {
      this.button.disableInteractive()
      this.button.setAlpha(0.4)
    }
  }

  private onButton() {
    if (this.phase === 'idle') this.startSpin()
    else this.stopNextReel()
  }

  private startSpin() {
    if (!canSpin(gameState.coins, BET)) return
    gameState.coins -= BET
    this.winText.setText('')
    // 当選役はスピン開始時に確定（タイミング非依存）
    this.currentRole = drawRole(this.rng)
    this.outcome = resolveOutcome(this.currentRole, this.rng)
    this.stoppedCount = 0
    this.phase = 'spinning'
    this.button.setText('ストップ')
    this.refreshCoinUi()
    for (let reel = 0; reel < 3; reel++) {
      this.spinTimers[reel] = this.time.addEvent({
        delay: 60,
        loop: true,
        callback: () => this.shuffleReel(reel),
      })
    }
  }

  /** 回転中の見た目: 図柄を高速で入れ替える（結果には影響しない演出乱数） */
  private shuffleReel(reel: number) {
    for (let row = 0; row < 3; row++) {
      const symbol = REEL_STRIP[Math.floor(this.rng() * REEL_STRIP.length)]
      this.cells[reel][row].setTexture(symbolTextureKey(symbol))
    }
  }

  private stopNextReel() {
    if (!this.outcome) return
    const reel = this.stoppedCount
    this.spinTimers[reel]?.remove()
    this.spinTimers[reel] = null
    const window = reelWindow(this.outcome[reel])
    for (let row = 0; row < 3; row++) {
      this.cells[reel][row].setTexture(symbolTextureKey(window[row]))
    }
    this.stoppedCount++
    if (this.stoppedCount === 2 && isReach(this.outcome) && this.spinTimers[2]) {
      // リーチ演出: 3リール目の回転を遅くして期待の間を作る
      this.spinTimers[2].remove()
      this.spinTimers[2] = this.time.addEvent({
        delay: 220,
        loop: true,
        callback: () => this.shuffleReel(2),
      })
    }
    if (this.stoppedCount === 3) {
      this.phase = 'idle'
      this.button.setText('スピン')
      this.applyPayout()
    }
  }

  /** 全リール停止後に払い出しを反映（表示出目と入金タイミングを一致させる） */
  private applyPayout() {
    const payout = payoutFor(this.currentRole, BET)
    if (payout > 0) {
      gameState.coins += payout
      this.winText.setText(`+${payout} コイン`)
    }
    this.refreshCoinUi()
    this.advanceCeiling()
  }

  /** 天井カウンタを進め、突入なら Battle シーンへ遷移する */
  private advanceCeiling() {
    const entered = entersBattle(this.currentRole, gameState.spinsSinceBattle)
    gameState.spinsSinceBattle = nextCeilingCount(entered, gameState.spinsSinceBattle)
    this.refreshCeilingUi()
    if (entered) {
      // 出目を見せてから遷移。待ち時間中の誤操作は無効化
      this.button.disableInteractive()
      this.button.setAlpha(0.4)
      this.winText.setText('バトルラッシュ突入！')
      this.time.delayedCall(700, () => this.scene.start('Battle'))
    }
  }

  private refreshCeilingUi() {
    const remaining = spinsUntilCeiling(gameState.spinsSinceBattle)
    this.ceilingText.setText(`天井まで あと${remaining}スピン`)
    this.ceilingBar.width = 200 * (remaining / CEILING_SPINS)
  }
}
