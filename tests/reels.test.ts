import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../src/core/rng'
import { REEL_STRIP, isReach, reelWindow, resolveOutcome } from '../src/core/reels'
import { PAYTABLE } from '../src/data/paytable'

describe('REEL_STRIP', () => {
  it('全役の図柄を重複なく含む', () => {
    expect(new Set(REEL_STRIP).size).toBe(REEL_STRIP.length)
    expect(REEL_STRIP.length).toBe(PAYTABLE.length)
  })
})

describe('resolveOutcome — 表示出目と抽選結果の整合', () => {
  it.each(PAYTABLE.map((r) => [r.id] as const))(
    '当選役 %s は有効ライン上に3つ揃いで並ぶ',
    (id) => {
      const rng = mulberry32(1)
      expect(resolveOutcome(id, rng)).toEqual([id, id, id])
    },
  )

  it('ハズレは1万試行で一度も3つ揃いにならない', () => {
    const rng = mulberry32(999)
    for (let i = 0; i < 10_000; i++) {
      const [a, b, c] = resolveOutcome('none', rng)
      expect(a === b && b === c).toBe(false)
      expect(REEL_STRIP).toContain(a)
      expect(REEL_STRIP).toContain(b)
      expect(REEL_STRIP).toContain(c)
    }
  })
})

describe('isReach', () => {
  it('先2リール一致でリーチ、不一致でリーチでない', () => {
    expect(isReach(['door', 'door', 'copper'])).toBe(true)
    expect(isReach(['door', 'copper', 'door'])).toBe(false)
  })
})

describe('reelWindow', () => {
  it('中央が出目図柄、上下は帯の隣接図柄になる', () => {
    for (const symbol of REEL_STRIP) {
      const [above, center, below] = reelWindow(symbol)
      const i = REEL_STRIP.indexOf(symbol)
      const n = REEL_STRIP.length
      expect(center).toBe(symbol)
      expect(above).toBe(REEL_STRIP[(i + n - 1) % n])
      expect(below).toBe(REEL_STRIP[(i + 1) % n])
    }
  })
})
