// バトル報酬と敗北保険（pure TS・Phaser非依存）
import type { Rng } from './rng'
import type { GameState } from './state'
import { MATERIALS, type MaterialId } from '../data/materials'

export interface BattleRewards {
  coins: number
  eggs: number
  materials: MaterialId[]
}

/** 敗北時に投入コインが戻る割合（保険） */
export const DEFEAT_REFUND_RATIO = 0.5
/** 勝利コイン = 基礎 + 階層ボーナス */
export const WIN_COINS_BASE = 150
export const WIN_COINS_PER_FLOOR = 50

function randomMaterial(rng: Rng): MaterialId {
  return MATERIALS[Math.floor(rng() * MATERIALS.length)].id
}

export function computeRewards(
  won: boolean,
  spentCoins: number,
  floor: number,
  rng: Rng,
): BattleRewards {
  if (won) {
    return {
      coins: WIN_COINS_BASE + floor * WIN_COINS_PER_FLOOR,
      eggs: 1,
      materials: [randomMaterial(rng), randomMaterial(rng)],
    }
  }
  return {
    coins: Math.floor(spentCoins * DEFEAT_REFUND_RATIO),
    eggs: 0,
    materials: [randomMaterial(rng)],
  }
}

export function applyRewards(state: GameState, rewards: BattleRewards): void {
  state.coins += rewards.coins
  state.eggs += rewards.eggs
  for (const id of rewards.materials) {
    state.materials[id] = (state.materials[id] ?? 0) + 1
  }
}
