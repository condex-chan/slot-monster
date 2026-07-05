import Phaser from 'phaser'
import { mulberry32, type Rng } from '../core/rng'
import {
  BattleSim,
  createEnemyGroupForFloor,
  makeCombatantFromInstance,
  type BattleEvent,
  type BoostKind,
} from '../core/battle'
import { getInstance } from '../core/collection'
import { isAutoUnlocked } from '../core/autospin'
import { advanceFloor, isBossFloor } from '../core/floors'
import { drawRole } from '../core/slot'
import { REEL_STRIP, resolveOutcome, type Outcome } from '../core/reels'
import { BET, canSpin, eggsFor, payoutFor } from '../core/economy'
import { applyRewards, computeRewards } from '../core/rewards'
import { nextGuideStep, shouldShowBoostGuide } from '../core/onboarding'
import { persistToLocalStorage } from '../core/save'
import { gameState } from '../core/state'
import { getMaterial } from '../data/materials'
import type { RoleId } from '../data/paytable'
import { monsterTextureKey, symbolTextureKey } from '../assets/keys'
import { sfx } from '../assets/sfx'
import { bgm } from '../assets/bgm'
import { addMuteButton } from '../ui/muteButton'
import { addButton } from '../ui/button'
import { addPanel } from '../ui/panel'
import { fadeIn, fadeToScene } from '../ui/transitions'

// バトル画面: BattleSim のイベント列を再生するだけ。戦闘の意思決定は core/battle.ts
const PARTY_X = 220
const ENEMY_X = 740
const SLOT_Y = [160, 280, 400]
const HP_BAR_W = 110

interface CombatantView {
  img: Phaser.GameObjects.Image
  hpBar: Phaser.GameObjects.Rectangle
  maxHp: number
}

const SLOT_X = [400, 480, 560]
const SLOT_Y2 = 492

export class BattleScene extends Phaser.Scene {
  private sim!: BattleSim
  private rng!: Rng
  private views = new Map<string, CombatantView>()
  private ticker: Phaser.Time.TimerEvent | null = null
  // ラッシュ中ミニスロット
  private slotCells: Phaser.GameObjects.Image[] = []
  private slotTimers: (Phaser.Time.TimerEvent | null)[] = [null, null, null]
  private slotButton!: Phaser.GameObjects.Text
  private slotPhase: 'idle' | 'spinning' = 'idle'
  private slotStopped = 0
  private slotOutcome: Outcome | null = null
  private slotRole: RoleId = 'none'
  private coinText!: Phaser.GameObjects.Text
  /** このバトル中に投入したコイン（敗北保険の算定基準） */
  private spentCoins = 0
  private boostGuidePanel: Phaser.GameObjects.Container | null = null

  constructor() {
    super('Battle')
  }

  create() {
    this.views.clear()
    // ヒットストップ中にシーンが切り替わっても時間が止まったままにならないよう常に復帰
    this.time.timeScale = 1
    this.tweens.timeScale = 1
    bgm.enter(this, 'Battle')
    fadeIn(this)
    addMuteButton(this, 936, 20)
    this.rng = mulberry32(Date.now() >>> 0)
    const party = gameState.party.map((uid, i) =>
      makeCombatantFromInstance(getInstance(gameState, uid), 'party', i),
    )
    const enemies = createEnemyGroupForFloor(gameState.floor, this.rng)
    this.sim = new BattleSim(party, enemies, this.rng)

    const bossMark = isBossFloor(gameState.floor) ? ' 【ボス】' : ''
    this.add
      .text(480, 44, `バトルラッシュ！ ${gameState.floor}F${bossMark}`, {
        fontSize: '34px',
        color: '#ff5fd7',
        padding: { top: 6 },
      })
      .setOrigin(0.5)

    for (const c of this.sim.combatants) {
      const x = c.side === 'party' ? PARTY_X : ENEMY_X
      const y = SLOT_Y[Number(c.id.split('-')[1])]
      const img = this.add.image(x, y, monsterTextureKey(c.speciesId))
      if (c.side === 'enemy') img.setFlipX(true)
      this.add
        .text(x, y + 52, c.name, { fontSize: '14px', color: '#cccccc' })
        .setOrigin(0.5)
      this.add.rectangle(x, y - 56, HP_BAR_W, 10, 0x000000, 0.6)
      const hpBar = this.add
        .rectangle(x - HP_BAR_W / 2, y - 56, HP_BAR_W, 10, 0x7cfc00)
        .setOrigin(0, 0.5)
      this.views.set(c.id, { img, hpBar, maxHp: c.maxHp })
    }

    // 1行動ずつ再生
    this.ticker = this.time.addEvent({
      delay: 650,
      loop: true,
      callback: () => this.playStep(),
    })

    this.createMiniSlot()
    if (shouldShowBoostGuide(gameState.guide)) this.showBoostGuide()
    // オート解放済み+ONならバトル中のミニスロットも自動で回す（メインのオートと同じ扱い）
    if (this.autoBattleMode) this.time.delayedCall(900, () => this.autoBattleTick())
  }

