import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../src/core/rng'
import { hatchEgg } from '../src/core/collection'
import { SAVE_KEY, loadState, saveState, type StorageLike } from '../src/core/save'
import { createInitialState } from '../src/core/state'

function fakeStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Map<string, string>
} {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  }
}

describe('セーブ/ロード', () => {
  it('状態変化後に保存すると最新値がストレージに載る', () => {
    const storage = fakeStorage()
    const state = createInitialState()
    state.coins = 1234
    saveState(state, storage)
    expect(storage.data.get(SAVE_KEY)).toContain('1234')
  })

  it('リロード相当: 保存→ロードで全フィールドが復元される', () => {
    const storage = fakeStorage()
    const state = createInitialState()
    state.coins = 777
    state.floor = 8
    state.bestFloor = 12
    state.eggs = 2
    state.materials.meat = 5
    state.autoSpin = true
    state.eggs += 1
    const born = hatchEgg(state, mulberry32(3))
    if (!born) throw new Error('hatch failed')
    born.bonus.atk = 4
    saveState(state, storage)

    const restored = loadState(storage)
    expect(restored).toEqual(state)
  })

  it('保存がなければ初期状態', () => {
    expect(loadState(fakeStorage())).toEqual(createInitialState())
  })

  it('不正JSONは初期状態にフォールバック', () => {
    const storage = fakeStorage({ [SAVE_KEY]: '{broken json!!' })
    expect(loadState(storage)).toEqual(createInitialState())
  })

  it('型が壊れたデータ（コインが文字列）は初期化', () => {
    const bad = { ...createInitialState(), coins: 'a lot' }
    const storage = fakeStorage({ [SAVE_KEY]: JSON.stringify(bad) })
    expect(loadState(storage)).toEqual(createInitialState())
  })

  it('パーティが手持ちにいない個体を指すデータは初期化', () => {
    const bad = createInitialState()
    bad.party[0] = 'ghost-uid'
    const storage = fakeStorage({ [SAVE_KEY]: JSON.stringify(bad) })
    expect(loadState(storage)).toEqual(createInitialState())
  })

  it('未知の種族IDを含む手持ちは初期化', () => {
    const bad = createInitialState()
    ;(bad.roster[0] as { speciesId: string }).speciesId = 'missingno'
    const storage = fakeStorage({ [SAVE_KEY]: JSON.stringify(bad) })
    expect(loadState(storage)).toEqual(createInitialState())
  })

  it('古い保存に混ざった余計なキーは復元後に持ち込まれない', () => {
    const withJunk = { ...createInitialState(), legacyField: 'junk' }
    const storage = fakeStorage({ [SAVE_KEY]: JSON.stringify(withJunk) })
    const restored = loadState(storage)
    expect('legacyField' in restored).toBe(false)
  })
})
