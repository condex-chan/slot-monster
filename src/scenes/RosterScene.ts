import Phaser from 'phaser'
import { bgm } from '../assets/bgm'
import { addButton } from '../ui/button'
import { addPanel } from '../ui/panel'
import { fadeIn, fadeToScene } from '../ui/transitions'
import { mulberry32, type Rng } from '../core/rng'
import { assignToParty, getInstance, hatchEgg, totalStats } from '../core/collection'
import { feed } from '../core/feeding'
import { MIN_ROSTER_FOR_FUSION, fuse } from '../core/fusion'
import { persistToLocalStorage } from '../core/save'
import { gameState } from '../core/state'
import { MATERIALS } from '../data/materials'
import { SKILLS, getSpecies } from '../data/monsters'
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
  private fusionMode = false
  private fusionPicks: string[] = []
  private fusionButton!: Phaser.GameObjects.Text
  private skillPanel: Phaser.GameObjects.Container | null = null
  private materialButtons = new Map<string, Phaser.GameObjects.Text>()

  constructor() {
    super('Roster')
  }

  create() {
    bgm.enter(this, 'Roster')
    fadeIn(this)
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
    addButton(this, 64, 64, '孵化する', {
      fontSize: 18,
      color: '#2e7d32',
      padding: { x: 12, y: 6 },
      onClick: () => this.hatch(),
    })

    this.fusionMode = false
    this.fusionPicks = []
    this.skillPanel = null
    this.fusionButton = addButton(this, 64, 108, '配合する', {
      fontSize: 18,
      color: '#8e24aa',
      padding: { x: 12, y: 6 },
      onClick: () => this.toggleFusionMode(),
    })

    this.infoText = this.add
      .text(480, 512, '', { fontSize: '16px', color: '#9cd8ff' })
      .setOrigin(0.5)

    // 餌やり: 選択中の個体に素材を与える（素材種別と上昇量は data/materials.ts）
    this.materialButtons.clear()
    MATERIALS.forEach((mat, i) => {
      const btn = addButton(this, 190 + i * 195, 478, '', {
        fontSize: 14,
        color: '#5d4037',
        padding: { x: 8, y: 4 },
        onClick: () => this.feedSelected(mat.id),
      })
      this.materialButtons.set(mat.id, btn)
    })
    this.refreshMaterialUi()

    addButton(this, 884, 40, 'もどる', {
      padding: { x: 16, y: 6 },
      onClick: () => fadeToScene(this, 'Main'),
    })

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
      const highlighted = this.fusionMode
        ? this.fusionPicks.includes(m.uid)
        : m.uid === this.selectedUid
      if (highlighted) {
        this.rosterContainer.add(
          this.add
            .rectangle(x, y, 96, 96)
            .setStrokeStyle(3, this.fusionMode ? 0xff5fd7 : 0xffe24a),
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

  private refreshMaterialUi() {
    for (const mat of MATERIALS) {
      const btn = this.materialButtons.get(mat.id)
      if (!btn) continue
      const count = gameState.materials[mat.id] ?? 0
      btn.setText(`${mat.label} ×${count}`)
      const usable = count > 0 && this.selectedUid !== null && !this.fusionMode
      if (usable) {
        btn.setInteractive({ useHandCursor: true })
        btn.setAlpha(1)
      } else {
        btn.disableInteractive()
        btn.setAlpha(0.45)
      }
    }
  }

  private feedSelected(materialId: (typeof MATERIALS)[number]['id']) {
    if (!this.selectedUid || this.fusionMode) return
    if ((gameState.materials[materialId] ?? 0) <= 0) return
    feed(gameState, this.selectedUid, materialId)
    persistToLocalStorage(gameState)
    this.select(this.selectedUid) // ステータス表示を更新
  }

  private select(uid: string) {
    if (this.fusionMode) {
      this.pickFusionParent(uid)
      return
    }
    this.selectedUid = uid
    const m = getInstance(gameState, uid)
    const s = totalStats(m)
    this.infoText.setText(
      `${getSpecies(m.speciesId).label}  HP${s.hp} こうげき${s.atk} ぼうぎょ${s.def} すばやさ${s.spd}  わざ:${SKILLS[m.skillId].label}`,
    )
    this.rebuildRoster()
    this.refreshMaterialUi()
  }

  // ---- 配合フロー: モード開始 → 親2体選択 → 継承スキル選択 → 実行 ----

  private toggleFusionMode() {
    if (this.skillPanel) return
    if (!this.fusionMode && gameState.roster.length < MIN_ROSTER_FOR_FUSION) {
      this.infoText.setText(`配合には手持ち${MIN_ROSTER_FOR_FUSION}体以上が必要`)
      return
    }
    this.fusionMode = !this.fusionMode
    this.fusionPicks = []
    this.fusionButton.setText(this.fusionMode ? '配合をやめる' : '配合する')
    this.infoText.setText(this.fusionMode ? '親にする2体を選んでください' : '')
    this.rebuildRoster()
    this.refreshMaterialUi()
  }

  private pickFusionParent(uid: string) {
    if (this.skillPanel) return
    const i = this.fusionPicks.indexOf(uid)
    if (i >= 0) this.fusionPicks.splice(i, 1)
    else if (this.fusionPicks.length < 2) this.fusionPicks.push(uid)
    this.rebuildRoster()
    if (this.fusionPicks.length === 2) this.showSkillChoice()
  }

  private showSkillChoice() {
    const [a, b] = this.fusionPicks.map((uid) => getInstance(gameState, uid))
    const panel = this.add.container(480, 270)
    panel.add(addPanel(this, 0, 0, 420, 180, 0.96))
    panel.add(
      this.add
        .text(0, -60, '継承するスキルを選んでください', { fontSize: '18px', color: '#ffffff' })
        .setOrigin(0.5),
    )
    const options: [string, string][] = [
      [a.skillId, `${getSpecies(a.speciesId).label}の ${SKILLS[a.skillId].label}`],
      [b.skillId, `${getSpecies(b.speciesId).label}の ${SKILLS[b.skillId].label}`],
    ]
    options.forEach(([skillId, label], idx) => {
      const btn = addButton(this, 0, -18 + idx * 42, label, {
        fontSize: 17,
        color: '#8e24aa',
        padding: { x: 14, y: 6 },
        onClick: () => this.executeFusion(skillId),
      })
      panel.add(btn)
    })
    const cancel = addButton(this, 0, 66, 'キャンセル', {
      fontSize: 14,
      color: '#37474f',
      padding: { x: 10, y: 4 },
      onClick: () => {
        this.closeSkillPanel()
        this.fusionPicks = []
        this.rebuildRoster()
      },
    })
    panel.add(cancel)
    this.skillPanel = panel
  }

  private closeSkillPanel() {
    this.skillPanel?.destroy(true)
    this.skillPanel = null
  }

  private executeFusion(skillId: string) {
    const [uidA, uidB] = this.fusionPicks
    this.closeSkillPanel()
    const child = fuse(gameState, uidA, uidB, skillId)
    persistToLocalStorage(gameState)
    this.fusionMode = false
    this.fusionPicks = []
    this.selectedUid = null
    this.fusionButton.setText('配合する')
    this.refreshParty()
    this.rebuildRoster()
    const label = getSpecies(child.speciesId).label
    this.infoText.setText('')
    const banner = this.add
      .text(480, 230, `新種誕生！ ${label}`, {
        fontSize: '28px',
        color: '#ff5fd7',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    this.tweens.add({
      targets: banner,
      alpha: 0,
      delay: 1300,
      duration: 300,
      onComplete: () => banner.destroy(),
    })
  }

  private onPartySlot(slot: number) {
    if (!this.selectedUid) return
    assignToParty(gameState, slot, this.selectedUid)
    persistToLocalStorage(gameState)
    this.refreshParty()
    this.rebuildRoster()
  }

  private hatch() {
    const born = hatchEgg(gameState, this.rng)
    this.refreshEggUi()
    if (!born) return
    persistToLocalStorage(gameState)
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