  private get autoBattleMode(): boolean {
    return gameState.autoSpin && isAutoUnlocked(gameState)
  }

  /** オート時のバトルスピン: 定期的にスピン→順に停止。終局か資金切れで止まる */
  private autoBattleTick() {
    if (!this.autoBattleMode || this.sim.over) return
    if (this.slotPhase === 'idle' && canSpin(gameState.coins, BET)) {
      this.startBattleSpin()
      ;[400, 750, 1100].forEach((delay) => {
        this.time.delayedCall(delay, () => {
          if (this.slotPhase === 'spinning') this.stopNextCell()
        })
      })
    }
    this.time.delayedCall(1600, () => this.autoBattleTick())
  }

  /** 説明を閉じて完了扱いにする（保存は直後の保存フックに任せる場合もある） */
  private dismissBoostGuide() {
    if (!this.boostGuidePanel) return
    gameState.guide = nextGuideStep(gameState.guide, 'boostExplained')
    this.boostGuidePanel.destroy()
    this.boostGuidePanel = null
  }

  /** 初ラッシュ時のみのブースト説明。閉じたら完了フラグを保存し二度と出さない */
  private showBoostGuide() {
    const panel = this.add.container(480, 270).setDepth(120)
    this.boostGuidePanel = panel
    panel.add(addPanel(this, 0, 0, 560, 220, 0.95))
    panel.add(
      this.add
        .text(0, -72, '③ ラッシュ中もスピンでブースト！', {
          fontSize: '24px',
          color: '#ffe24a',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    )
    panel.add(
      this.add
        .text(0, -8, '剣が揃うと 全員追撃\nハートが揃うと 全員回復\n星が揃うと 先頭がスキル発動', {
          fontSize: '19px',
          color: '#ffffff',
          align: 'center',
          lineSpacing: 8,
        })
        .setOrigin(0.5),
    )
    const ok = addButton(this, 0, 78, 'OK！', {
      fontSize: 22,
      padding: { x: 26, y: 6 },
      onClick: () => {
        this.dismissBoostGuide()
        persistToLocalStorage(gameState)
      },
    })
    panel.add(ok)
  }

  // ---- ラッシュ中ミニスロット（スピン継続でブースト） ----

  private createMiniSlot() {
    this.slotCells = []
    this.slotTimers = [null, null, null]
    this.slotPhase = 'idle'
    this.coinText = this.add.text(24, 24, '', {
      fontSize: '20px',
      color: '#ffe24a',
      padding: { top: 4 },
    })
    this.add.rectangle(480, SLOT_Y2, 260, 72, 0x000000, 0.45)
    for (let i = 0; i < 3; i++) {
      this.slotCells.push(
        this.add.image(SLOT_X[i], SLOT_Y2, symbolTextureKey(REEL_STRIP[i])).setScale(0.6),
      )
    }
    this.slotButton = addButton(this, 672, SLOT_Y2, 'スピン', {
      fontSize: 22,
      padding: { x: 16, y: 6 },
      onClick: () => this.onSlotButton(),
    })
    this.refreshSlotUi()
  }

  private refreshSlotUi() {
    this.coinText.setText(`コイン: ${gameState.coins}`)
    const usable =
      !this.sim.over && (this.slotPhase === 'spinning' || canSpin(gameState.coins, BET))
    if (usable) {
      this.slotButton.setInteractive({ useHandCursor: true })
      this.slotButton.setAlpha(1)
    } else {
      this.slotButton.disableInteractive()
      this.slotButton.setAlpha(0.4)
    }
  }

  private onSlotButton() {
    if (this.slotPhase === 'idle') this.startBattleSpin()
    else this.stopNextCell()
  }

  private startBattleSpin() {
    if (this.sim.over || !canSpin(gameState.coins, BET)) return
    gameState.coins -= BET
    this.spentCoins += BET
    this.slotRole = drawRole(this.rng)
    this.slotOutcome = resolveOutcome(this.slotRole, this.rng)
    this.slotStopped = 0
    this.slotPhase = 'spinning'
    this.slotButton.setText('ストップ')
    this.refreshSlotUi()
    sfx.spin()
    for (let i = 0; i < 3; i++) {
      this.slotTimers[i] = this.time.addEvent({
        delay: 60,
        loop: true,
        callback: () => {
          const s = REEL_STRIP[Math.floor(this.rng() * REEL_STRIP.length)]
          this.slotCells[i].setTexture(symbolTextureKey(s))
        },
      })
    }
  }

  private stopNextCell() {
    if (!this.slotOutcome) return
    const i = this.slotStopped
    this.slotTimers[i]?.remove()
    this.slotTimers[i] = null
    this.slotCells[i].setTexture(symbolTextureKey(this.slotOutcome[i]))
    sfx.stop()
    this.slotStopped++
    if (this.slotStopped === 3) {
      this.slotPhase = 'idle'
      this.slotButton.setText('スピン')
      this.settleBattleSpin()
    }
  }

  private settleBattleSpin() {
    const payout = payoutFor(this.slotRole, BET)
    if (payout > 0) {
      gameState.coins += payout
      sfx.win()
    }
    const eggs = eggsFor(this.slotRole)
    if (eggs > 0) {
      gameState.eggs += eggs
      this.showBanner('タマゴ獲得！', '#ffe24a')
      sfx.win()
    }
    if (this.slotRole === 'sword' || this.slotRole === 'heart' || this.slotRole === 'star') {
      this.applyBoostWithFx(this.slotRole)
    }
    this.refreshSlotUi()
  }

  /** ブーストを戦闘に反映し、バナー+イベント再生で画面に見せる */
  private applyBoostWithFx(kind: BoostKind) {
    if (kind === 'sword') this.showBanner('全員追撃！', '#ff8c42')
    if (kind === 'heart') this.showBanner('全員回復！', '#7cfc00')
    const events = this.sim.applyBoost(kind)
    events.forEach((ev, i) => this.time.delayedCall(i * 170, () => this.playEvent(ev)))
  }

  private showBanner(message: string, color: string) {
    const banner = this.add
      .text(480, 110, message, { fontSize: '34px', color, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setScale(0.4)
    this.tweens.add({ targets: banner, scale: 1, duration: 160, ease: 'Back.out' })
    this.tweens.add({
      targets: banner,
      alpha: 0,
      delay: 900,
      duration: 300,
      onComplete: () => banner.destroy(),
    })
  }

  private playStep() {
    if (this.sim.over) return
    for (const ev of this.sim.step()) this.playEvent(ev)
  }

  /** E2E用: バトルの現在状態 */
  isBattleOver(): boolean {
    return this.sim ? this.sim.over : false
  }

  /** E2E用: 終局まで早送りし、end イベント経由で結果画面まで到達させる */
  debugFastForward(): void {
    if (!this.sim) return
    while (!this.sim.over) {
      for (const ev of this.sim.step()) this.playEvent(ev)
    }
  }

  private playEvent(ev: BattleEvent) {
    switch (ev.type) {
      case 'attack': {
        const actor = this.views.get(ev.actorId)
        const target = this.views.get(ev.targetId)
        if (!actor || !target) return
        const dir = actor.img.x < target.img.x ? 26 : -26
        this.tweens.add({
          targets: actor.img,
          x: actor.img.x + dir,
          duration: 110,
          yoyo: true,
          ease: 'Quad.out',
        })
        target.hpBar.width = HP_BAR_W * (ev.targetHp / target.maxHp)
        this.popDamage(target.img.x, target.img.y - 20, ev.damage)
        sfx.hit()
        if (ev.damage >= 20) this.cameras.main.shake(90, 0.004)
        break
      }
      case 'heal': {
        const target = this.views.get(ev.targetId)
        if (!target) return
        target.hpBar.width = HP_BAR_W * (ev.targetHp / target.maxHp)
        if (ev.amount > 0) this.popHeal(target.img.x, target.img.y - 20, ev.amount)
        break
      }
      case 'skill': {
        this.showBanner(`${ev.label}！`, '#ffe24a')
        break
      }
      case 'defeat': {
        const target = this.views.get(ev.targetId)
        if (target) this.tweens.add({ targets: target.img, alpha: 0.15, duration: 250 })
        this.hitStop(90)
        this.cameras.main.shake(120, 0.005)
        break
      }
      case 'end': {
        this.ticker?.remove()
        this.ticker = null
        // 説明が出たまま終局したら閉じて完了扱い（結果画面を隠さない。保存はshowResult内）
        this.dismissBoostGuide()
        this.refreshSlotUi()
        this.showResult(ev.winner === 'party')
        break
      }
    }
  }

  private popDamage(x: number, y: number, damage: number) {
    this.popText(x, y, `-${damage}`, '#ff6b6b')
  }

  private popHeal(x: number, y: number, amount: number) {
    this.popText(x, y, `+${amount}`, '#7cfc00')
  }

  /** ヒットストップ: 時間を一瞬止めて撃破の手応えを出す。実時間で必ず復帰させる */
  private hitStop(ms: number) {
    if (this.time.timeScale !== 1) return
    this.time.timeScale = 0.05
    this.tweens.timeScale = 0.05
    setTimeout(() => {
      this.time.timeScale = 1
      this.tweens.timeScale = 1
    }, ms)
  }

  private popText(x: number, y: number, message: string, color: string) {
    const text = this.add.text(x, y, message, { fontSize: '22px', color }).setOrigin(0.5)
    this.tweens.add({
      targets: text,
      y: y - 34,
      alpha: 0,
      duration: 600,
      onComplete: () => text.destroy(),
    })
  }

  /** 勝敗と報酬内訳の結果画面。報酬はここで一度だけ状態に反映する */
  private showResult(won: boolean) {
    // 報酬は戦った階層で計算してから階層を進める
    const rewards = computeRewards(won, this.spentCoins, gameState.floor, this.rng)
    applyRewards(gameState, rewards)
    advanceFloor(gameState, won)
    this.spentCoins = 0
    persistToLocalStorage(gameState) // バトル結果確定で自動保存
    this.refreshSlotUi()

    if (won) {
      sfx.victory()
      bgm.victoryJingle(this)
      this.cameras.main.shake(180, 0.004)
    } else {
      sfx.defeat()
    }
    addPanel(this, 480, 270, 460, 320)
    this.add
      .text(480, 160, won ? '勝利！' : '敗北…', {
        fontSize: '52px',
        color: won ? '#ffd700' : '#8899aa',
      })
      .setOrigin(0.5)

    const lines = [`コイン +${rewards.coins}${won ? '' : '（保険）'}`]
    if (rewards.eggs > 0) lines.push(`タマゴ ×${rewards.eggs}`)
    const counts = new Map<string, number>()
    for (const id of rewards.materials) {
      const label = getMaterial(id).label
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }
    for (const [label, n] of counts) lines.push(`${label} ×${n}`)
    this.add
      .text(480, 250, lines.join('\n'), {
        fontSize: '22px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 10,
      })
      .setOrigin(0.5)

    addButton(this, 480, 370, 'メインへ戻る', {
      fontSize: 26,
      padding: { x: 24, y: 8 },
      onClick: () => fadeToScene(this, 'Main'),
    })
  }
}
