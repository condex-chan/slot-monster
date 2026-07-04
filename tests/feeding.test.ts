import { describe, expect, it } from 'vitest'
import { feed } from '../src/core/feeding'
import { totalStats } from '../src/core/collection'
import { createInitialState } from '../src/core/state'
import { MATERIALS, getMaterial } from '../src/data/materials'

describe('feed — 餌やり強化', () => {
  it.each(MATERIALS.map((m) => [m.id] as const))(
    '%s を与えると対応ステータスが定義どおり上がり、素材が1減る',
    (materialId) => {
      const state = createInitialState()
      state.materials[materialId] = 2
      const target = state.roster[0]
      const def = getMaterial(materialId)
      const before = totalStats(target)[def.stat]
      feed(state, target.uid, materialId)
      expect(totalStats(target)[def.stat]).toBe(before + def.gain)
      expect(state.materials[materialId]).toBe(1)
    },
  )

  it('素材不足では強化できず、状態も変わらない', () => {
    const state = createInitialState()
    const target = state.roster[0]
    expect(state.materials.meat).toBe(0)
    expect(() => feed(state, target.uid, 'meat')).toThrow()
    expect(target.bonus.atk).toBe(0)
  })

  it('未知の個体には与えられない', () => {
    const state = createInitialState()
    state.materials.meat = 1
    expect(() => feed(state, 'nope', 'meat')).toThrow()
    expect(state.materials.meat).toBe(1)
  })

  it('繰り返し与えると累積する（バトル実効ステに反映される値）', () => {
    const state = createInitialState()
    state.materials.feather = 3
    const target = state.roster[0]
    const before = totalStats(target).spd
    const gain = getMaterial('feather').gain
    feed(state, target.uid, 'feather')
    feed(state, target.uid, 'feather')
    feed(state, target.uid, 'feather')
    expect(totalStats(target).spd).toBe(before + gain * 3)
  })
})
