// 配合素材の定義（データ駆動）。F14 の餌やり強化はこの stat/gain を参照する
export type MaterialId = 'dew' | 'meat' | 'shard' | 'feather'

export interface MaterialDef {
  id: MaterialId
  label: string
  stat: 'hp' | 'atk' | 'def' | 'spd'
  /** 餌やり1個あたりの上昇量 */
  gain: number
}

export const MATERIALS: readonly MaterialDef[] = [
  { id: 'dew', label: 'いのちのしずく', stat: 'hp', gain: 5 },
  { id: 'meat', label: 'ちからのにく', stat: 'atk', gain: 2 },
  { id: 'shard', label: 'まもりのカケラ', stat: 'def', gain: 2 },
  { id: 'feather', label: 'はやての羽', stat: 'spd', gain: 2 },
]

export function getMaterial(id: MaterialId): MaterialDef {
  const def = MATERIALS.find((m) => m.id === id)
  if (!def) throw new Error(`unknown material: ${id}`)
  return def
}
