import Phaser from 'phaser'
import { isDiscovered } from '../core/collection'
import { gameState } from '../core/state'
import { SPECIES } from '../data/monsters'
import { monsterTextureKey } from '../assets/keys'

// 図鑑: 発見済みは名前付き、未発見はシルエット（TintFill）+「???」でコンプ欲を煽る
const COLS = 5

export class DexScene extends Phaser.Scene {
  constructor() {
    super('Dex')
  }

  create() {
    const found = SPECIES.filter((s) => isDiscovered(gameState, s.id)).length
    this.add
      .text(480, 36, `図鑑（${found} / ${SPECIES.length}）`, {
        fontSize: '26px',
        color: '#ffd700',
      })
      .setOrigin(0.5)

    SPECIES.forEach((s, idx) => {
      const col = idx % COLS
      const row = Math.floor(idx / COLS)
      const x = 160 + col * 160
      const y = 150 + row * 140
      const img = this.add.image(x, y, monsterTextureKey(s.id)).setScale(0.8)
      const discovered = isDiscovered(gameState, s.id)
      if (!discovered) img.setTintFill(0x23233a)
      this.add
        .text(x, y + 56, discovered ? s.label : '？？？', {
          fontSize: '14px',
          color: discovered ? '#ffffff' : '#555577',
        })
        .setOrigin(0.5)
    })

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
  }
}
