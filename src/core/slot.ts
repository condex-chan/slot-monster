// 抽選エンジン（pure TS・Phaser非依存）。
// 当選役はスピン開始時に1回の乱数で確定する（タイミング非依存＝公正、design.md 操作仕様）
import type { Rng } from './rng'
import { PAYTABLE, type RoleId } from '../data/paytable'

export function drawRole(rng: Rng): RoleId {
  const r = rng()
  let cumulative = 0
  for (const role of PAYTABLE) {
    cumulative += role.probability
    if (r < cumulative) return role.id
  }
  return 'none'
}
