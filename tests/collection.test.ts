import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../src/core/rng'
import { assignToParty, getInstance, hatchEgg, totalStats } from '../src/core/collection'
import { makeCombatantFromInstance } from '../src/core/battle'
import { createInitialState } from '../src/core/state'
import { BASE_SPECIES, getSpecies } from '../src/data/monsters'

describe('初期状態', () => {
  it('手持ち3体、パーティは3体のuid', () => {
    const state = createInitialState()
    expect(state.roster.length).toBe(3)
    expect(state.party.length).toBe(3)
    for (const uid of state.party) expect(() => getInstance(state, uid)).not.toThrow()
  })
})

describe('hatchEgg — 孵化', () => {
  it('タマゴを消費してベース4種のいずれかが手持ちに追加される', () => {
    const state = createInitialState()
    state.eggs = 2
    const born = hatchEgg(state, mulberry32(1))
    expect(born).not.toBeNull()
    expect(state.eggs).toBe(1)
    expect(state.roster.length).toBe(4)
    if (born) {
      expect(BASE_SPECIES).toContain(born.speciesId)
      expect(state.roster.some((m) => m.uid === born.uid)).toBe(true)
    }
  })

  it('uidは重複しない', () => {
    const state = createInitialState()
    state.eggs = 5
    const rng = mulberry32(2)
    for (let i = 0; i < 5; i++) hatchEgg(state, rng)
    expect(new Set(state.roster.map((m) => m.uid)).size).toBe(state.roster.length)
  })

  it('タマゴがなければ孵化できない', () => {
    const state = createInitialState()
    expect(hatchEgg(state, mulberry32(1))).toBeNull()
    expect(state.roster.length).toBe(3)
  })
})

describe('assignToParty — 編成変更', () => {
  it('選んだ個体がスロットにセットされる', () => {
    const state = createInitialState()
    state.eggs = 1
    const born = hatchEgg(state, mulberry32(3))
    if (!born) throw new Error('hatch failed')
    assignToParty(state, 0, born.uid)
    expect(state.party[0]).toBe(born.uid)
    expect(new Set(state.party).size).toBe(3) // 重複なし
  })

  it('パーティ内の個体を別スロットへ→入れ替えになる', () => {
    const state = createInitialState()
    const [a, b] = [state.party[0], state.party[1]]
    assignToParty(state, 1, a)
    expect(state.party[1]).toBe(a)
    expect(state.party[0]).toBe(b)
  })

  it('不正なスロットや未知のuidは例外', () => {
    const state = createInitialState()
    expect(() => assignToParty(state, 3, state.party[0])).toThrow()
    expect(() => assignToParty(state, 0, 'nope')).toThrow()
  })
})

describe('totalStats とバトル反映', () => {
  it('実効ステ = 種族基礎値 + ボーナス', () => {
    const state = createInitialState()
    const m = state.roster[0]
    m.bonus.atk = 7
    const base = getSpecies(m.speciesId)
    const stats = totalStats(m)
    expect(stats.atk).toBe(base.atk + 7)
    expect(stats.hp).toBe(base.hp)
  })

  it('編成変更が出撃コンバタントに反映される（次バトルに反映）', () => {
    const state = createInitialState()
    state.eggs = 1
    const born = hatchEgg(state, mulberry32(4))
    if (!born) throw new Error('hatch failed')
    born.bonus.hp = 10
    assignToParty(state, 0, born.uid)
    const combatant = makeCombatantFromInstance(getInstance(state, state.party[0]), 'party', 0)
    expect(combatant.speciesId).toBe(born.speciesId)
    expect(combatant.maxHp).toBe(getSpecies(born.speciesId).hp + 10)
  })
})
