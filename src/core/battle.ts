// 自動戦闘エンジン（pure TS・Phaser非依存）。
// 1ステップ=1行動で進め、演出用イベント列を返す。シーンはイベントを再生するだけ
import type { Rng } from './rng'
import { enemyScale, isBossFloor } from './floors'
import { totalStats } from './collection'
import type { MonsterInstance } from './state'
import { BASE_SPECIES, SKILLS, SPECIES, getSpecies, type SpeciesId } from '../data/monsters'

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
  | { type: 'heal'; targetId: string; amount: number; targetHp: number }
  | { type: 'skill'; actorId: string; label: string }
  | { type: 'defeat'; targetId: string }
  | { type: 'end'; winner: Side }

/** ラッシュ中のスピンブースト（剣=全員追撃 / ハート=全員回復 / 星=先頭スキル） */
export type BoostKind = 'sword' | 'heart' | 'star'

export const HEART_HEAL_RATIO = 0.25

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

/** 手持ち個体から出撃コンバタントを作る（餌やり・配合ボーナス込み） */
export function makeCombatantFromInstance(
  m: MonsterInstance,
  side: Side,
  slot: number,
): Combatant {
  const s = getSpecies(m.speciesId)
  const stats = totalStats(m)
  return {
    id: `${side}-${slot}`,
    speciesId: m.speciesId,
    name: s.label,
    side,
    maxHp: stats.hp,
    hp: stats.hp,
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    skillId: m.skillId,
  }
}

/** ダメージ計算: 基礎値 max(1, ATK - DEF/2) に ±15% の振れ幅。最低1保証 */
export function damageOf(atk: number, def: number, roll: number): number {
  const base = Math.max(1, atk - def / 2)
  return Math.max(1, Math.round(base * (0.85 + roll * 0.3)))
}

const FUSION_SPECIES: readonly SpeciesId[] = SPECIES.filter((s) => s.tier === 'fusion').map(
  (s) => s.id,
)

/** ボスの追加強化倍率（通常スケールに乗算） */
export const BOSS_SCALE = 1.8

function scaleCombatant(c: Combatant, scale: number): void {
  c.maxHp = Math.round(c.maxHp * scale)
  c.hp = c.maxHp
  c.atk = Math.round(c.atk * scale)
  c.def = Math.round(c.def * scale)
  // SPDだけ伸びを緩くする（先手を取られ続ける理不尽を避ける）
  c.spd = Math.round(c.spd * (1 + (scale - 1) * 0.3))
}

/** 階層に応じた敵グループ。通常=ベース種3体、ボス階=強化された配合種1体 */
export function createEnemyGroupForFloor(floor: number, rng: Rng): Combatant[] {
  if (isBossFloor(floor)) {
    const speciesId = FUSION_SPECIES[Math.floor(rng() * FUSION_SPECIES.length)]
    const boss = makeCombatant(speciesId, 'enemy', 1) // 中央スロットに配置
    scaleCombatant(boss, enemyScale(floor) * BOSS_SCALE)
    boss.name = `ボス・${boss.name}`
    return [boss]
  }
  return Array.from({ length: 3 }, (_, i) => {
    const speciesId = BASE_SPECIES[Math.floor(rng() * BASE_SPECIES.length)]
    const c = makeCombatant(speciesId, 'enemy', i)
    scaleCombatant(c, enemyScale(floor))
    return c
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
    return this.performAttack(actor)
  }

  /** スピンブーストを戦闘に反映する（F9）。戦闘終了後は無効 */
  applyBoost(kind: BoostKind): BattleEvent[] {
    if (this.over) return []
    const events: BattleEvent[] = []
    switch (kind) {
      case 'sword':
        for (const member of this.alive('party')) {
          if (this.over) break
          events.push(...this.performAttack(member))
        }
        break
      case 'heart':
        for (const member of this.alive('party')) {
          events.push(this.healOne(member, Math.round(member.maxHp * HEART_HEAL_RATIO)))
        }
        break
      case 'star': {
        const lead = this.alive('party')[0]
        if (!lead) break
        const skill = SKILLS[lead.skillId]
        events.push({ type: 'skill', actorId: lead.id, label: skill.label })
        if (skill.kind === 'attack') {
          events.push(...this.performAttack(lead, skill.power))
        } else {
          for (const member of this.alive('party')) {
            events.push(this.healOne(member, Math.round(member.maxHp * skill.power)))
          }
        }
        break
      }
    }
    return events
  }

  private performAttack(actor: Combatant, multiplier = 1): BattleEvent[] {
    const foes = this.alive(actor.side === 'party' ? 'enemy' : 'party')
    if (foes.length === 0) return []
    const target = foes[Math.floor(this.rng() * foes.length)]
    const damage = damageOf(actor.atk * multiplier, target.def, this.rng())
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

  private healOne(c: Combatant, amount: number): BattleEvent {
    const healed = Math.min(c.maxHp, c.hp + amount)
    const delta = healed - c.hp
    c.hp = healed
    return { type: 'heal', targetId: c.id, amount: delta, targetHp: c.hp }
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
