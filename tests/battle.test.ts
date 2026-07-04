import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../src/core/rng'
import { BattleSim, createEnemyGroup, damageOf, makeCombatant } from '../src/core/battle'
import type { Combatant, Side } from '../src/core/battle'

function runToEnd(sim: BattleSim, maxSteps = 1000): { winner: Side | null; steps: number } {
  let steps = 0
  while (!sim.over && steps < maxSteps) {
    sim.step()
    steps++
  }
  return { winner: sim.winner, steps }
}

const strongParty = (): Combatant[] =>
  (['lindwurm', 'garm', 'lich'] as const).map((id, i) => makeCombatant(id, 'party', i))
const weakParty = (): Combatant[] =>
  (['pururu', 'pururu', 'pururu'] as const).map((id, i) => makeCombatant(id, 'party', i))
const weakEnemies = (): Combatant[] =>
  (['pururu', 'pururu', 'pururu'] as const).map((id, i) => makeCombatant(id, 'enemy', i))
const strongEnemies = (): Combatant[] =>
  (['lindwurm', 'garm', 'lich'] as const).map((id, i) => makeCombatant(id, 'enemy', i))

describe('damageOf', () => {
  it('基礎値 ATK-DEF/2 を中心に±15%で振れる', () => {
    expect(damageOf(20, 10, 0.5)).toBe(15) // 基礎15×1.0
    expect(damageOf(20, 10, 0)).toBe(Math.round(15 * 0.85))
  })

  it('防御が高くても最低1ダメージ', () => {
    expect(damageOf(1, 100, 0)).toBe(1)
  })
})

describe('BattleSim', () => {
  it('強いパーティは弱い敵に勝つ（20シード）', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const sim = new BattleSim(strongParty(), weakEnemies(), mulberry32(seed))
      expect(runToEnd(sim).winner).toBe('party')
    }
  })

  it('弱いパーティは強い敵に負ける（20シード）', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const sim = new BattleSim(weakParty(), strongEnemies(), mulberry32(seed))
      expect(runToEnd(sim).winner).toBe('enemy')
    }
  })

  it('戦闘は必ず有限ステップで終わる', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const sim = new BattleSim(strongParty(), strongEnemies(), mulberry32(seed))
      const { winner, steps } = runToEnd(sim)
      expect(winner).not.toBeNull()
      expect(steps).toBeLessThan(1000)
    }
  })

  it('HPは0未満にならず、全滅時のみendイベントが出る', () => {
    const sim = new BattleSim(strongParty(), weakEnemies(), mulberry32(7))
    let endSeen = 0
    while (!sim.over) {
      for (const ev of sim.step()) {
        if (ev.type === 'attack') expect(ev.targetHp).toBeGreaterThanOrEqual(0)
        if (ev.type === 'end') endSeen++
      }
    }
    expect(endSeen).toBe(1)
    expect(sim.alive('enemy').length).toBe(0)
  })

  it('SPD最速のコンバタントが最初に行動する', () => {
    const sim = new BattleSim(strongParty(), weakEnemies(), mulberry32(3))
    const all = [...strongParty(), ...weakEnemies()]
    const fastest = [...all].sort((a, b) => b.spd - a.spd)[0]
    const events = sim.step()
    expect(events[0].type).toBe('attack')
    if (events[0].type === 'attack') expect(events[0].actorId).toBe(fastest.id)
  })
})

describe('createEnemyGroup', () => {
  it('指定数のベース種の敵を生成する', () => {
    const enemies = createEnemyGroup(mulberry32(5))
    expect(enemies.length).toBe(3)
    for (const e of enemies) {
      expect(e.side).toBe('enemy')
      expect(e.hp).toBe(e.maxHp)
    }
  })
})
