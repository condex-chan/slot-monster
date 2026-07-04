// オートスピン（pure TS・Phaser非依存）
import type { GameState } from './state'

/** 解放条件: 階層5をクリア = 6階層目に到達していること */
export const AUTO_UNLOCK_FLOOR = 6

export function isAutoUnlocked(state: Pick<GameState, 'bestFloor'>): boolean {
  return state.bestFloor >= AUTO_UNLOCK_FLOOR
}

/**
 * 目押し成否の最終判定。オート中は光っていても常に失敗扱い（満額不可）で、
 * 「手で打つと期待値が少し上がる」設計(design.md)を保証する
 */
export function resolveFlashSuccess(isAuto: boolean, timedHit: boolean): boolean {
  return isAuto ? false : timedHit
}
