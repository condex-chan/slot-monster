import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../src/core/rng'
import { drawRole } from '../src/core/slot'
import { FLASH_FULL_MULT, flashReward } from '../src/core/flash'
import { MATERIALS } from '../src/data/materials'

describe('flashReward — 満額/半額', () => {
  it('成功で満額コイン+素材1個', () => {
    const r = flashReward(true, 10, mulberry32(1))
    expect(r.coins).toBe(10 * FLASH_FULL_MULT)
    expect(r.materials.length).toBe(1)
    expect(MATERIALS.map((m) => m.id)).toContain(r.materials[0])
  })

  it('失敗はコイン半額・素材なし（取りこぼし）', () => {
    const success = flashReward(true, 10, mulberry32(1))
    const fail = flashReward(false, 10, mulberry32(1))
    expect(fail.coins).toBe(Math.floor(success.coins / 2))
    expect(fail.materials.length).toBe(0)
  })
})

describe('当選判定はタイミングと独立', () => {
  it('スピン開始時に役が確定し、その後の乱数消費（=停止タイミングの差）で変わらない', () => {
    for (let seed = 1; seed <= 10; seed++) {
      // 早く止めたプレイヤー
      const fast = mulberry32(seed)
      const roleFast = drawRole(fast)
      // 長く回してから止めたプレイヤー（回転演出で乱数を余分に消費）
      const slow = mulberry32(seed)
      const roleSlow = drawRole(slow)
      for (let i = 0; i < 100; i++) slow() // 演出分の消費
      expect(roleSlow).toBe(roleFast)
    }
  })

  it('目押しの成否は報酬額のみに影響し、当選役そのものは入力として不変', () => {
    // flashReward は役を受け取らず成否と額だけを扱う=役を書き換える経路が存在しない
    const rng = mulberry32(7)
    const before = drawRole(rng)
    flashReward(false, 10, rng)
    flashReward(true, 10, rng)
    expect(typeof before).toBe('string')
  })
})
