import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { MainScene } from './scenes/MainScene'
import { BattleScene } from './scenes/BattleScene'
import { RosterScene } from './scenes/RosterScene'
import { DexScene } from './scenes/DexScene'
import { OddsScene } from './scenes/OddsScene'

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  backgroundColor: '#1a1026',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MainScene, BattleScene, RosterScene, DexScene, OddsScene],
})

// E2E/dev ビルドでのみ __DEBUG__ フックを露出（本番 dist には含めない）
if (import.meta.env.MODE !== 'production') {
  void import('./debug').then((m) => m.installDebugHooks(game))
}
