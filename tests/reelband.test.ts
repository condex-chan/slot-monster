import { describe, expect, it } from 'vitest'
import { REEL_STRIP, REEL_STRIPS } from '../src/core/reels'
import {
  CENTER_SLOT,
  SLOT_COUNT,
  bandShift,
  bandSymbolAt,
  snapPositionFor,
} from '../src/core/reelband'

const n = REEL_STRIP.length
const REELS = [0, 1, 2]

describe('bandSymbolAt — 帯の連続性（全リール）', () => {
  it('p が整数をまたぐとき、下へ1セル流れた図柄が次のスロットに引き継がれる', () => {
    // 位置 k+1-ε のスロット j と、位置 k+1 のスロット j+1 は同じ画面位置。
    // そこに同じ図柄が出ることがスクロールの連続性
    for (const reel of REELS) {
      for (let k = -3; k < n + 3; k++) {
        for (let j = 0; j < SLOT_COUNT - 1; j++) {
          expect(bandSymbolAt(reel, k + 1, j + 1)).toBe(bandSymbolAt(reel, k + 0.999, j))
        }
      }
    }
  })

  it('負の位置でも帯の順序が保たれる（mod の負値対応）', () => {
    for (const reel of REELS) {
      const strip = REEL_STRIPS[reel]
      for (let j = 0; j < SLOT_COUNT; j++) {
        expect(bandSymbolAt(reel, -1, j)).toBe(strip[(((-1 - j) % n) + n) % n])
      }
    }
  })

  it('隣接スロットは各リールの帯の隣接図柄（リール別固定順）', () => {
    for (const reel of REELS) {
      const strip = REEL_STRIPS[reel]
      for (let p = 0; p < n; p++) {
        for (let j = 0; j < SLOT_COUNT - 1; j++) {
          const upper = bandSymbolAt(reel, p, j)
          const lower = bandSymbolAt(reel, p, j + 1)
          expect(strip.indexOf(upper)).toBe((strip.indexOf(lower) + 1) % n)
        }
      }
    }
  })
})

describe('REEL_STRIPS — リール別の帯', () => {
  it('各リールの帯は全図柄を1回ずつ含む順列', () => {
    for (const strip of REEL_STRIPS) {
      expect(strip.length).toBe(n)
      expect(new Set(strip).size).toBe(n)
      expect([...strip].sort()).toEqual([...REEL_STRIP].sort())
    }
  })

  it('隣接関係（次の図柄）がリールごとに異なる（3ラインの同時揃い防止の前提）', () => {
    // どの図柄 s についても、3リールの「次の図柄」がすべて同じにはならない
    for (const s of REEL_STRIP) {
      const nexts = REEL_STRIPS.map((strip) => strip[(strip.indexOf(s) + 1) % n])
      expect(new Set(nexts).size).toBeGreaterThan(1)
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

describe('snapPositionFor — 停止位置の計算（全リール）', () => {
  it('全図柄×さまざまな現在位置で、中央スロットに指定図柄が出る整数位置を返す', () => {
    for (const reel of REELS) {
      for (const symbol of REEL_STRIP) {
        for (const minP of [0, 0.4, 1, 7.99, 123.5, 1000]) {
          const p = snapPositionFor(reel, symbol, minP)
          expect(Number.isInteger(p)).toBe(true)
          expect(p).toBeGreaterThanOrEqual(minP)
          expect(bandSymbolAt(reel, p, CENTER_SLOT)).toBe(symbol)
        }
      }
    }
  })

  it('minP から1周以内に必ず停止位置がある（余計に回りすぎない）', () => {
    for (const reel of REELS) {
      for (const symbol of REEL_STRIP) {
        const p = snapPositionFor(reel, symbol, 10.2)
        expect(p - 10.2).toBeLessThan(n + 1)
      }
    }
  })

  it('停止位置の窓は中央=出目、上下=そのリールの帯の隣接図柄になる', () => {
    for (const reel of REELS) {
      const strip = REEL_STRIPS[reel]
      for (const symbol of REEL_STRIP) {
        const p = snapPositionFor(reel, symbol, 5)
        const above = bandSymbolAt(reel, p, CENTER_SLOT - 1)
        const below = bandSymbolAt(reel, p, CENTER_SLOT + 1)
        const i = strip.indexOf(symbol)
        expect(above).toBe(strip[(i + 1) % n])
        expect(below).toBe(strip[(i + n - 1) % n])
      }
    }
  })
})
