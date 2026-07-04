import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../src/core/rng'
import { REEL_STRIP } from '../src/core/reels'
import { CENTER_SLOT, bandSymbolAt, snapPositionFor } from '../src/core/reelband'
import {
  anyLineMatch,
  centerForRow,
  lineMatches,
  normalizeBetLines,
  resolveSpinLines,
  rowSymbolFor,
  type LineIndex,
} from '../src/core/lines'
import { PAYTABLE } from '../src/data/paytable'
import { createInitialState } from '../src/core/state'
import { loadState, saveState, SAVE_KEY, type StorageLike } from '../src/core/save'

const ROLES = PAYTABLE.map((r) => r.id)
const LINES: LineIndex[] = [0, 1, 2]

function fakeStorage(initial: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  }
}

describe('rowSymbolFor / centerForRow — 逆関数の関係', () => {
  it('centerForRow で求めた中央図柄は、その段に指定図柄を表示する', () => {
    for (const reel of [0, 1, 2]) {
      for (const s of REEL_STRIP) {
        for (const row of LINES) {
          expect(rowSymbolFor(reel, centerForRow(reel, s, row), row)).toBe(s)
        }
      }
    }
  })

  it('帯スクロールの停止窓と一致する（表示と判定の整合）', () => {
    for (const reel of [0, 1, 2]) {
      for (const s of REEL_STRIP) {
        const p = snapPositionFor(reel, s, 5)
        expect(bandSymbolAt(reel, p, CENTER_SLOT - 1)).toBe(rowSymbolFor(reel, s, 0))
        expect(bandSymbolAt(reel, p, CENTER_SLOT)).toBe(rowSymbolFor(reel, s, 1))
        expect(bandSymbolAt(reel, p, CENTER_SLOT + 1)).toBe(rowSymbolFor(reel, s, 2))
      }
    }
  })
})

describe('resolveSpinLines — 当選', () => {
  it('全役×全ラインで、当選ラインだけが3揃いし他のラインは揃わない', () => {
    // 帯の歩幅設計（stride 1,2,4）の核心保証: 二重払い・表示不能が起きない
    for (const role of ROLES) {
      for (let seed = 0; seed < 60; seed++) {
        const rng = mulberry32(seed)
        const result = resolveSpinLines(role, 3, rng)
        expect(lineMatches(result.centers, result.line)).toBe(true)
        expect(rowSymbolFor(0, result.centers[0], result.line)).toBe(role)
        for (const other of LINES.filter((l) => l !== result.line)) {
          expect(lineMatches(result.centers, other), `${role} line=${result.line}`).toBe(false)
        }
      }
    }
  })

  it('1ラインベットの当選は必ず中央ライン', () => {
    for (const role of ROLES) {
      const result = resolveSpinLines(role, 1, mulberry32(7))
      expect(result.line).toBe(1)
      expect(result.centers).toEqual([role, role, role])
    }
  })

  it('3ラインベットの当選ラインはほぼ等確率に散る', () => {
    const rng = mulberry32(42)
    const counts = [0, 0, 0]
    for (let i = 0; i < 9000; i++) counts[resolveSpinLines('copper', 3, rng).line]++
    for (const c of counts) expect(c).toBeGreaterThan(2600) // 期待値3000の±13%
  })
})

describe('resolveSpinLines — ハズレ', () => {
  it('1万試行でどのラインにも3揃いが出ない', () => {
    const rng = mulberry32(999)
    for (let i = 0; i < 10_000; i++) {
      const result = resolveSpinLines('none', 3, rng)
      expect(anyLineMatch(result.centers)).toBe(false)
    }
  })
})

describe('betLines のセーブ', () => {
  it('betLines が保存・復元される', () => {
    const storage = fakeStorage()
    const state = createInitialState()
    state.betLines = 3
    saveState(state, storage)
    expect(loadState(storage).betLines).toBe(3)
  })

  it('betLines の無い旧セーブは1ライン', () => {
    const storage = fakeStorage()
    const legacy = { ...createInitialState() } as Record<string, unknown>
    delete legacy.betLines
    storage.setItem(SAVE_KEY, JSON.stringify(legacy))
    expect(loadState(storage).betLines).toBe(1)
  })

  it('normalizeBetLines は 3 以外をすべて 1 に落とす', () => {
    expect(normalizeBetLines(3)).toBe(3)
    expect(normalizeBetLines(1)).toBe(1)
    expect(normalizeBetLines(2)).toBe(1)
    expect(normalizeBetLines('3')).toBe(1)
    expect(normalizeBetLines(undefined)).toBe(1)
  })
})
