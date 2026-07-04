import { describe, expect, it } from 'vitest'
import { REEL_STRIP } from '../src/core/reels'
import {
  CENTER_SLOT,
  SLOT_COUNT,
  bandShift,
  bandSymbolAt,
  snapPositionFor,
} from '../src/core/reelband'

const n = REEL_STRIP.length

describe('bandSymbolAt — 帯の連続性', () => {
  it('p が整数をまたぐとき、下へ1セル流れた図柄が次のスロットに引き継がれる', () => {
    // 位置 k+1-ε のスロット j と、位置 k+1 のスロット j+1 は同じ画面位置。
    // そこに同じ図柄が出ることがスクロールの連続性
    for (let k = -3; k < n + 3; k++) {
      for (let j = 0; j < SLOT_COUNT - 1; j++) {
        expect(bandSymbolAt(k + 1, j + 1)).toBe(bandSymbolAt(k + 0.999, j))
      }
    }
  })

  it('負の位置でも帯の順序が保たれる（mod の負値対応）', () => {
    for (let j = 0; j < SLOT_COUNT; j++) {
      expect(bandSymbolAt(-1, j)).toBe(REEL_STRIP[(((-1 - j) % n) + n) % n])
    }
  })

  it('隣接スロットは REEL_STRIP の隣接図柄（固定順）', () => {
    for (let p = 0; p < n; p++) {
      for (let j = 0; j < SLOT_COUNT - 1; j++) {
        const upper = bandSymbolAt(p, j)
        const lower = bandSymbolAt(p, j + 1)
        expect(REEL_STRIP.indexOf(upper)).toBe(
          (REEL_STRIP.indexOf(lower) + 1) % n,
        )
      }
    }
  })
})

describe('bandShift', () => {
  it('常に [0,1) に収まり、小数部と一致する', () => {
    expect(bandShift(3)).toBe(0)
    expect(bandShift(3.25)).toBeCloseTo(0.25)
    expect(bandShift(-0.75)).toBeCloseTo(0.25)
  })
})

describe('snapPositionFor — 停止位置の計算', () => {
  it('全図柄×さまざまな現在位置で、中央スロットに指定図柄が出る整数位置を返す', () => {
    for (const symbol of REEL_STRIP) {
      for (const minP of [0, 0.4, 1, 7.99, 123.5, 1000]) {
        const p = snapPositionFor(symbol, minP)
        expect(Number.isInteger(p)).toBe(true)
        expect(p).toBeGreaterThanOrEqual(minP)
        expect(bandSymbolAt(p, CENTER_SLOT)).toBe(symbol)
      }
    }
  })

  it('minP から1周以内に必ず停止位置がある（余計に回りすぎない）', () => {
    for (const symbol of REEL_STRIP) {
      const p = snapPositionFor(symbol, 10.2)
      expect(p - 10.2).toBeLessThan(n + 1)
    }
  })

  it('停止位置の窓は中央=出目、上下=帯の隣接図柄になる', () => {
    for (const symbol of REEL_STRIP) {
      const p = snapPositionFor(symbol, 5)
      const above = bandSymbolAt(p, CENTER_SLOT - 1)
      const below = bandSymbolAt(p, CENTER_SLOT + 1)
      const i = REEL_STRIP.indexOf(symbol)
      expect(above).toBe(REEL_STRIP[(i + 1) % n])
      expect(below).toBe(REEL_STRIP[(i + n - 1) % n])
    }
  })
})
