import { describe, expect, it } from 'vitest'
import { eggsFor } from '../src/core/economy'
import { PAYTABLE } from '../src/data/paytable'

// itch.io フィードバック: タマゴ役が揃っても獲得できていなかったバグの回帰テスト。
// 確率表は「タマゴ獲得」と表示しているため、効果と表記を一致させる
describe('eggsFor — タマゴ役の効果', () => {
  it('egg 役はタマゴ1個', () => {
    expect(eggsFor('egg')).toBe(1)
  })

  it('egg 以外の全役とハズレは0個', () => {
    for (const role of PAYTABLE.map((r) => r.id).filter((id) => id !== 'egg')) {
      expect(eggsFor(role), role).toBe(0)
    }
    expect(eggsFor('none')).toBe(0)
  })
})
