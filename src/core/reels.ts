// リール出目の解決（pure TS・Phaser非依存）。
// 当選役は drawRole で確定済み。ここでは「表示出目が抽選結果と整合する」ことだけを保証する
import type { Rng } from './rng'
import { PAYTABLE, type RoleId } from '../data/paytable'

export type SymbolId = Exclude<RoleId, 'none'>

// リール帯: 全図柄1周。停止時の上下段は帯の隣接図柄を表示する
export const REEL_STRIP: readonly SymbolId[] = PAYTABLE.map((r) => r.id)

// リール別の帯（3ライン用）。全リールが同じ並びだと中央が揃った瞬間に
// 上下段も自動で揃ってしまうため、リールごとに巡回の歩幅を変えた順列にする。
// stride は 9 と互いに素（1,2,4）なので必ず全図柄を1回ずつ含む
const strideStrip = (k: number): readonly SymbolId[] =>
  REEL_STRIP.map((_, i) => REEL_STRIP[(i * k) % REEL_STRIP.length])

export const REEL_STRIPS: readonly (readonly SymbolId[])[] = [
  strideStrip(1),
  strideStrip(2),
  strideStrip(4),
]

export type Outcome = [SymbolId, SymbolId, SymbolId]

/** 中央有効ライン上の3図柄を決める。当選役なら3つ揃い、ハズレなら決して3つ揃いにしない */
export function resolveOutcome(role: RoleId, rng: Rng): Outcome {
  if (role !== 'none') return [role, role, role]
  const n = REEL_STRIP.length
  const a = REEL_STRIP[Math.floor(rng() * n)]
  const b = REEL_STRIP[Math.floor(rng() * n)]
  let c = REEL_STRIP[Math.floor(rng() * n)]
  if (a === b && b === c) c = REEL_STRIP[(REEL_STRIP.indexOf(c) + 1) % n]
  return [a, b, c]
}

/** リーチ判定: 先に止まる2リールの出目が一致しているか */
export function isReach(outcome: Outcome): boolean {
  return outcome[0] === outcome[1]
}

/** 停止時にリール窓（上中下3段）へ出す図柄。中央=出目、上下=帯の隣接図柄 */
export function reelWindow(center: SymbolId): [SymbolId, SymbolId, SymbolId] {
  const n = REEL_STRIP.length
  const i = REEL_STRIP.indexOf(center)
  return [REEL_STRIP[(i + n - 1) % n], center, REEL_STRIP[(i + 1) % n]]
}
