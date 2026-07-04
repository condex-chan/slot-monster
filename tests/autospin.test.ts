import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../src/core/rng'
import { AUTO_UNLOCK_FLOOR, isAutoUnlocked, resolveFlashSuccess } from '../src/core/autospin'
import { FLASH_FULL_MULT, flashReward } from '../src/core/flash'

describe('オートスピンの解放条件', () => {
  it('階層5クリア（=6階到達）で解放、それ未満は未解放', () => {
    expect(isAutoUnlocked({ bestFloor: AUTO_UNLOCK_FLOOR - 1 })).toBe(false)
    expect(isAutoUnlocked({ bestFloor: AUTO_UNLOCK_FLOOR })).toBe(true)
    expect(isAutoUnlocked({ bestFloor: AUTO_UNLOCK_FLOOR + 10 })).toBe(true)
  })
})

describe('オート中のフラッシュ役', () => {
  it('タイミングが合っていても常に失敗扱い（満額不可）', () => {
    expect(resolveFlashSuccess(true, true)).toBe(false)
    expect(resolveFlashSuccess(true, false)).toBe(false)
  })

  it('手動なら成否はタイミングどおり', () => {
    expect(resolveFlashSuccess(false, true)).toBe(true)
    expect(resolveFlashSuccess(false, false)).toBe(false)
  })

  it('オート中の報酬は必ず半額で素材が取れない', () => {
    const reward = flashReward(resolveFlashSuccess(true, true), 10, mulberry32(1))
    expect(reward.coins).toBe(Math.floor((10 * FLASH_FULL_MULT) / 2))
    expect(reward.materials.length).toBe(0)
  })
})
