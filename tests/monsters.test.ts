import { describe, expect, it } from 'vitest'
import {
  BASE_SPECIES,
  SKILLS,
  SPECIES,
  getSpecies,
  type Lineage,
} from '../src/data/monsters'

describe('モンスターデータの整合性', () => {
  it('15種定義され、idとラベルが重複しない', () => {
    expect(SPECIES.length).toBe(15)
    expect(new Set(SPECIES.map((s) => s.id)).size).toBe(15)
    expect(new Set(SPECIES.map((s) => s.label)).size).toBe(15)
  })

  it('ベース4種は各系統1種ずつ', () => {
    const bases = SPECIES.filter((s) => s.tier === 'base')
    expect(bases.length).toBe(4)
    const lineages = new Set<Lineage>(bases.map((s) => s.lineage))
    expect(lineages).toEqual(new Set(['beast', 'dragon', 'slime', 'undead']))
    expect(BASE_SPECIES.length).toBe(4)
  })

  it('配合10種+隠し1種', () => {
    expect(SPECIES.filter((s) => s.tier === 'fusion').length).toBe(10)
    expect(SPECIES.filter((s) => s.tier === 'hidden').length).toBe(1)
  })

  it('全種のステータスが正でスキル参照が有効', () => {
    for (const s of SPECIES) {
      expect(s.hp).toBeGreaterThan(0)
      expect(s.atk).toBeGreaterThan(0)
      expect(s.def).toBeGreaterThan(0)
      expect(s.spd).toBeGreaterThan(0)
      expect(SKILLS[s.skillId], `${s.id} のスキル ${s.skillId}`).toBeDefined()
    }
  })

  it('見た目記述子が (系統, シルエット) として全種で一意（画面上で見分けられる）', () => {
    const signatures = SPECIES.map(
      (s) =>
        `${s.lineage}:${s.tier === 'fusion' ? 'dark' : 'main'}:${s.look.body}:${s.look.horns}:${s.look.wings}:${s.look.spikes}:${s.look.ribs}:${s.look.eyes}`,
    )
    expect(new Set(signatures).size).toBe(SPECIES.length)
  })

  it('getSpecies は未知IDで例外を投げる', () => {
    expect(getSpecies('wolfy').label).toBe('ウルフィ')
    // @ts-expect-error 未知IDの実行時ガードを検証
    expect(() => getSpecies('unknown')).toThrow()
  })
})
