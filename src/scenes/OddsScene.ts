import Phaser from 'phaser'
import { bgm } from '../assets/bgm'
import { addButton } from '../ui/button'
import { fadeIn, fadeToScene } from '../ui/transitions'
import { PAYTABLE, type RoleId } from '../data/paytable'

// 確率表: 役テーブルの実値を常時公開する（「確率を大事に」の見える化、design.md）
const EFFECT_LABEL: Record<Exclude<RoleId, 'none'>, string> = {
  copper: '',
  silver: '',
  gold: '',
  egg: 'タマゴ獲得',
  sword: 'ラッシュ中: 全員追撃',
  heart: 'ラッシュ中: 全員回復',
  star: 'ラッシュ中: スキル発動',
  door: 'バトルラッシュ突入',
  flash: '目押しチャンス',
}

export class OddsScene extends Phaser.Scene {
  constructor() {
    super('Odds')
  }

  create() {
    bgm.enter(this, 'Odds')
    fadeIn(this)
    this.add
      .text(480, 36, '確率表', { fontSize: '26px', color: '#ffd700', padding: { top: 5 } })
      .setOrigin(0.5)

    const header = { fontSize: '16px', color: '#8899aa' }
    this.add.text(160, 80, '役（3つ揃い）', header)
    this.add.text(420, 80, '確率', header)
    this.add.text(620, 80, '効果', header)

    const rowStyle = { fontSize: '18px', color: '#ffffff' }
    PAYTABLE.forEach((role, i) => {
      const y = 116 + i * 38
      this.add.text(160, y, role.label, rowStyle)
      this.add.text(
        420,
        y,
        `1/${Math.round(1 / role.probability)} (${(role.probability * 100).toFixed(1)}%)`,
        rowStyle,
      )
      const effects = [
        role.payoutMult > 0 ? `ベット×${role.payoutMult}` : '',
        EFFECT_LABEL[role.id],
      ].filter(Boolean)
      this.add.text(620, y, effects.join(' / '), { fontSize: '16px', color: '#9cd8ff' })
    })

    const missProbability = 1 - PAYTABLE.reduce((sum, r) => sum + r.probability, 0)
    this.add.text(160, 116 + PAYTABLE.length * 38, 'ハズレ', {
      fontSize: '18px',
      color: '#8899aa',
    })
    this.add.text(420, 116 + PAYTABLE.length * 38, `(${(missProbability * 100).toFixed(1)}%)`, {
      fontSize: '18px',
      color: '#8899aa',
    })

    addButton(this, 884, 40, 'もどる', {
      padding: { x: 16, y: 6 },
      onClick: () => fadeToScene(this, 'Main'),
    })
  }
}
