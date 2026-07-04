// 配合システム（pure TS・Phaser非依存）。
// 系統×系統の組み合わせ表で新種が決まり、親は消滅、子に親のステータスの一部を上乗せする
import { getInstance, totalStats } from './collection'
import type { GameState, MonsterInstance } from './state'
import { getSpecies, type Lineage, type SpeciesId } from '../data/monsters'

/** 系統×系統 → 子の種族（対称、10通り） */
export const FUSION_TABLE: Record<Lineage, Record<Lineage, SpeciesId>> = {
  beast: { beast: 'garm', dragon: 'wyvern', slime: 'mossle', undead: 'zombiewolf' },
  dragon: { beast: 'wyvern', dragon: 'lindwurm', slime: 'geldra', undead: 'dragonzombie' },
  slime: { beast: 'mossle', dragon: 'geldra', slime: 'kingpururu', undead: 'ghostpull' },
  undead: { beast: 'zombiewolf', dragon: 'dragonzombie', slime: 'ghostpull', undead: 'lich' },
}

/** 隠し種のレア組み合わせ: キングプルル×ゴスプル（順不同）→ にじプル */
export const HIDDEN_COMBO: readonly [SpeciesId, SpeciesId] = ['kingpururu', 'ghostpull']

/** 親の実効ステータス合計のうち子に引き継がれる割合 */
export const FUSION_BONUS_RATIO = 0.25

/** 配合に必要な最小手持ち数（親2体が消えてもパーティ3体を維持できる数） */
export const MIN_ROSTER_FOR_FUSION = 4

export function fusionResult(a: SpeciesId, b: SpeciesId): SpeciesId {
  const isHidden =
    (a === HIDDEN_COMBO[0] && b === HIDDEN_COMBO[1]) ||
    (a === HIDDEN_COMBO[1] && b === HIDDEN_COMBO[0])
  if (isHidden) return 'prisma'
  return FUSION_TABLE[getSpecies(a).lineage][getSpecies(b).lineage]
}

/**
 * 2体を配合する。継承スキルは親のどちらかの所持スキルから1個選ぶ。
 * 親は手持ちから消滅し、親がパーティにいた場合は子や控えで埋め直す
 */
export function fuse(
  state: GameState,
  uidA: string,
  uidB: string,
  inheritSkillId: string,
): MonsterInstance {
  if (uidA === uidB) throw new Error('同じ個体同士は配合できない')
  if (state.roster.length < MIN_ROSTER_FOR_FUSION) {
    throw new Error(`配合には手持ち${MIN_ROSTER_FOR_FUSION}体以上が必要`)
  }
  const a = getInstance(state, uidA)
  const b = getInstance(state, uidB)
  if (inheritSkillId !== a.skillId && inheritSkillId !== b.skillId) {
    throw new Error('継承スキルは親の所持スキルから選ぶ')
  }
  const sa = totalStats(a)
  const sb = totalStats(b)
  const child: MonsterInstance = {
    uid: `m${state.nextUid++}`,
    speciesId: fusionResult(a.speciesId, b.speciesId),
    skillId: inheritSkillId,
    bonus: {
      hp: Math.round((sa.hp + sb.hp) * FUSION_BONUS_RATIO),
      atk: Math.round((sa.atk + sb.atk) * FUSION_BONUS_RATIO),
      def: Math.round((sa.def + sb.def) * FUSION_BONUS_RATIO),
      spd: Math.round((sa.spd + sb.spd) * FUSION_BONUS_RATIO),
    },
  }
  state.roster = state.roster.filter((m) => m.uid !== uidA && m.uid !== uidB)
  state.roster.push(child)
  // パーティ修復: 最初の親スロットは子、2体目は控えから補充
  for (let i = 0; i < state.party.length; i++) {
    const uid = state.party[i]
    if (uid !== uidA && uid !== uidB) continue
    if (!state.party.includes(child.uid)) {
      state.party[i] = child.uid
    } else {
      const substitute = state.roster.find((m) => !state.party.includes(m.uid))
      if (!substitute) throw new Error('パーティを補充できない')
      state.party[i] = substitute.uid
    }
  }
  return child
}
