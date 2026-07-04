// シーン横断のゲーム状態（pure TS）。シーンは restart で作り直されるため
// 進行状態はここに持つ。F18 でこのオブジェクトを localStorage に保存する
import { INITIAL_COINS } from './economy'
import type { SpeciesId } from '../data/monsters'
import type { MaterialId } from '../data/materials'

export interface GameState {
  coins: number
  spinsSinceBattle: number
  /** 出撃パーティ（3体）。編成変更は F12 */
  party: SpeciesId[]
  /** 未孵化のタマゴ数 */
  eggs: number
  /** 配合素材の所持数 */
  materials: Record<MaterialId, number>
  /** 現在の階層 */
  floor: number
  /** 最高到達階層（ハイスコア） */
  bestFloor: number
}

export function createInitialState(): GameState {
  return {
    coins: INITIAL_COINS,
    spinsSinceBattle: 0,
    party: ['wolfy', 'draco', 'pururu'],
    eggs: 0,
    materials: { dew: 0, meat: 0, shard: 0, feather: 0 },
    floor: 1,
    bestFloor: 1,
  }
}

export const gameState: GameState = createInitialState()
