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
  /** 次のスピンを天井確定にする */
  forceRush(): void
  /** メイン画面で1スピンを即時完了させる */
  spinOnce(): void
  /** バトルを終局まで早送りする（結果画面まで進む） */
  fastForwardBattle(): void
  battleOver(): boolean
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
    forceRush: () => {
      gameState.spinsSinceBattle = CEILING_SPINS
    },
    spinOnce: () => (game.scene.getScene('Main') as MainScene).debugSpinOnce(),
    fastForwardBattle: () => (game.scene.getScene('Battle') as BattleScene).debugFastForward(),
    battleOver: () => (game.scene.getScene('Battle') as BattleScene).isBattleOver(),
  }
}
