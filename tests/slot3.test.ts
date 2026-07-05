import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../src/core/rng'
import { drawRole } from '../src/core/slot'
import { PAYTABLE, probabilityFor } from '../src/data/paytable'

// 3ラインベットの抽選: レア役（扉・タマゴ・フラッシュ）だけが上がり、
// コイン役の確率とRTPは1ライン時と同一であることを保証する
describe('drawRole — 3ラインベットの確率テーブル', () => {
  it('確率の合計が1を超えない（両モード）', () => {
    for (const lines of [1, 3] as const) {
      const total = PAYTABLE.reduce((sum, r) => sum + probabilityFor(r, lines), 0)
      expect(total).toBeLessThan(1)
    }
  })

  it('コインRTPは1ラインと3ラインで完全に同一（上げたのは払い出し0の役だけ）', () => {
    const rtp = (lines: 1 | 3) =>
      PAYTABLE.reduce((sum, r) => sum + probabilityFor(r, lines) * r.payoutMult, 0)
    expect(rtp(3)).toBe(rtp(1))
  })

  it('レア役3種はすべて3ライン時に確率が上がる', () => {
    for (const id of ['door', 'egg', 'flash'] as const) {
      const role = PAYTABLE.find((r) => r.id === id)!
      expect(probabilityFor(role, 3)).toBeGreaterThan(probabilityFor(role, 1))
    }
  })

  it('コイン役・ブースト役の確率は変わらない', () => {
    for (const id of ['copper', 'silver', 'gold', 'sword', 'heart', 'star'] as const) {
      const role = PAYTABLE.find((r) => r.id === id)!
      expect(probabilityFor(role, 3)).toBe(probabilityFor(role, 1))
    }
  })

  it('10万試行の出現頻度がテーブルに一致する（3ライン）', () => {
    const rng = mulberry32(777)
    const counts = new Map<string, number>()
    const N = 100_000
    for (let i = 0; i < N; i++) {
      const role = drawRole(rng, 3)
      counts.set(role, (counts.get(role) ?? 0) + 1)
    }
    for (const role of PAYTABLE) {
      const expected = probabilityFor(role, 3)
      const actual = (counts.get(role.id) ?? 0) / N
      expect(Math.abs(actual - expected), role.id).toBeLessThan(expected * 0.15 + 0.002)
    }
  })

  it('lines 引数省略時は従来（1ライン）と同じ抽選', () => {
    const a = mulberry32(5)
    const b = mulberry32(5)
    for (let i = 0; i < 1000; i++) expect(drawRole(a)).toBe(drawRole(b, 1))
  })
})
