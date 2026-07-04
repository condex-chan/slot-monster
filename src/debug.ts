// E2E/dev 専用フック。main.ts で MODE !== 'production' のときだけ動的importされる
import type Phaser from 'phaser'
import { CEILING_SPINS } from './core/ceiling'
import { gameState } from './core/state'
import type { MainScene } from './scenes/MainScene'
import type { BattleScene } from './scenes/BattleScene'

export interface DebugApi {
  state: typeof gameState
  activeScene(): string
  addCoins(n: number): void
  /** タイトル画面を飛ばして Main へ（E2E は既存フローを維持する） */
  skipTitle(): void
  /** 次のスピンを天井確定にする */
  forceRush(): void
  /** メイン画面で1スピンを即時完了させる */
  spinOnce(): void
  /** バトルを終局まで早送りする（結果画面まで進む） */
  fastForwardBattle(): void
  battleOver(): boolean
  /** テクスチャの出所: 外部画像ならロード元URL、コード生成なら 'generated' */
  textureSrc(key: string): string
}

declare global {
  interface Window {
    __DEBUG__?: DebugApi
  }
}

export function installDebugHooks(game: Phaser.Game): void {
  window.__DEBUG__ = {
    state: gameState,
    activeScene: () =>
      game.scene
        .getScenes(true)
        .map((s) => s.scene.key)
        .join(','),
    addCoins: (n) => {
      gameState.coins += n
    },
    skipTitle: () => {
      if (game.scene.isActive('Title')) game.scene.getScene('Title').scene.start('Main')
    },
    forceRush: () => {
      gameState.spinsSinceBattle = CEILING_SPINS
    },
    spinOnce: () => (game.scene.getScene('Main') as MainScene).debugSpinOnce(),
    fastForwardBattle: () => (game.scene.getScene('Battle') as BattleScene).debugFastForward(),
    battleOver: () => (game.scene.getScene('Battle') as BattleScene).isBattleOver(),
    textureSrc: (key) => {
      const image = game.textures.get(key).getSourceImage()
      return image instanceof HTMLImageElement ? image.src : 'generated'
    },
  }
}
