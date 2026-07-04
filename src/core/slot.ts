// 抽選エンジン（pure TS・Phaser非依存）。
// 当選役はスピン開始時に1回の乱数で確定する（タイミング非依存＝公正、design.md 操作仕様）。
// 3ラインベット時はレア役（扉・タマゴ・フラッシュ）の確率だけが上がる
// （払い出し倍率0の役のみ＝コインRTPは1ライン時と同一、data/paytable.ts）
import type { Rng } from './rng'
import { PAYTABLE, probabilityFor, type RoleId } from '../data/paytable'

export function drawRole(rng: Rng, lines: 1 | 3 = 1): RoleId {
  const r = rng()
  let cumulative = 0
  for (const role of PAYTABLE) {
    cumulative += probabilityFor(role, lines)
    if (r < cumulative) return role.id
  }
  return 'none'
}
