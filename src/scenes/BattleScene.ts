import Phaser from 'phaser'
import { mulberry32, type Rng } from '../core/rng'
import { BattleSim, createEnemyGroup, makeCombatant, type BattleEvent } from '../core/battle'
import { gameState } from '../core/state'
import { monsterTextureKey } from '../assets/keys'

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

export class BattleScene extends Phaser.Scene {
  private sim!: BattleSim
  private rng!: Rng
  private views = new Map<string, CombatantView>()
  private ticker: Phaser.Time.TimerEvent | null = null

  constructor() {
    super('Battle')
  }

  create() {
    this.views.clear()
    this.rng = mulberry32(Date.now() >>> 0)
    const party = gameState.party.map((id, i) => makeCombatant(id, 'party', i))
    const enemies = createEnemyGroup(this.rng)
    this.sim = new BattleSim(party, enemies, this.rng)

    this.add
      .text(480, 44, 'バトルラッシュ！', { fontSize: '34px', color: '#ff5fd7' })
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
  }

  private playStep() {
    if (this.sim.over) return
    for (const ev of this.sim.step()) this.playEvent(ev)
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
        break
      }
      case 'defeat': {
        const target = this.views.get(ev.targetId)
        if (target) this.tweens.add({ targets: target.img, alpha: 0.15, duration: 250 })
        break
      }
      case 'end': {
        this.ticker?.remove()
        this.ticker = null
        this.showResult(ev.winner === 'party')
        break
      }
    }
  }

  private popDamage(x: number, y: number, damage: number) {
    const text = this.add
      .text(x, y, `-${damage}`, { fontSize: '22px', color: '#ff6b6b' })
      .setOrigin(0.5)
    this.tweens.add({
      targets: text,
      y: y - 34,
      alpha: 0,
      duration: 600,
      onComplete: () => text.destroy(),
    })
  }

  /** 勝敗表示。報酬付与は F10 で実装する */
  private showResult(won: boolean) {
    this.add
      .text(480, 240, won ? '勝利！' : '敗北…', {
        fontSize: '52px',
        color: won ? '#ffd700' : '#8899aa',
      })
      .setOrigin(0.5)
    const back = this.add
      .text(480, 330, 'メインへ戻る', {
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
