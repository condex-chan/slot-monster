// シーン横断のゲーム状態（pure TS）。シーンは restart で作り直されるため
// 進行状態はここに持つ。F18 でこのオブジェクトを localStorage に保存する
import { INITIAL_COINS } from './economy'
import type { GuideStep } from './onboarding'
import type { SpeciesId } from '../data/monsters'
import type { MaterialId } from '../data/materials'

export interface MonsterBonus {
  hp: number
  atk: number
  def: number
  spd: number
}

/** 手持ちモンスターの個体。餌やり(F14)・配合(F13)の上乗せは bonus に積む */
export interface MonsterInstance {
  uid: string
  speciesId: SpeciesId
  bonus: MonsterBonus
  /** 所持スキル（配合で親から継承。基本は種族デフォルト） */
  skillId: string
}

export interface GameState {
  coins: number
  spinsSinceBattle: number
  /** 手持ちモンスター */
  roster: MonsterInstance[]
  /** 出撃パーティ（roster の uid 3つ） */
  party: string[]
  /** 個体 uid 採番カウンタ */
  nextUid: number
  /** 未孵化のタマゴ数 */
  eggs: number
  /** 配合素材の所持数 */
  materials: Record<MaterialId, number>
  /** 現在の階層 */
  floor: number
  /** 最高到達階層（ハイスコア） */
  bestFloor: number
  /** 図鑑: 発見済み種族（入手した種族を記録） */
  discovered: SpeciesId[]
  /** オートスピン設定（解放後のみ有効化できる） */
  autoSpin: boolean
  /** 初回オンボーディングの進行段階（done で完了） */
  guide: GuideStep
}

const zeroBonus = (): MonsterBonus => ({ hp: 0, atk: 0, def: 0, spd: 0 })

export function createInitialState(): GameState {
  return {
    coins: INITIAL_COINS,
    spinsSinceBattle: 0,
    roster: [
      { uid: 'm1', speciesId: 'wolfy', bonus: zeroBonus(), skillId: 'fang' },
      { uid: 'm2', speciesId: 'draco', bonus: zeroBonus(), skillId: 'fireBreath' },
      { uid: 'm3', speciesId: 'pururu', bonus: zeroBonus(), skillId: 'healDrop' },
    ],
    party: ['m1', 'm2', 'm3'],
    nextUid: 4,
    eggs: 0,
    materials: { dew: 0, meat: 0, shard: 0, feather: 0 },
    floor: 1,
    bestFloor: 1,
    discovered: ['wolfy', 'draco', 'pururu'],
    autoSpin: false,
    guide: 'spin',
  }
}

export const gameState: GameState = createInitialState()
