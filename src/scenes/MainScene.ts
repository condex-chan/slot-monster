import Phaser from 'phaser'
import { mulberry32, type Rng } from '../core/rng'
import { drawRole } from '../core/slot'
import { isReach, resolveOutcome, type Outcome } from '../core/reels'
import {
  CENTER_SLOT,
  SLOT_COUNT,
  bandShift,
  bandSymbolAt,
  snapPositionFor,
} from '../core/reelband'
import { BET, canSpin, payoutFor } from '../core/economy'
import { CEILING_SPINS, entersBattle, nextCeilingCount, spinsUntilCeiling } from '../core/ceiling'
import { flashReward } from '../core/flash'
import { AUTO_UNLOCK_FLOOR, isAutoUnlocked, resolveFlashSuccess } from '../core/autospin'
import { guideMessage, nextGuideStep } from '../core/onboarding'
import { persistToLocalStorage } from '../core/save'
import { gameState } from '../core/state'
import { getMaterial } from '../data/materials'
import type { RoleId } from '../data/paytable'
import { getInstance } from '../core/collection'
import { getSpecies } from '../data/monsters'
import { monsterTextureKey, symbolTextureKey } from '../assets/keys'
import { sfx } from '../assets/sfx'
import { bgm } from '../assets/bgm'
import { addMuteButton } from '../ui/muteButton'
import { addButton, setButtonColor } from '../ui/button'
import { fadeIn, fadeToScene } from '../ui/transitions'

// メイン画面: 表示と入力のみ。抽選・出目解決は src/core/ に委譲する
const REEL_X = [360, 480, 600]
const CELL_W = 104
const CELL_H = 100
const WINDOW_H = 300
// 帯スクロール: スロット0（窓上端の外）の基準y。中央スロットが有効ライン270に一致する
const BAND_TOP = 270 - CENTER_SLOT * CELL_H
// 回転速度（セル/秒）。リーチ時は3リール目を落として期待の間を作る
const SPIN_SPEED = 14
const REACH_SPEED = 3
// 停止操作から減速スナップまでの最低移動量（急停止に見えない下限）
const MIN_SNAP_TRAVEL = 1.2

export class MainScene extends Phaser.Scene {
  private rng!: Rng
  // 帯スクロールリール: 位置はセル単位の連続量（core/reelband.ts の規約）
  private bandImages: Phaser.GameObjects.Image[][] = []
  private bandPos = [0, 0, 0]
  private bandSpeed = [0, 0, 0]
  private snapTweens: (Phaser.Tweens.Tween | null)[] = [null, null, null]
  private button!: Phaser.GameObjects.Text
  private phase: 'idle' | 'spinning' = 'idle'
  private nextToStop = 0
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
  private guideText!: Phaser.GameObjects.Text

  constructor() {
    super('Main')
  }

