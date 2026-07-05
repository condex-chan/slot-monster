import Phaser from 'phaser'
import { bgm } from '../assets/bgm'
import { addButton } from '../ui/button'
import { fadeIn, fadeToScene } from '../ui/transitions'
import { PAYTABLE, probabilityFor, type RoleId } from '../data/paytable'

// 確率表: 役テーブルの実値を常時公開する（「確率を大事に」の見える化、design.md）。
// 1ライン/3ラインの2列で、3ライン時に上がるレア役をハイライトする
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

const fmt = (p: number) => `1/${Math.round(1 / p)} (${(p * 100).toFixed(1)}%)`

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

    const header = { fontSize: '15px', color: '#8899aa' }
    this.add.text(130, 80, '役（3つ揃い）', header)
    this.add.text(300, 80, '確率（1ライン）', header)
    this.add.text(480, 80, '確率（3ライン）', header)
    this.add.text(660, 80, '効果', header)

    const rowStyle = { fontSize: '17px', color: '#ffffff' }
    PAYTABLE.forEach((role, i) => {
      const y = 114 + i * 36
      const p1 = probabilityFor(role, 1)
      const p3 = probabilityFor(role, 3)
      const boosted = p3 !== p1
      this.add.text(130, y, role.label, rowStyle)
      this.add.text(300, y, fmt(p1), rowStyle)
      this.add.text(480, y, boosted ? `${fmt(p3)} ↑` : fmt(p3), {
        fontSize: '17px',
        color: boosted ? '#ff9cee' : '#8899aa',
      })
      const effects = [
        role.payoutMult > 0 ? `ベット×${role.payoutMult}` : '',
        EFFECT_LABEL[role.id],
      ].filter(Boolean)
      this.add.text(660, y, effects.join(' / '), { fontSize: '15px', color: '#9cd8ff' })
    })

    const missY = 114 + PAYTABLE.length * 36
    const miss1 = 1 - PAYTABLE.reduce((sum, r) => sum + probabilityFor(r, 1), 0)
    const miss3 = 1 - PAYTABLE.reduce((sum, r) => sum + probabilityFor(r, 3), 0)
    const missStyle = { fontSize: '17px', color: '#8899aa' }
    this.add.text(130, missY, 'ハズレ', missStyle)
    this.add.text(300, missY, `(${(miss1 * 100).toFixed(1)}%)`, missStyle)
    this.add.text(480, missY, `(${(miss3 * 100).toFixed(1)}%)`, missStyle)

    this.add.text(
      130,
      missY + 42,
      '3ラインベット(30コイン): 払い出しはベット比例(3倍)、レア役（扉・タマゴ・フラッシュ）が約2倍\n揃いやすく、当たりは上・中・下いずれかのラインに出現する',
      { fontSize: '14px', color: '#9cd8ff', lineSpacing: 6 },
    )

    addButton(this, 884, 40, 'もどる', {
      padding: { x: 16, y: 6 },
      onClick: () => fadeToScene(this, 'Main'),
    })
  }
}
