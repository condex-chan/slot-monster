import { describe, expect, it } from 'vitest'
import { SAVE_KEY, hasSave, saveState, type StorageLike } from '../src/core/save'
import { createInitialState } from '../src/core/state'

function fakeStorage(initial: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  }
}

// タイトル画面の「スタート/つづきから」文言はこの判定で切り替わる
describe('hasSave — セーブ有無の判定', () => {
  it('セーブがなければ false（新規=スタート表示）', () => {
    expect(hasSave(fakeStorage())).toBe(false)
  })

  it('有効なセーブがあれば true（つづきから表示）', () => {
    const storage = fakeStorage()
    saveState(createInitialState(), storage)
    expect(hasSave(storage)).toBe(true)
  })

  it('壊れたJSONは false（ロード時の初期化フォールバックと整合）', () => {
    expect(hasSave(fakeStorage({ [SAVE_KEY]: '{broken' }))).toBe(false)
  })

  it('構造が不正なセーブは false', () => {
    expect(hasSave(fakeStorage({ [SAVE_KEY]: JSON.stringify({ coins: 'lots' }) }))).toBe(false)
  })

  it('storage が例外を投げる環境でも false（プライベートモード等）', () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    }
    expect(hasSave(throwing)).toBe(false)
  })
})