  create() {
    this.rng = mulberry32(Date.now() >>> 0)
    bgm.enter(this, 'Main')
    fadeIn(this)

    // ヘッダー中央: このゲームの目的（階層を登る）を最前面の情報にする
    this.add
      .text(480, 30, `ダンジョン ${gameState.floor}F`, {
        fontSize: '30px',
        color: '#ffd700',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    this.add
      .text(480, 62, `最高記録 ${gameState.bestFloor}F ── スロットで稼ぎ、ラッシュで登り、配合で強くなる`, {
        fontSize: '14px',
        color: '#9cd8ff',
      })
      .setOrigin(0.5)

    this.coinText = this.add.text(24, 24, '', { fontSize: '24px', color: '#ffe24a' })
    addMuteButton(this, 164, 58)
    this.winText = this.add
      .text(480, 92, '', { fontSize: '22px', color: '#7CFC00' })
      .setOrigin(0.5)

    // 天井メーター（右上）: 残りが減るほどバーが縮む。ラッシュ確定までの距離を明言する
    this.ceilingText = this.add
      .text(936, 24, '', { fontSize: '18px', color: '#ff9cee' })
      .setOrigin(1, 0)
    this.add.rectangle(836, 58, 200, 12, 0x000000, 0.5).setOrigin(0.5, 0)
    this.ceilingBar = this.add
      .rectangle(736, 58, 200, 12, 0xff5fd7)
      .setOrigin(0, 0)
    this.refreshCeilingUi()
    // 扉図柄の価値をメーター直下で常時説明（天井以外のもう1つの突入経路）
    this.add.image(714, 94, symbolTextureKey('door')).setScale(0.36)
    this.add
      .text(936, 86, '扉3つ でも ラッシュ突入！', { fontSize: '14px', color: '#ff9cee' })
      .setOrigin(1, 0)

    // リール窓と中央有効ライン。図柄帯はマスクで窓外を隠しスクロールさせる
    const maskShape = this.make
      .graphics()
      .fillRect(REEL_X[0] - CELL_W / 2, 270 - WINDOW_H / 2, REEL_X[2] - REEL_X[0] + CELL_W, WINDOW_H)
    const bandMask = maskShape.createGeometryMask()
    this.bandImages = []
    for (let reel = 0; reel < 3; reel++) {
      this.add.rectangle(REEL_X[reel], 270, CELL_W, WINDOW_H, 0x000000, 0.4)
      const column: Phaser.GameObjects.Image[] = []
      for (let slot = 0; slot < SLOT_COUNT; slot++) {
        column.push(
          this.add
            .image(REEL_X[reel], 0, symbolTextureKey(bandSymbolAt(0, slot)))
            .setMask(bandMask),
        )
      }
      this.bandImages.push(column)
      // 帯の初期位置をリールごとにずらして同じ縦並びに見えないようにする
      this.bandPos[reel] = reel * 3
      this.renderBand(reel)
    }
    this.add
      .rectangle(480, 270, CELL_W * 3 + 40, 100)
      .setStrokeStyle(3, 0xffd700, 0.9)

    this.button = addButton(this, 480, 480, 'スピン', {
      fontSize: 32,
      padding: { x: 28, y: 10 },
      onClick: () => this.onButton(),
    })

    this.createPartyDisplay()
    this.createAutoButton()
    // 初回オンボーディング: 段階に応じた1行ガイド（完了後は出ない）
    this.guideText = this.add
      .text(480, 437, '', {
        fontSize: '19px',
        color: '#ffe24a',
        backgroundColor: '#1a1026',
        padding: { x: 12, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(60)
    this.refreshGuideUi()
    this.refreshCoinUi()
    // 解放済みかつON設定なら自動でループを再開する
    if (gameState.autoSpin && isAutoUnlocked(gameState)) this.scheduleAutoSpin()
  }

  // ---- オートスピン（階層5クリアで解放、フラッシュは常に半額） ----

  private get autoMode(): boolean {
    return gameState.autoSpin && isAutoUnlocked(gameState)
  }

  private createAutoButton() {
    this.autoButton = addButton(this, 660, 480, '', {
      color: '#455a64',
      onClick: () => this.toggleAuto(),
    })
    if (!isAutoUnlocked(gameState)) {
      gameState.autoSpin = false
      this.autoButton.disableInteractive()
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
    setButtonColor(this.autoButton, gameState.autoSpin ? '#c2185b' : '#455a64')
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
      addButton(this, 884, 480 - i * 52, label, {
        color,
        onClick: () => fadeToScene(this, sceneKey),
      })
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

  /** E2E用: 1スピンを即時に完了させる（抽選・払い出し・天井進行は本流と同じ経路） */
  debugSpinOnce(): void {
    if (this.phase !== 'idle' || !canSpin(gameState.coins, BET)) return
    this.startSpin()
    for (let i = 0; i < 3; i++) this.stopNextReel(true)
  }

  /** 帯の現在位置をスロット画像の座標・テクスチャへ反映する */
  private renderBand(reel: number) {
    const p = this.bandPos[reel]
    const shift = bandShift(p)
    for (let slot = 0; slot < SLOT_COUNT; slot++) {
      const img = this.bandImages[reel][slot]
      img.y = BAND_TOP + (slot + shift) * CELL_H
      img.setTexture(symbolTextureKey(bandSymbolAt(p, slot)))
    }
  }

  update(_time: number, delta: number) {
    for (let reel = 0; reel < 3; reel++) {
      if (this.bandSpeed[reel] <= 0) continue
      this.bandPos[reel] += (this.bandSpeed[reel] * delta) / 1000
      this.renderBand(reel)
    }
  }

  private startSpin() {
    if (!canSpin(gameState.coins, BET)) return
    gameState.coins -= BET
    this.winText.setText('')
    // 当選役はスピン開始時に確定（タイミング非依存）
    this.currentRole = drawRole(this.rng)
    this.outcome = resolveOutcome(this.currentRole, this.rng)
    this.nextToStop = 0
    this.stoppedCount = 0
    this.flashSuccess = false
    this.phase = 'spinning'
    this.button.setText('ストップ')
    this.refreshCoinUi()
    sfx.spin()
    for (let reel = 0; reel < 3; reel++) this.bandSpeed[reel] = SPIN_SPEED
  }

  /**
   * 次のリールへ停止操作。帯は減速しながら出目位置へスナップする。
   * immediate=true（E2E用）は演出を飛ばし即座に確定する
   */
  private stopNextReel(immediate = false) {
    if (!this.outcome || this.nextToStop >= 3) return
    const reel = this.nextToStop++
    this.bandSpeed[reel] = 0
    // 3リール目: 目押し判定は「押した瞬間」に光っていたか（オート中は常に半額）
    if (reel === 2 && this.currentRole === 'flash') {
      this.flashSuccess = resolveFlashSuccess(this.autoMode, this.flashLit)
      this.stopFlashCue()
    }
    const target = snapPositionFor(this.outcome[reel], this.bandPos[reel] + MIN_SNAP_TRAVEL)
    if (immediate) {
      this.bandPos[reel] = target
      this.renderBand(reel)
      this.finalizeStop()
      return
    }
    const proxy = { p: this.bandPos[reel] }
    this.snapTweens[reel] = this.tweens.add({
      targets: proxy,
      p: target,
      duration: 260 + (target - proxy.p) * 45,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        this.bandPos[reel] = proxy.p
        this.renderBand(reel)
      },
      onComplete: () => {
        this.snapTweens[reel] = null
        this.bandPos[reel] = target
        this.renderBand(reel)
        this.finalizeStop()
      },
    })
  }

  /** リール停止確定時の処理（減速スナップ完了後に呼ばれる） */
  private finalizeStop() {
    if (!this.outcome) return
    sfx.stop()
    this.stoppedCount++
    if (this.stoppedCount === 2 && this.currentRole === 'flash') {
      this.startFlashCue()
    }
    if (this.stoppedCount === 2 && isReach(this.outcome) && this.bandSpeed[2] > 0) {
      // リーチ演出: 3リール目の帯を遅くして期待の間を作る
      this.bandSpeed[2] = REACH_SPEED
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

  private refreshGuideUi() {
    const message = guideMessage(gameState.guide)
    this.guideText.setText(message ?? '').setVisible(message !== null)
  }

  /** 天井カウンタを進め、突入なら Battle シーンへ遷移する */
  private advanceCeiling() {
    const entered = entersBattle(this.currentRole, gameState.spinsSinceBattle)
    gameState.spinsSinceBattle = nextCeilingCount(entered, gameState.spinsSinceBattle)
    // ガイド進行: ラッシュ突入は rush 段階を飛ばして boost 説明へ直行する
    gameState.guide = nextGuideStep(gameState.guide, entered ? 'rushEntered' : 'spinDone')
    this.refreshGuideUi()
    this.refreshCeilingUi()
    persistToLocalStorage(gameState) // スピン結果確定ごとに自動保存
    if (entered) {
      // 出目を見せてから遷移。待ち時間中の誤操作は無効化
      this.button.disableInteractive()
      this.button.setAlpha(0.4)
      this.playRushCutin()
      this.time.delayedCall(1000, () => fadeToScene(this, 'Battle'))
    } else if (this.autoMode) {
      this.scheduleAutoSpin()
    }
  }

  private refreshCeilingUi() {
    const remaining = spinsUntilCeiling(gameState.spinsSinceBattle)
    this.ceilingText.setText(`あと${remaining}スピンでラッシュ確定`)
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
