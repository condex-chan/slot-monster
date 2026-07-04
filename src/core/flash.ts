// 目押し（取りこぼし方式）の報酬計算。pure TS・Phaser非依存
// 当選（フラッシュ役）はスピン開始時の drawRole で確定済みであり、
// タイミングの成否は報酬の満額/半額にだけ影響する
import type { Rng } from './rng'
import { MATERIALS, type MaterialId } from '../data/materials'

/** 満額時のコイン倍率（ベット基準） */
export const FLASH_FULL_MULT = 4

export interface FlashReward {
  coins: number
  materials: MaterialId[]
}

/** 成功=満額コイン+素材1、失敗=コイン半額・素材なし（取りこぼし） */
export function flashReward(success: boolean, bet: number, rng: Rng): FlashReward {
  const full = bet * FLASH_FULL_MULT
  if (success) {
    return {
      coins: full,
      materials: [MATERIALS[Math.floor(rng() * MATERIALS.length)].id],
    }
  }
  return { coins: Math.floor(full / 2), materials: [] }
}
