// 手持ちモンスターの管理（孵化・編成・実効ステータス）。pure TS・Phaser非依存
import type { Rng } from './rng'
import type { GameState, MonsterBonus, MonsterInstance } from './state'
import { BASE_SPECIES, getSpecies } from '../data/monsters'

export function getInstance(state: GameState, uid: string): MonsterInstance {
  const m = state.roster.find((x) => x.uid === uid)
  if (!m) throw new Error(`unknown monster uid: ${uid}`)
  return m
}

/** 実効ステータス = 種族基礎値 + 個体ボーナス */
export function totalStats(m: MonsterInstance): MonsterBonus {
  const s = getSpecies(m.speciesId)
  return {
    hp: s.hp + m.bonus.hp,
    atk: s.atk + m.bonus.atk,
    def: s.def + m.bonus.def,
    spd: s.spd + m.bonus.spd,
  }
}

/** タマゴ1個を孵化してベース4種のいずれかを手持ちに加える。タマゴがなければ null */
export function hatchEgg(state: GameState, rng: Rng): MonsterInstance | null {
  if (state.eggs <= 0) return null
  state.eggs -= 1
  const speciesId = BASE_SPECIES[Math.floor(rng() * BASE_SPECIES.length)]
  const m: MonsterInstance = {
    uid: `m${state.nextUid++}`,
    speciesId,
    bonus: { hp: 0, atk: 0, def: 0, spd: 0 },
  }
  state.roster.push(m)
  return m
}

/**
 * パーティの slot(0-2) に uid をセットする。
 * その個体が別スロットにいる場合は入れ替え、パーティの重複を防ぐ
 */
export function assignToParty(state: GameState, slot: number, uid: string): void {
  if (slot < 0 || slot > 2) throw new Error(`invalid party slot: ${slot}`)
  getInstance(state, uid) // 存在チェック
  const currentIndex = state.party.indexOf(uid)
  if (currentIndex === slot) return
  if (currentIndex >= 0) {
    state.party[currentIndex] = state.party[slot]
  }
  state.party[slot] = uid
}
