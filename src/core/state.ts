// シーン横断のゲーム状態（pure TS）。シーンは restart で作り直されるため
// 進行状態はここに持つ。F18 でこのオブジェクトを localStorage に保存する
import { INITIAL_COINS } from './economy'
import type { SpeciesId } from '../data/monsters'

export interface GameState {
  coins: number
  spinsSinceBattle: number
  /** 出撃パーティ（3体）。編成変更は F12 */
  party: SpeciesId[]
}

export function createInitialState(): GameState {
  return {
    coins: INITIAL_COINS,
    spinsSinceBattle: 0,
    party: ['wolfy', 'draco', 'pururu'],
  }
}

export const gameState: GameState = createInitialState()
