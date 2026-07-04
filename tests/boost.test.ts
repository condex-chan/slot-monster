import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../src/core/rng'
import { BattleSim, HEART_HEAL_RATIO, makeCombatant } from '../src/core/battle'
import type { Combatant } from '../src/core/battle'

const party = (ids: readonly ['lindwurm' | 'pururu' | 'garm' | 'lich', ...('pururu' | 'garm')[]]) =>
  ids.map((id, i) => makeCombatant(id, 'party', i))
const enemies = (): Combatant[] =>
  (['pururu', 'pururu', 'pururu'] as const).map((id, i) => makeCombatant(id, 'enemy', i))

function enemyTotalHp(sim: BattleSim): number {
  return sim.combatants.filter((c) => c.side === 'enemy').reduce((sum, c) => sum + c.hp, 0)
}

describe('applyBoost sword — 全員追撃', () => {
  it('生存パーティ全員が攻撃し敵HP合計が減る', () => {
    const sim = new BattleSim(party(['lindwurm', 'garm', 'garm']), enemies(), mulberry32(11))
    const before = enemyTotalHp(sim)
    const events = sim.applyBoost('sword')
    expect(enemyTotalHp(sim)).toBeLessThan(before)
    expect(events.filter((e) => e.type === 'attack').length).toBeGreaterThanOrEqual(1)
  })

  it('追撃で全滅させれば end イベントが出る', () => {
    // 高火力で3回の追撃を繰り返せばいずれ全滅する
    const sim = new BattleSim(party(['lindwurm', 'garm', 'garm']), enemies(), mulberry32(3))
    let ended = false
    for (let i = 0; i < 50 && !ended; i++) {
      ended = sim.applyBoost('sword').some((e) => e.type === 'end')
    }
    expect(ended).toBe(true)
    expect(sim.winner).toBe('party')
    // 終了後のブーストは無効
    expect(sim.applyBoost('sword')).toEqual([])
  })
})

describe('applyBoost heart — 全員回復', () => {
  it('負傷者は最大HPの25%回復し、満タンは超えない', () => {
    const sim = new BattleSim(party(['lindwurm', 'garm', 'garm']), enemies(), mulberry32(5))
    const wounded = sim.combatants.find((c) => c.id === 'party-0')
    if (!wounded) throw new Error('party-0 not found')
    wounded.hp = 1
    const events = sim.applyBoost('heart')
    expect(wounded.hp).toBe(1 + Math.round(wounded.maxHp * HEART_HEAL_RATIO))
    // 無傷メンバーは maxHp のまま
    for (const c of sim.alive('party')) expect(c.hp).toBeLessThanOrEqual(c.maxHp)
    expect(events.every((e) => e.type === 'heal')).toBe(true)
  })
})

describe('applyBoost star — 先頭の継承スキル', () => {
  it('攻撃スキル持ちの先頭はスキル名イベント+強化攻撃を出す', () => {
    const sim = new BattleSim(party(['lindwurm', 'garm', 'garm']), enemies(), mulberry32(9))
    const before = enemyTotalHp(sim)
    const events = sim.applyBoost('star')
    expect(events[0]).toEqual({ type: 'skill', actorId: 'party-0', label: 'ごうかえん' })
    expect(events.some((e) => e.type === 'attack')).toBe(true)
    expect(enemyTotalHp(sim)).toBeLessThan(before)
  })

  it('回復スキル持ちの先頭は全員を回復する', () => {
    const sim = new BattleSim(party(['pururu', 'garm', 'garm']), enemies(), mulberry32(9))
    for (const c of sim.alive('party')) c.hp = 10
    const events = sim.applyBoost('star')
    expect(events[0]).toEqual({ type: 'skill', actorId: 'party-0', label: 'いやしのしずく' })
    for (const c of sim.alive('party')) expect(c.hp).toBeGreaterThan(10)
  })

  it('先頭が倒れていれば次の生存者のスキルが出る', () => {
    const sim = new BattleSim(party(['pururu', 'garm', 'garm']), enemies(), mulberry32(9))
    const lead = sim.combatants.find((c) => c.id === 'party-0')
    if (!lead) throw new Error('party-0 not found')
    lead.hp = 0
    const events = sim.applyBoost('star')
    expect(events[0]).toMatchObject({ type: 'skill', actorId: 'party-1' })
  })
})
