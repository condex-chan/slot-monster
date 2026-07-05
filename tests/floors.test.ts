import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../src/core/rng'
import { advanceFloor, enemyScale, isBossFloor } from '../src/core/floors'
import { createEnemyGroupForFloor } from '../src/core/battle'
import { createInitialState } from '../src/core/state'

describe('isBossFloor', () => {
  it('10階層ごとにボス', () => {
    expect(isBossFloor(10)).toBe(true)
    expect(isBossFloor(20)).toBe(true)
    expect(isBossFloor(1)).toBe(false)
    expect(isBossFloor(9)).toBe(false)
    expect(isBossFloor(11)).toBe(false)
  })
})

describe('敵スケーリング', () => {
  it('階層が上がるほど敵が強くなる', () => {
    expect(enemyScale(10)).toBeGreaterThan(enemyScale(1))
    const low = createEnemyGroupForFloor(1, mulberry32(1))
    const high = createEnemyGroupForFloor(9, mulberry32(1)) // 同シード=同種族
    const sum = (cs: typeof low, f: (c: (typeof low)[0]) => number) =>
      cs.reduce((s, c) => s + f(c), 0)
    expect(sum(high, (c) => c.maxHp)).toBeGreaterThan(sum(low, (c) => c.maxHp))
    expect(sum(high, (c) => c.atk)).toBeGreaterThan(sum(low, (c) => c.atk))
  })

  it('通常階は3体、全員HP満タンで生成される', () => {
    const group = createEnemyGroupForFloor(3, mulberry32(2))
    expect(group.length).toBe(3)
    for (const c of group) {
      expect(c.hp).toBe(c.maxHp)
      expect(c.side).toBe('enemy')
    }
  })

  it('10階層目はボス1体で、通常個体より強い', () => {
    const boss = createEnemyGroupForFloor(10, mulberry32(3))
    expect(boss.length).toBe(1)
    expect(boss[0].name.startsWith('ボス・')).toBe(true)
    const normals = createEnemyGroupForFloor(9, mulberry32(3))
    const maxNormalHp = Math.max(...normals.map((c) => c.maxHp))
    expect(boss[0].maxHp).toBeGreaterThan(maxNormalHp)
  })
})

describe('advanceFloor', () => {
  it('勝利で階層+1、最高階層が更新される', () => {
    const state = createInitialState()
    advanceFloor(state, true)
    expect(state.floor).toBe(2)
    expect(state.bestFloor).toBe(2)
  })

  it('敗北では階層も最高階層も変わらない', () => {
    const state = createInitialState()
    advanceFloor(state, false)
    expect(state.floor).toBe(1)
    expect(state.bestFloor).toBe(1)
  })

  it('最高階層は過去の記録を下回らない', () => {
    const state = createInitialState()
    state.floor = 5
    state.bestFloor = 12
    advanceFloor(state, true)
    expect(state.floor).toBe(6)
    expect(state.bestFloor).toBe(12)
  })
})
