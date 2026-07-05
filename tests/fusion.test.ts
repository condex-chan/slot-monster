import { describe, expect, it } from 'vitest'
import {
  FUSION_BONUS_RATIO,
  FUSION_TABLE,
  fuse,
  fusionResult,
} from '../src/core/fusion'
import { totalStats } from '../src/core/collection'
import { createInitialState, type GameState, type MonsterInstance } from '../src/core/state'
import { SPECIES, getSpecies, type Lineage } from '../src/data/monsters'

const LINEAGES: Lineage[] = ['beast', 'dragon', 'slime', 'undead']
const baseOf = (lineage: Lineage) => {
  const s = SPECIES.find((x) => x.tier === 'base' && x.lineage === lineage)
  if (!s) throw new Error(`no base species for ${lineage}`)
  return s
}

function addMonster(state: GameState, speciesId: MonsterInstance['speciesId']): MonsterInstance {
  const m: MonsterInstance = {
    uid: `m${state.nextUid++}`,
    speciesId,
    bonus: { hp: 0, atk: 0, def: 0, spd: 0 },
    skillId: getSpecies(speciesId).skillId,
  }
  state.roster.push(m)
  return m
}

describe('fusionResult — 組み合わせ表', () => {
  it('全10通り（同系統4+異系統6）が定義どおりの新種になる', () => {
    for (let i = 0; i < LINEAGES.length; i++) {
      for (let j = i; j < LINEAGES.length; j++) {
        const a = baseOf(LINEAGES[i])
        const b = baseOf(LINEAGES[j])
        const child = fusionResult(a.id, b.id)
        expect(child).toBe(FUSION_TABLE[LINEAGES[i]][LINEAGES[j]])
        expect(getSpecies(child).tier).toBe('fusion')
      }
    }
  })

  it('組み合わせは順不同（対称）', () => {
    for (const x of LINEAGES) {
      for (const y of LINEAGES) {
        expect(FUSION_TABLE[x][y]).toBe(FUSION_TABLE[y][x])
        expect(fusionResult(baseOf(x).id, baseOf(y).id)).toBe(
          fusionResult(baseOf(y).id, baseOf(x).id),
        )
      }
    }
  })

  it('隠し種: キングプルル×ゴスプルのみ にじプル（順不同）', () => {
    expect(fusionResult('kingpururu', 'ghostpull')).toBe('prisma')
    expect(fusionResult('ghostpull', 'kingpururu')).toBe('prisma')
    // 系統は同じ slime×undead でもベース種なら通常結果
    expect(fusionResult('pururu', 'bones')).toBe('ghostpull')
  })
})

describe('fuse — 親消滅とステ上乗せ', () => {
  it('親2体が消え、子が親ステ合計×比率のボーナス付きで生まれる', () => {
    const state = createInitialState()
    const a = addMonster(state, 'wolfy')
    const b = addMonster(state, 'draco')
    const sa = totalStats(a)
    const sb = totalStats(b)
    const rosterBefore = state.roster.length
    const child = fuse(state, a.uid, b.uid, a.skillId)
    expect(state.roster.length).toBe(rosterBefore - 1)
    expect(state.roster.some((m) => m.uid === a.uid)).toBe(false)
    expect(state.roster.some((m) => m.uid === b.uid)).toBe(false)
    expect(child.speciesId).toBe('wyvern')
    expect(child.bonus.atk).toBe(Math.round((sa.atk + sb.atk) * FUSION_BONUS_RATIO))
    expect(child.bonus.hp).toBe(Math.round((sa.hp + sb.hp) * FUSION_BONUS_RATIO))
  })

  it('継承スキルは親のどちらかから選び、子が所持する', () => {
    const state = createInitialState()
    const a = addMonster(state, 'wolfy')
    const b = addMonster(state, 'draco')
    const child = fuse(state, a.uid, b.uid, 'fireBreath')
    expect(child.skillId).toBe('fireBreath')
  })

  it('親が持たないスキルの継承は例外', () => {
    const state = createInitialState()
    const a = addMonster(state, 'wolfy')
    const b = addMonster(state, 'draco')
    expect(() => fuse(state, a.uid, b.uid, 'prismRay')).toThrow()
  })

  it('手持ち4体未満では配合できない', () => {
    const state = createInitialState() // 3体
    expect(() => fuse(state, state.party[0], state.party[1], 'fang')).toThrow()
  })

  it('パーティの親は子と控えで埋め直され、重複しない', () => {
    const state = createInitialState() // party: m1,m2,m3
    addMonster(state, 'bones') // 控え
    const child = fuse(state, 'm1', 'm2', 'fang') // パーティ2体を配合
    expect(state.party).toContain(child.uid)
    expect(new Set(state.party).size).toBe(3)
    for (const uid of state.party) {
      expect(state.roster.some((m) => m.uid === uid)).toBe(true)
    }
  })
})
