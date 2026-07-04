import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../src/core/rng'
import {
  DEFEAT_REFUND_RATIO,
  WIN_COINS_BASE,
  WIN_COINS_PER_FLOOR,
  applyRewards,
  computeRewards,
} from '../src/core/rewards'
import { createInitialState } from '../src/core/state'
import { MATERIALS } from '../src/data/materials'

const materialIds = MATERIALS.map((m) => m.id)

describe('computeRewards — 勝利', () => {
  it('大量コイン+タマゴ1+素材2を得る', () => {
    const r = computeRewards(true, 100, 1, mulberry32(1))
    expect(r.coins).toBe(WIN_COINS_BASE + WIN_COINS_PER_FLOOR)
    expect(r.eggs).toBe(1)
    expect(r.materials.length).toBe(2)
    for (const m of r.materials) expect(materialIds).toContain(m)
  })

  it('階層が高いほどコインが増える', () => {
    const low = computeRewards(true, 0, 1, mulberry32(1))
    const high = computeRewards(true, 0, 10, mulberry32(1))
    expect(high.coins).toBeGreaterThan(low.coins)
  })
})

describe('computeRewards — 敗北保険', () => {
  it('投入コインの一部+素材1を持ち帰る', () => {
    const r = computeRewards(false, 80, 1, mulberry32(2))
    expect(r.coins).toBe(Math.floor(80 * DEFEAT_REFUND_RATIO))
    expect(r.eggs).toBe(0)
    expect(r.materials.length).toBe(1)
  })

  it('投入0なら戻りも0', () => {
    expect(computeRewards(false, 0, 1, mulberry32(2)).coins).toBe(0)
  })
})

describe('applyRewards', () => {
  it('コイン・タマゴ・素材が状態に加算される', () => {
    const state = createInitialState()
    const before = state.coins
    applyRewards(state, { coins: 200, eggs: 1, materials: ['meat', 'meat', 'dew'] })
    expect(state.coins).toBe(before + 200)
    expect(state.eggs).toBe(1)
    expect(state.materials.meat).toBe(2)
    expect(state.materials.dew).toBe(1)
    expect(state.materials.shard).toBe(0)
  })
})
