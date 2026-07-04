// モンスター定義（データ駆動・Phaser非依存）。
// 見た目も Appearance 記述子としてデータ化し、種族ごとの区別可能性をテストで保証する
export type Lineage = 'beast' | 'dragon' | 'slime' | 'undead'
export type Tier = 'base' | 'fusion' | 'hidden'
export type BodyShape = 'blob' | 'quad' | 'biped' | 'serpent' | 'ghost'

export type SpeciesId =
  | 'wolfy'
  | 'draco'
  | 'pururu'
  | 'bones'
  | 'garm'
  | 'lindwurm'
  | 'kingpururu'
  | 'lich'
  | 'wyvern'
  | 'mossle'
  | 'zombiewolf'
  | 'geldra'
  | 'dragonzombie'
  | 'ghostpull'
  | 'prisma'

export interface SkillDef {
  id: string
  label: string
  kind: 'attack' | 'heal'
  /** attack: ATK倍率 / heal: 最大HP比 */
  power: number
}

export const SKILLS: Record<string, SkillDef> = {
  fang: { id: 'fang', label: 'かみつき', kind: 'attack', power: 1.5 },
  fireBreath: { id: 'fireBreath', label: 'かえんのいき', kind: 'attack', power: 1.8 },
  healDrop: { id: 'healDrop', label: 'いやしのしずく', kind: 'heal', power: 0.5 },
  curse: { id: 'curse', label: 'のろい', kind: 'attack', power: 1.6 },
  doubleFang: { id: 'doubleFang', label: 'れんげきのキバ', kind: 'attack', power: 2.0 },
  inferno: { id: 'inferno', label: 'ごうかえん', kind: 'attack', power: 2.2 },
  bigHeal: { id: 'bigHeal', label: 'めぐみのあめ', kind: 'heal', power: 0.8 },
  darkBolt: { id: 'darkBolt', label: 'やみのいかずち', kind: 'attack', power: 2.0 },
  diveClaw: { id: 'diveClaw', label: 'きゅうこうかづめ', kind: 'attack', power: 1.9 },
  photosynth: { id: 'photosynth', label: 'こうごうせい', kind: 'heal', power: 0.6 },
  venomFang: { id: 'venomFang', label: 'どくのキバ', kind: 'attack', power: 1.8 },
  acidBreath: { id: 'acidBreath', label: 'さんのいき', kind: 'attack', power: 1.9 },
  rotBreath: { id: 'rotBreath', label: 'ふはいのいき', kind: 'attack', power: 2.1 },
  drain: { id: 'drain', label: 'すいとる', kind: 'attack', power: 1.6 },
  prismRay: { id: 'prismRay', label: 'にじのひかり', kind: 'attack', power: 2.5 },
}

export interface Appearance {
  body: BodyShape
  horns: boolean
  wings: boolean
  spikes: boolean
  ribs: boolean
  eyes: 1 | 2 | 3
}

export interface SpeciesDef {
  id: SpeciesId
  label: string
  lineage: Lineage
  tier: Tier
  hp: number
  atk: number
  def: number
  spd: number
  skillId: string
  look: Appearance
}

const look = (
  body: BodyShape,
  horns = false,
  wings = false,
  spikes = false,
  ribs = false,
  eyes: 1 | 2 | 3 = 2,
): Appearance => ({ body, horns, wings, spikes, ribs, eyes })

export const SPECIES: readonly SpeciesDef[] = [
  // ベース4種（各系統1種、タマゴから孵化）
  { id: 'wolfy', label: 'ウルフィ', lineage: 'beast', tier: 'base', hp: 55, atk: 12, def: 9, spd: 13, skillId: 'fang', look: look('quad') },
  { id: 'draco', label: 'ドラコ', lineage: 'dragon', tier: 'base', hp: 60, atk: 13, def: 10, spd: 9, skillId: 'fireBreath', look: look('biped', true, true) },
  { id: 'pururu', label: 'プルル', lineage: 'slime', tier: 'base', hp: 50, atk: 10, def: 8, spd: 12, skillId: 'healDrop', look: look('blob') },
  { id: 'bones', label: 'ボーンズ', lineage: 'undead', tier: 'base', hp: 52, atk: 11, def: 8, spd: 11, skillId: 'curse', look: look('biped', false, false, false, true) },
  // 同系統×同系統の配合4種
  { id: 'garm', label: 'ガルム', lineage: 'beast', tier: 'fusion', hp: 78, atk: 17, def: 13, spd: 18, skillId: 'doubleFang', look: look('quad', true) },
  { id: 'lindwurm', label: 'リンドヴルム', lineage: 'dragon', tier: 'fusion', hp: 85, atk: 19, def: 14, spd: 12, skillId: 'inferno', look: look('serpent', true, true, true) },
  { id: 'kingpururu', label: 'キングプルル', lineage: 'slime', tier: 'fusion', hp: 72, atk: 14, def: 12, spd: 16, skillId: 'bigHeal', look: look('blob', false, false, true) },
  { id: 'lich', label: 'リッチ', lineage: 'undead', tier: 'fusion', hp: 74, atk: 16, def: 11, spd: 15, skillId: 'darkBolt', look: look('ghost', true, false, false, false, 1) },
  // 異系統×異系統の配合6種
  { id: 'wyvern', label: 'ワイバーン', lineage: 'dragon', tier: 'fusion', hp: 80, atk: 18, def: 12, spd: 16, skillId: 'diveClaw', look: look('biped', false, true) },
  { id: 'mossle', label: 'モスプル', lineage: 'beast', tier: 'fusion', hp: 70, atk: 14, def: 13, spd: 14, skillId: 'photosynth', look: look('quad', false, false, true) },
  { id: 'zombiewolf', label: 'ゾンビウルフ', lineage: 'undead', tier: 'fusion', hp: 76, atk: 17, def: 10, spd: 15, skillId: 'venomFang', look: look('quad', false, false, false, true, 1) },
  { id: 'geldra', label: 'ゲルドラゴン', lineage: 'dragon', tier: 'fusion', hp: 82, atk: 16, def: 15, spd: 10, skillId: 'acidBreath', look: look('serpent', true) },
  { id: 'dragonzombie', label: 'ドラゴンゾンビ', lineage: 'undead', tier: 'fusion', hp: 88, atk: 18, def: 13, spd: 8, skillId: 'rotBreath', look: look('serpent', false, true, false, true, 1) },
  { id: 'ghostpull', label: 'ゴスプル', lineage: 'undead', tier: 'fusion', hp: 68, atk: 13, def: 11, spd: 17, skillId: 'drain', look: look('ghost') },
  // 隠し1種（レア組み合わせ、F13で解放条件を定義）
  { id: 'prisma', label: 'にじプル', lineage: 'slime', tier: 'hidden', hp: 95, atk: 20, def: 16, spd: 20, skillId: 'prismRay', look: look('blob', false, true, false, false, 3) },
]

export function getSpecies(id: SpeciesId): SpeciesDef {
  const def = SPECIES.find((s) => s.id === id)
  if (!def) throw new Error(`unknown species: ${id}`)
  return def
}

/** タマゴから孵化するベース種 */
export const BASE_SPECIES: readonly SpeciesId[] = SPECIES.filter((s) => s.tier === 'base').map(
  (s) => s.id,
)
