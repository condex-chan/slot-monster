import { describe, expect, it } from 'vitest'
import {
  guideMessage,
  nextGuideStep,
  normalizeGuide,
  shouldShowBoostGuide,
  type GuideStep,
} from '../src/core/onboarding'
import { createInitialState } from '../src/core/state'
import { loadState, saveState, SAVE_KEY, type StorageLike } from '../src/core/save'

function fakeStorage(initial: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  }
}

describe('nextGuideStep — ガイドの状態機械', () => {
  it('新規データはspin段階から始まる', () => {
    expect(createInitialState().guide).toBe('spin')
  })

  it('spin → (スピン完了) → rush → (ラッシュ突入) → boost → (説明終了) → done', () => {
    let step: GuideStep = 'spin'
    step = nextGuideStep(step, 'spinDone')
    expect(step).toBe('rush')
    step = nextGuideStep(step, 'rushEntered')
    expect(step).toBe('boost')
    step = nextGuideStep(step, 'boostExplained')
    expect(step).toBe('done')
  })

  it('初スピンでラッシュ突入したら rush を飛ばして boost へ直行', () => {
    expect(nextGuideStep('spin', 'rushEntered')).toBe('boost')
  })

  it('段階に合わないイベントでは進まない', () => {
    expect(nextGuideStep('spin', 'boostExplained')).toBe('spin')
    expect(nextGuideStep('rush', 'spinDone')).toBe('rush')
    expect(nextGuideStep('boost', 'spinDone')).toBe('boost')
    expect(nextGuideStep('boost', 'rushEntered')).toBe('boost')
  })

  it('done は吸収状態（どのイベントでも再開しない）', () => {
    for (const event of ['spinDone', 'rushEntered', 'boostExplained'] as const) {
      expect(nextGuideStep('done', event)).toBe('done')
    }
  })
})

describe('ガイド表示の判定', () => {
  it('spin/rush 段階はメイン画面文言あり、boost/done はなし', () => {
    expect(guideMessage('spin')).toBeTruthy()
    expect(guideMessage('rush')).toBeTruthy()
    expect(guideMessage('boost')).toBeNull()
    expect(guideMessage('done')).toBeNull()
  })

  it('ブースト説明は boost 段階のみ', () => {
    expect(shouldShowBoostGuide('boost')).toBe(true)
    expect(shouldShowBoostGuide('spin')).toBe(false)
    expect(shouldShowBoostGuide('done')).toBe(false)
  })
})

describe('セーブとの往復 — フラグ保存後は再表示されない', () => {
  it('guide 段階が保存・復元される', () => {
    const storage = fakeStorage()
    const state = createInitialState()
    state.guide = 'done'
    saveState(state, storage)
    expect(loadState(storage).guide).toBe('done')
  })

  it('途中段階も保持される', () => {
    const storage = fakeStorage()
    const state = createInitialState()
    state.guide = 'rush'
    saveState(state, storage)
    expect(loadState(storage).guide).toBe('rush')
  })

  it('guide フィールドの無い旧セーブは done 扱い（既存プレイヤーに再表示しない）', () => {
    const storage = fakeStorage()
    const legacy = { ...createInitialState() } as Record<string, unknown>
    delete legacy.guide
    storage.setItem(SAVE_KEY, JSON.stringify(legacy))
    expect(loadState(storage).guide).toBe('done')
  })

  it('normalizeGuide は不正値を done に落とす', () => {
    expect(normalizeGuide('spin')).toBe('spin')
    expect(normalizeGuide('nonsense')).toBe('done')
    expect(normalizeGuide(undefined)).toBe('done')
    expect(normalizeGuide(42)).toBe('done')
  })
})
