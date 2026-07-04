import Phaser from 'phaser'
import { mulberry32, type Rng } from '../core/rng'
import { assignToParty, getInstance, hatchEgg, totalStats } from '../core/collection'
import { gameState } from '../core/state'
import { getSpecies } from '../data/monsters'
import { monsterTextureKey } from '../assets/keys'

// 育成画面: 孵化・手持ち一覧・パーティ編成。ロジックは core/collection.ts
const PARTY_X = [300, 480, 660]
const PARTY_Y = 120
const GRID_COLS = 6
const GRID_MAX = 18 // 表示上限（ジャム規模の割り切り）

export class RosterScene extends Phaser.Scene {
  private rng!: Rng
  private selectedUid: string | null = null
  private partyImgs: Phaser.GameObjects.Image[] = []
  private partyLabels: Phaser.GameObjects.Text[] = []
  private rosterContainer!: Phaser.GameObjects.Container
  private eggText!: Phaser.GameObjects.Text
  private infoText!: Phaser.GameObjects.Text

  constructor() {
    super('Roster')
  }

  create() {
    this.rng = mulberry32(Date.now() >>> 0)
    this.selectedUid = null
    this.partyImgs = []
    this.partyLabels = []

    this.add
      .text(480, 32, '育成・編成', { fontSize: '26px', color: '#ffd700' })
      .setOrigin(0.5)

    for (let i = 0; i < 3; i++) {
      const zone = this.add
        .rectangle(PARTY_X[i], PARTY_Y, 130, 140, 0x000000, 0.35)
        .setStrokeStyle(2, 0x7a2ea0)
        .setInteractive({ useHandCursor: true })
      zone.on('pointerdown', () => this.onPartySlot(i))
      this.partyImgs.push(this.add.image(PARTY_X[i], PARTY_Y - 12, '__DEFAULT'))
      this.partyLabels.push(
        this.add
          .text(PARTY_X[i], PARTY_Y + 52, '', { fontSize: '14px', color: '#ffffff' })
          .setOrigin(0.5),
      )
    }
    this.add
      .text(480, 196, '一覧のモンスターを選んでから、上のスロットをクリックで編成', {
        fontSize: '14px',
        color: '#8899aa',
      })
      .setOrigin(0.5)

    this.rosterContainer = this.add.container(0, 0)

    this.eggText = this.add.text(24, 24, '', { fontSize: '20px', color: '#ffe24a' })
    const hatchBtn = this.add
      .text(64, 64, '孵化する', {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#2e7d32',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    hatchBtn.on('pointerdown', () => this.hatch())

    this.infoText = this.add
      .text(480, 512, '', { fontSize: '16px', color: '#9cd8ff' })
      .setOrigin(0.5)

    const back = this.add
      .text(884, 40, 'もどる', {
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#7a2ea0',
        padding: { x: 16, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    back.on('pointerdown', () => this.scene.start('Main'))

    this.refreshParty()
    this.rebuildRoster()
    this.refreshEggUi()
  }

  private refreshParty() {
    gameState.party.forEach((uid, i) => {
      const inst = getInstance(gameState, uid)
      this.partyImgs[i].setTexture(monsterTextureKey(inst.speciesId)).setScale(0.85)
      this.partyLabels[i].setText(getSpecies(inst.speciesId).label)
    })
  }

  private rebuildRoster() {
    this.rosterContainer.removeAll(true)
    const visible = gameState.roster.slice(0, GRID_MAX)
    visible.forEach((m, idx) => {
      const col = idx % GRID_COLS
      const row = Math.floor(idx / GRID_COLS)
      const x = 110 + col * 150
      const y = 258 + row * 108
      if (m.uid === this.selectedUid) {
        this.rosterContainer.add(
          this.add.rectangle(x, y, 96, 96).setStrokeStyle(3, 0xffe24a),
        )
      }
      const img = this.add
        .image(x, y, monsterTextureKey(m.speciesId))
        .setScale(0.62)
        .setInteractive({ useHandCursor: true })
      img.on('pointerdown', () => this.select(m.uid))
      const inParty = gameState.party.includes(m.uid)
      const label = this.add
        .text(x, y + 40, getSpecies(m.speciesId).label + (inParty ? '★' : ''), {
          fontSize: '12px',
          color: inParty ? '#ffd700' : '#cccccc',
        })
        .setOrigin(0.5)
      this.rosterContainer.add([img, label])
    })
    if (gameState.roster.length > GRID_MAX) {
      this.rosterContainer.add(
        this.add
          .text(480, 500 - 24, `ほか ${gameState.roster.length - GRID_MAX} 体`, {
            fontSize: '14px',
            color: '#8899aa',
          })
          .setOrigin(0.5),
      )
    }
  }

  private refreshEggUi() {
    this.eggText.setText(`タマゴ ×${gameState.eggs}`)
  }

  private select(uid: string) {
    this.selectedUid = uid
    const m = getInstance(gameState, uid)
    const s = totalStats(m)
    this.infoText.setText(
      `${getSpecies(m.speciesId).label}  HP${s.hp} こうげき${s.atk} ぼうぎょ${s.def} すばやさ${s.spd}`,
    )
    this.rebuildRoster()
  }

  private onPartySlot(slot: number) {
    if (!this.selectedUid) return
    assignToParty(gameState, slot, this.selectedUid)
    this.refreshParty()
    this.rebuildRoster()
  }

  private hatch() {
    const born = hatchEgg(gameState, this.rng)
    this.refreshEggUi()
    if (!born) return
    this.rebuildRoster()
    const banner = this.add
      .text(480, 230, `${getSpecies(born.speciesId).label} が生まれた！`, {
        fontSize: '24px',
        color: '#7cfc00',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    this.tweens.add({
      targets: banner,
      alpha: 0,
      delay: 1100,
      duration: 300,
      onComplete: () => banner.destroy(),
    })
  }
}
