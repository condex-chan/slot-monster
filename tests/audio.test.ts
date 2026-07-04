import { describe, expect, it } from 'vitest'
import { bgmForScene, bgmTransition, normalizeMuted } from '../src/core/audio'
import { createInitialState } from '../src/core/state'
import { loadState, saveState, SAVE_KEY, type StorageLike } from '../src/core/save'

function fakeStorage(initial: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  }
}

describe('bgmForScene — シーンとBGMの対応', () => {
  it('バトルのみ専用曲、メイン系シーンは共通曲', () => {
    expect(bgmForScene('Battle')).toBe('bgm-battle')
    for (const scene of ['Title', 'Main', 'Roster', 'Dex', 'Odds']) {
      expect(bgmForScene(scene)).toBe('bgm-main')
    }
  })

  it('対応のないシーンは null（無音）', () => {
    expect(bgmForScene('Boot')).toBeNull()
    expect(bgmForScene('Unknown')).toBeNull()
  })
})

describe('bgmTransition — シーン遷移でBGMキーが切り替わる', () => {
  it('無音 → Main でメイン曲を再生', () => {
    expect(bgmTransition(null, 'Main')).toEqual({ stop: null, play: 'bgm-main' })
  })

  it('Main → Battle で曲が切り替わる（stop+play）', () => {
    expect(bgmTransition('bgm-main', 'Battle')).toEqual({
      stop: 'bgm-main',
      play: 'bgm-battle',
    })
  })

  it('Battle → Main で戻る', () => {
    expect(bgmTransition('bgm-battle', 'Main')).toEqual({
      stop: 'bgm-battle',
      play: 'bgm-main',
    })
  })

  it('同じ曲が続くシーン間の移動では何もしない（Main→育成で途切れない）', () => {
    expect(bgmTransition('bgm-main', 'Roster')).toEqual({ stop: null, play: null })
    expect(bgmTransition('bgm-main', 'Title')).toEqual({ stop: null, play: null })
  })

  it('BGM対応のないシーンへは停止のみ', () => {
    expect(bgmTransition('bgm-main', 'Boot')).toEqual({ stop: 'bgm-main', play: null })
  })
})

describe('ミュート設定の保存・復元', () => {
  it('muted が保存・復元される', () => {
    const storage = fakeStorage()
    const state = createInitialState()
    state.muted = true
    saveState(state, storage)
    expect(loadState(storage).muted).toBe(true)
  })

  it('muted=false も往復で保たれる', () => {
    const storage = fakeStorage()
    saveState(createInitialState(), storage)
    expect(loadState(storage).muted).toBe(false)
  })

  it('muted フィールドの無い旧セーブは false（音あり）', () => {
    const storage = fakeStorage()
    const legacy = { ...createInitialState() } as Record<string, unknown>
    delete legacy.muted
    storage.setItem(SAVE_KEY, JSON.stringify(legacy))
    expect(loadState(storage).muted).toBe(false)
  })

  it('normalizeMuted は真偽値以外を false に落とす', () => {
    expect(normalizeMuted(true)).toBe(true)
    expect(normalizeMuted(false)).toBe(false)
    expect(normalizeMuted('true')).toBe(false)
    expect(normalizeMuted(undefined)).toBe(false)
  })
})
