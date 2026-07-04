import { describe, expect, it } from 'vitest'
import {
  SAVE_KEY,
  clearSave,
  hasSave,
  loadState,
  saveState,
  type StorageLike,
} from '../src/core/save'
import { createInitialState } from '../src/core/state'

function fakeStorage(withRemove: boolean): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    ...(withRemove ? { removeItem: (k: string) => void map.delete(k) } : {}),
  }
}

// タイトルの「はじめから」= セーブ消去 + 初期状態で開始
describe('clearSave — はじめから', () => {
  it('removeItem がある環境ではキーごと消える', () => {
    const storage = fakeStorage(true)
    const state = createInitialState()
    state.coins = 9999
    saveState(state, storage)
    expect(hasSave(storage)).toBe(true)

    clearSave(storage)
    expect(storage.map.has(SAVE_KEY)).toBe(false)
    expect(hasSave(storage)).toBe(false)
    expect(loadState(storage).coins).toBe(createInitialState().coins)
  })

  it('removeItem が無い環境でも空文字で潰して初期状態に戻る', () => {
    const storage = fakeStorage(false)
    saveState(createInitialState(), storage)
    clearSave(storage)
    expect(hasSave(storage)).toBe(false)
    expect(loadState(storage)).toEqual(createInitialState())
  })
})
