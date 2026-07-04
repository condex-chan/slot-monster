// 自動戦闘エンジン（pure TS・Phaser非依存）。
// 1ステップ=1行動で進め、演出用イベント列を返す。シーンはイベントを再生するだけ
import type { Rng } from './rng'
import { BASE_SPECIES, getSpecies, type SpeciesId } from '../data/monsters'

export type Side = 'party' | 'enemy'

export interface Combatant {
  id: string
  speciesId: SpeciesId
  name: string
  side: Side
  maxHp: number
  hp: number
  atk: number
  def: number
  spd: number
  skillId: string
}

export type BattleEvent =
  | { type: 'attack'; actorId: string; targetId: string; damage: number; targetHp: number }
  | { type: 'defeat'; targetId: string }
  | { type: 'end'; winner: Side }

export function makeCombatant(speciesId: SpeciesId, side: Side, slot: number): Combatant {
  const s = getSpecies(speciesId)
  return {
    id: `${side}-${slot}`,
    speciesId,
    name: s.label,
    side,
    maxHp: s.hp,
    hp: s.hp,
    atk: s.atk,
    def: s.def,
    spd: s.spd,
    skillId: s.skillId,
  }
}

/** ダメージ計算: 基礎値 max(1, ATK - DEF/2) に ±15% の振れ幅。最低1保証 */
export function damageOf(atk: number, def: number, roll: number): number {
  const base = Math.max(1, atk - def / 2)
  return Math.max(1, Math.round(base * (0.85 + roll * 0.3)))
}

/** 敵グループ生成。階層スケーリングは F11 で拡張する */
export function createEnemyGroup(rng: Rng, count = 3): Combatant[] {
  return Array.from({ length: count }, (_, i) => {
    const speciesId = BASE_SPECIES[Math.floor(rng() * BASE_SPECIES.length)]
    return makeCombatant(speciesId, 'enemy', i)
  })
}

export class BattleSim {
  readonly combatants: Combatant[]
  winner: Side | null = null
  private queue: string[] = []
  private rng: Rng

  constructor(party: Combatant[], enemies: Combatant[], rng: Rng) {
    this.combatants = [...party, ...enemies]
    this.rng = rng
  }

  get over(): boolean {
    return this.winner !== null
  }

  alive(side: Side): Combatant[] {
    return this.combatants.filter((c) => c.side === side && c.hp > 0)
  }

  /** 次の1行動を進める。SPD降順のラウンド制、対象はランダムな生存敵 */
  step(): BattleEvent[] {
    if (this.over) return []
    const actor = this.nextActor()
    if (!actor) return []
    const foes = this.alive(actor.side === 'party' ? 'enemy' : 'party')
    const target = foes[Math.floor(this.rng() * foes.length)]
    const damage = damageOf(actor.atk, target.def, this.rng())
    target.hp = Math.max(0, target.hp - damage)
    const events: BattleEvent[] = [
      { type: 'attack', actorId: actor.id, targetId: target.id, damage, targetHp: target.hp },
    ]
    if (target.hp === 0) {
      events.push({ type: 'defeat', targetId: target.id })
      if (this.alive(target.side).length === 0) {
        this.winner = actor.side
        events.push({ type: 'end', winner: actor.side })
      }
    }
    return events
  }

  private nextActor(): Combatant | null {
    for (;;) {
      if (this.queue.length === 0) {
        const alive = this.combatants.filter((c) => c.hp > 0)
        if (alive.length === 0) return null
        this.queue = [...alive].sort((a, b) => b.spd - a.spd).map((c) => c.id)
      }
      const id = this.queue.shift()
      if (id === undefined) return null
      const c = this.combatants.find((x) => x.id === id)
      if (c && c.hp > 0) return c
    }
  }
}
