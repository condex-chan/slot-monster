import { describe, expect, it } from 'vitest'
import {
  CEILING_SPINS,
  entersBattle,
  isForcedByCeiling,
  nextCeilingCount,
  spinsUntilCeiling,
} from '../src/core/ceiling'

describe('天井システム', () => {
  it('40スピン非突入なら41回目は役に関わらず必ず突入する', () => {
    let count = 0
    // ハズレを40回引き続ける
    for (let spin = 1; spin <= CEILING_SPINS; spin++) {
      const entered = entersBattle('none', count)
      expect(entered).toBe(false)
      count = nextCeilingCount(entered, count)
    }
    expect(count).toBe(CEILING_SPINS)
    // 41回目: ハズレでも突入確定
    expect(entersBattle('none', count)).toBe(true)
    expect(entersBattle('copper', count)).toBe(true)
  })

  it('扉3揃いは天井前でも突入する', () => {
    expect(entersBattle('door', 0)).toBe(true)
    expect(entersBattle('door', 10)).toBe(true)
  })

  it('突入でカウンタが0にリセットされる', () => {
    expect(nextCeilingCount(true, 25)).toBe(0)
    expect(nextCeilingCount(false, 25)).toBe(26)
  })

  it('天井判定の境界: 39では強制されず40で強制される', () => {
    expect(isForcedByCeiling(CEILING_SPINS - 1)).toBe(false)
    expect(isForcedByCeiling(CEILING_SPINS)).toBe(true)
  })

  it('残りスピン数は減っていき0で下げ止まる', () => {
    expect(spinsUntilCeiling(0)).toBe(CEILING_SPINS)
    expect(spinsUntilCeiling(1)).toBe(CEILING_SPINS - 1)
    expect(spinsUntilCeiling(CEILING_SPINS)).toBe(0)
    expect(spinsUntilCeiling(CEILING_SPINS + 5)).toBe(0)
  })
})
