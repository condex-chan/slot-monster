// 3ラインベットの出目解決（pure TS・Phaser非依存）。
// 設計: 抽選は従来どおりスピンごとに1回（確率・RTPは1ライン時と同一）。
// 3コインベット時は当たりの3揃いが上・中・下いずれかのラインに等確率で出現し、
// 払い出しがベット比例（3倍）になる。同時複数ライン当選は仕様として存在しない
import type { Rng } from './rng'
import { REEL_STRIPS, type Outcome, type SymbolId } from './reels'
import type { RoleId } from '../data/paytable'

/** 0=上段, 1=中央, 2=下段 */
export type LineIndex = 0 | 1 | 2

export type BetLines = 1 | 3

export const LINE_LABELS: readonly string[] = ['上段', '中央', '下段']

/** セーブから読んだベットライン数の正規化。旧セーブ（フィールドなし）は1ライン */
export function normalizeBetLines(value: unknown): BetLines {
  return value === 3 ? 3 : 1
}

export interface SpinResult {
  role: RoleId
  /** 当選ライン。ハズレ時は 1（意味を持たない） */
  line: LineIndex
  /** 各リールの中央図柄（帯の停止位置の基準はあくまで中央段） */
  centers: Outcome
}

const n = REEL_STRIPS[0].length

/** リール reel の中央図柄 center のとき、段 row に表示される図柄（帯規約: 上=次、下=前） */
export function rowSymbolFor(reel: number, center: SymbolId, row: LineIndex): SymbolId {
  if (row === 1) return center
  const strip = REEL_STRIPS[reel]
  const i = strip.indexOf(center)
  return row === 0 ? strip[(i + 1) % n] : strip[(i + n - 1) % n]
}

/** 段 row に図柄 s を出すために必要な、リール reel の中央図柄 */
export function centerForRow(reel: number, s: SymbolId, row: LineIndex): SymbolId {
  if (row === 1) return s
  const strip = REEL_STRIPS[reel]
  const i = strip.indexOf(s)
  return row === 0 ? strip[(i + n - 1) % n] : strip[(i + 1) % n]
}

/** 段 row が3揃いしているか */
export function lineMatches(centers: Outcome, row: LineIndex): boolean {
  const a = rowSymbolFor(0, centers[0], row)
  const b = rowSymbolFor(1, centers[1], row)
  const c = rowSymbolFor(2, centers[2], row)
  return a === b && b === c
}

/** いずれかの段が3揃いしているか（ハズレ出目の妥当性チェック） */
export function anyLineMatch(centers: Outcome): boolean {
  return lineMatches(centers, 0) || lineMatches(centers, 1) || lineMatches(centers, 2)
}

// 決定的なハズレ出目（乱数の棄却が万一尽きたときの保険）。モジュール初期化時に探索する
const SAFE_MISS: Outcome = (() => {
  for (const a of REEL_STRIPS[0]) {
    for (const b of REEL_STRIPS[0]) {
      for (const c of REEL_STRIPS[0]) {
        const centers: Outcome = [a, b, c]
        if (!anyLineMatch(centers)) return centers
      }
    }
  }
  throw new Error('no safe miss outcome exists') // 帯設計が壊れている場合のみ
})()

/**
 * スピン結果の出目を決める。
 * - 当選: 当たりラインを決め（3ライン時は等確率、1ライン時は中央固定）、
 *   そのラインに3揃いが出る中央図柄を逆算する。帯の歩幅設計により他ラインは揃わない
 * - ハズレ: どのラインにも3揃いが出ない中央図柄の組を棄却法で選ぶ
 */
export function resolveSpinLines(role: RoleId, lines: BetLines, rng: Rng): SpinResult {
  if (role !== 'none') {
    const line: LineIndex = lines === 3 ? ((Math.floor(rng() * 3) % 3) as LineIndex) : 1
    const centers = [0, 1, 2].map((reel) => centerForRow(reel, role, line)) as unknown as Outcome
    return { role, line, centers }
  }
  for (let tries = 0; tries < 100; tries++) {
    const centers = [0, 1, 2].map(
      () => REEL_STRIPS[0][Math.floor(rng() * n)],
    ) as unknown as Outcome
    if (!anyLineMatch(centers)) return { role, line: 1, centers }
  }
  return { role, line: 1, centers: SAFE_MISS }
}
