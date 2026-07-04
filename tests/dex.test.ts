import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../src/core/rng'
import { discover, hatchEgg, isDiscovered } from '../src/core/collection'
import { fuse } from '../src/core/fusion'
import { createInitialState } from '../src/core/state'
import { getSpecies } from '../src/data/monsters'

describe('図鑑の発見記録', () => {
  it('初期状態では初期パーティの3種のみ発見済み', () => {
    const state = createInitialState()
    expect(state.discovered.sort()).toEqual(['draco', 'pururu', 'wolfy'])
    expect(isDiscovered(state, 'wolfy')).toBe(true)
    expect(isDiscovered(state, 'prisma')).toBe(false)
  })

  it('孵化した種族が発見済みになる', () => {
    const state = createInitialState()
    state.eggs = 1
    const born = hatchEgg(state, mulberry32(1))
    if (!born) throw new Error('hatch failed')
    expect(isDiscovered(state, born.speciesId)).toBe(true)
  })

  it('配合で生まれた新種が発見済みになる', () => {
    const state = createInitialState()
    state.roster.push({
      uid: `m${state.nextUid++}`,
      speciesId: 'bones',
      bonus: { hp: 0, atk: 0, def: 0, spd: 0 },
      skillId: getSpecies('bones').skillId,
    })
    discover(state, 'bones')
    const child = fuse(state, 'm1', 'm2', 'fang') // beast×dragon → wyvern
    expect(child.speciesId).toBe('wyvern')
    expect(isDiscovered(state, 'wyvern')).toBe(true)
  })

  it('重複して発見しても図鑑には1つだけ', () => {
    const state = createInitialState()
    discover(state, 'wolfy')
    discover(state, 'wolfy')
    expect(state.discovered.filter((s) => s === 'wolfy').length).toBe(1)
  })
})
