// 餌やり強化（pure TS・Phaser非依存）。素材種別と上昇量は data/materials.ts が正
import { getInstance } from './collection'
import type { GameState } from './state'
import { getMaterial, type MaterialId } from '../data/materials'

/** 素材1個を消費して個体のステータスを強化する。素材不足は例外 */
export function feed(state: GameState, uid: string, materialId: MaterialId): void {
  const m = getInstance(state, uid)
  if ((state.materials[materialId] ?? 0) <= 0) {
    throw new Error(`素材が足りない: ${materialId}`)
  }
  const def = getMaterial(materialId)
  state.materials[materialId] -= 1
  m.bonus[def.stat] += def.gain
}
