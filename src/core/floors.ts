// 階層進行（pure TS・Phaser非依存）。ハイスコア=到達階層
import type { GameState } from './state'

/** 10階層ごとにボス */
export function isBossFloor(floor: number): boolean {
  return floor % 10 === 0
}

/** 階層に応じた敵ステータス倍率 */
export function enemyScale(floor: number): number {
  return 1 + (floor - 1) * 0.12
}

/** 勝利で階層+1・最高階層更新。敗北は据え置き */
export function advanceFloor(state: GameState, won: boolean): void {
  if (!won) return
  state.floor += 1
  if (state.floor > state.bestFloor) state.bestFloor = state.floor
}
