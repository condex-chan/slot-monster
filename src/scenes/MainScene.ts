import Phaser from 'phaser'
import { mulberry32, type Rng } from '../core/rng'
import { drawRole } from '../core/slot'
import { REEL_STRIP, isReach, resolveOutcome, reelWindow, type Outcome } from '../core/reels'
import { BET, canSpin, payoutFor } from '../core/economy'
import { CEILING_SPINS, entersBattle, nextCeilingCount, spinsUntilCeiling } from '../core/ceiling'
import { flashReward } from '../core/flash'
import { AUTO_UNLOCK_FLOOR, isAutoUnlocked, resolveFlashSuccess } from '../core/autospin'
import { persistToLocalStorage } from '../core/save'
import { gameState } from '../core/state'
import { getMaterial } from '../data/materials'
import type { RoleId } from '../data/paytable'
import { getInstance } from '../core/collection'
import { getSpecies } from '../data/monsters'
import { monsterTextureKey, symbolTextureKey } from '../assets/keys'
import { sfx } from '../assets/sfx'

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
  // 目押し（フラッシュ役）: 光っている瞬間に3リール目を止めると満額
  private flashLit = false
  private flashSuccess = false
  private flashTimer: Phaser.Time.TimerEvent | null = null
  private flashGlow: Phaser.GameObjects.Rectangle | null = null
  private autoButton!: Phaser.GameObjects.Text
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
    this.createAutoButton()
    this.refreshCoinUi()
    // 解放済みかつON設定なら自動でループを再開する
    if (gameState.autoSpin && isAutoUnlocked(gameState)) this.scheduleAutoSpin()
  }

  // ---- オートスピン（階層5クリアで解放、フラッシュは常に半額） ----

  private get autoMode(): boolean {
    return gameState.autoSpin && isAutoUnlocked(gameState)
  }

  private createAutoButton() {
    this.autoButton = this.add
      .text(660, 480, '', {
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#455a64',
        padding: { x: 14, y: 7 },
      })
      .setOrigin(0.5)
    if (isAutoUnlocked(gameState)) {
      this.autoButton.setInteractive({ useHandCursor: true })
      this.autoButton.on('pointerdown', () => this.toggleAuto())
    } else {
      gameState.autoSpin = false
      this.autoButton.setAlpha(0.45)
    }
    this.refreshAutoUi()
  }

  private refreshAutoUi() {
    if (!isAutoUnlocked(gameState)) {
      this.autoButton.setText(`オート(${AUTO_UNLOCK_FLOOR}F解放)`)
      return
    }
    this.autoButton.setText(gameState.autoSpin ? 'オート: ON' : 'オート: OFF')
    this.autoButton.setBackgroundColor(gameState.autoSpin ? '#c2185b' : '#455a64')
  }

  private toggleAuto() {
    gameState.autoSpin = !gameState.autoSpin
    this.refreshAutoUi()
    persistToLocalStorage(gameState)
    if (this.autoMode && this.phase === 'idle') this.scheduleAutoSpin()
  }

  private scheduleAutoSpin() {
    this.time.delayedCall(450, () => {
      if (!this.autoMode || this.phase !== 'idle') return
      if (!canSpin(gameState.coins, BET)) {
        gameState.autoSpin = false
        this.refreshAutoUi()
        return
      }
      this.startSpin()
      // 自動停止: 左から順に止める
      ;[600, 1050, 1500].forEach((delay) => {
        this.time.delayedCall(delay, () => {
          if (this.autoMode && this.phase === 'spinning') this.stopNextReel()
        })
      })
    })
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
    this.flashSuccess = false
    this.phase = 'spinning'
    this.button.setText('ストップ')
    this.refreshCoinUi()
    sfx.spin()
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
    // 3リール目: 目押し判定（光っている瞬間なら満額。オート中は常に半額）
    if (reel === 2 && this.currentRole === 'flash') {
      this.flashSuccess = resolveFlashSuccess(this.autoMode, this.flashLit)
      this.stopFlashCue()
    }
    const window = reelWindow(this.outcome[reel])
    for (let row = 0; row < 3; row++) {
      this.cells[reel][row].setTexture(symbolTextureKey(window[row]))
    }
    sfx.stop()
    this.stoppedCount++
    if (this.stoppedCount === 2 && this.currentRole === 'flash') {
      this.startFlashCue()
    }
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
    if (this.currentRole === 'flash') {
      const reward = flashReward(this.flashSuccess, BET, this.rng)
      gameState.coins += reward.coins
      for (const id of reward.materials) {
        gameState.materials[id] = (gameState.materials[id] ?? 0) + 1
      }
      const materialNote = reward.materials.map((id) => getMaterial(id).label).join('・')
      this.winText.setText(
        this.flashSuccess
          ? `目押し成功！ +${reward.coins} コイン & ${materialNote}`
          : `取りこぼし… +${reward.coins} コイン`,
      )
      this.celebrate(reward.coins)
    } else {
      const payout = payoutFor(this.currentRole, BET)
      if (payout > 0) {
        gameState.coins += payout
        this.winText.setText(`+${payout} コイン`)
        this.celebrate(payout)
      }
    }
    this.refreshCoinUi()
    this.advanceCeiling()
  }

  /** 払い出し演出: SE+コインシャワー、大当たりは画面振動も */
  private celebrate(payout: number) {
    sfx.win()
    this.coinShower(payout)
    if (payout >= BET * 5) this.cameras.main.shake(150, 0.005)
  }

  /** 払い出し額に応じたコインの物理シャワー（操作は塞がない） */
  private coinShower(payout: number) {
    const count = Math.min(24, Math.max(4, Math.floor(payout / BET) * 3))
    const texture = symbolTextureKey(payout >= BET * 5 ? 'gold' : 'copper')
    for (let i = 0; i < count; i++) {
      const x = 300 + Math.random() * 360
      const coin = this.add
        .image(x, -30 - Math.random() * 60, texture)
        .setScale(0.35 + Math.random() * 0.2)
        .setDepth(50)
      this.tweens.add({
        targets: coin,
        y: 580,
        angle: (Math.random() - 0.5) * 360,
        delay: i * 28,
        duration: 650 + Math.random() * 450,
        ease: 'Quad.in',
        onComplete: () => coin.destroy(),
      })
    }
  }

  /** フラッシュ役の視覚合図: 3リール目の枠が点滅する */
  private startFlashCue() {
    this.flashLit = false
    this.flashGlow = this.add
      .rectangle(REEL_X[2], 270, CELL_W + 12, 112)
      .setStrokeStyle(5, 0x33e0ff, 1)
      .setVisible(false)
    this.flashTimer = this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        this.flashLit = !this.flashLit
        this.flashGlow?.setVisible(this.flashLit)
      },
    })
  }

  private stopFlashCue() {
    this.flashTimer?.remove()
    this.flashTimer = null
    this.flashGlow?.destroy()
    this.flashGlow = null
    this.flashLit = false
  }

  /** 天井カウンタを進め、突入なら Battle シーンへ遷移する */
  private advanceCeiling() {
    const entered = entersBattle(this.currentRole, gameState.spinsSinceBattle)
    gameState.spinsSinceBattle = nextCeilingCount(entered, gameState.spinsSinceBattle)
    this.refreshCeilingUi()
    persistToLocalStorage(gameState) // スピン結果確定ごとに自動保存
    if (entered) {
      // 出目を見せてから遷移。待ち時間中の誤操作は無効化
      this.button.disableInteractive()
      this.button.setAlpha(0.4)
      this.playRushCutin()
      this.time.delayedCall(1000, () => this.scene.start('Battle'))
    } else if (this.autoMode) {
      this.scheduleAutoSpin()
    }
  }

  private refreshCeilingUi() {
    const remaining = spinsUntilCeiling(gameState.spinsSinceBattle)
    this.ceilingText.setText(`天井まで あと${remaining}スピン`)
    this.ceilingBar.width = 200 * (remaining / CEILING_SPINS)
  }

  /** ラッシュ突入カットイン: 画面フラッシュ+帯+スライドイン+振動+SE */
  private playRushCutin() {
    sfx.rush()
    this.cameras.main.flash(180, 255, 95, 215)
    this.cameras.main.shake(250, 0.006)
    this.add.rectangle(480, 270, 960, 130, 0x1a1026, 0.85).setDepth(90)
    const cutin = this.add
      .text(-260, 270, 'BATTLE RUSH!!', {
        fontSize: '58px',
        color: '#ff5fd7',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(91)
    this.tweens.add({ targets: cutin, x: 480, duration: 260, ease: 'Back.out' })
  }
}
