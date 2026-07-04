// シーン横断のゲーム状態（pure TS）。シーンは restart で作り直されるため
// 進行状態はここに持つ。F18 でこのオブジェクトを localStorage に保存する
import { INITIAL_COINS } from './economy'

export interface GameState {
  coins: number
  spinsSinceBattle: number
}

export function createInitialState(): GameState {
  return {
    coins: INITIAL_COINS,
    spinsSinceBattle: 0,
  }
}

export const gameState: GameState = createInitialState()
