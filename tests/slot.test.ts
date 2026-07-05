import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../src/core/rng'
import { drawRole } from '../src/core/slot'
import { PAYTABLE, type RoleId } from '../src/data/paytable'

describe('mulberry32', () => {
  it('同じシードなら同じ系列を返す（再現性）', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 100; i++) expect(a()).toBe(b())
  })

  it('異なるシードは異なる系列を返す', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    const seqA = Array.from({ length: 10 }, () => a())
    const seqB = Array.from({ length: 10 }, () => b())
    expect(seqA).not.toEqual(seqB)
  })

  it('値域は [0, 1)', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 10000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('役テーブル', () => {
  it('確率の合計が1以下（残りがハズレ）', () => {
    const total = PAYTABLE.reduce((sum, r) => sum + r.probability, 0)
    expect(total).toBeLessThanOrEqual(1)
    expect(total).toBeGreaterThan(0)
  })

  it('通常時RTP（コインのみ）が90〜95%', () => {
    const rtp = PAYTABLE.reduce((sum, r) => sum + r.probability * r.payoutMult, 0)
    expect(rtp).toBeGreaterThanOrEqual(0.9)
    expect(rtp).toBeLessThanOrEqual(0.95)
  })
})

describe('drawRole 分布検証（10万試行）', () => {
  const TRIALS = 100_000
  const rng = mulberry32(12345)
  const counts = new Map<RoleId, number>()
  for (let i = 0; i < TRIALS; i++) {
    const role = drawRole(rng)
    counts.set(role, (counts.get(role) ?? 0) + 1)
  }

  it.each(PAYTABLE.map((r) => [r.id, r.probability] as const))(
    '%s の出現率が期待確率±30%相対誤差内',
    (id, probability) => {
      const observed = (counts.get(id) ?? 0) / TRIALS
      expect(observed).toBeGreaterThanOrEqual(probability * 0.7)
      expect(observed).toBeLessThanOrEqual(probability * 1.3)
    },
  )

  it('ハズレの出現率も期待値±30%相対誤差内', () => {
    const noneExpected = 1 - PAYTABLE.reduce((sum, r) => sum + r.probability, 0)
    const observed = (counts.get('none') ?? 0) / TRIALS
    expect(observed).toBeGreaterThanOrEqual(noneExpected * 0.7)
    expect(observed).toBeLessThanOrEqual(noneExpected * 1.3)
  })
})
