// 役テーブル（design.md の初期ドラフト値）。確率・払い出しはここで一元管理し、
// ゲーム内確率表(F15)もこのモジュールを参照する
export type RoleId =
  | 'copper'
  | 'silver'
  | 'gold'
  | 'egg'
  | 'sword'
  | 'heart'
  | 'star'
  | 'door'
  | 'flash'
  | 'none'

export interface RoleDef {
  id: Exclude<RoleId, 'none'>
  label: string
  /** 1スピンあたりの当選確率 */
  probability: number
  /**
   * 3ラインベット時の当選確率（省略時は probability と同じ）。
   * 払い出し倍率0のレア役だけを上げるため、コインRTPは変わらない
   */
  probability3?: number
  /** ベット倍率での払い出し（コイン以外の報酬役は0） */
  payoutMult: number
}

/** ベットライン数に応じた当選確率 */
export function probabilityFor(role: RoleDef, lines: 1 | 3): number {
  return lines === 3 ? (role.probability3 ?? role.probability) : role.probability
}

// 通常時RTP(コインのみ) = Σ probability × payoutMult
// = 0.125*2 + 0.05*5 + 0.02*15 + (1/15)*0.5*3 = 0.90 → 目標90〜95%の下限
export const PAYTABLE: readonly RoleDef[] = [
  { id: 'copper', label: '銅コイン', probability: 1 / 8, payoutMult: 2 },
  { id: 'silver', label: '銀コイン', probability: 1 / 20, payoutMult: 5 },
  { id: 'gold', label: '金コイン', probability: 1 / 50, payoutMult: 15 },
  { id: 'egg', label: 'タマゴ', probability: 1 / 40, probability3: 1 / 20, payoutMult: 0 },
  { id: 'sword', label: '剣', probability: 1 / 15, payoutMult: 0.5 },
  { id: 'heart', label: 'ハート', probability: 1 / 15, payoutMult: 0.5 },
  { id: 'star', label: '星', probability: 1 / 15, payoutMult: 0.5 },
  { id: 'door', label: '扉', probability: 1 / 25, probability3: 1 / 12, payoutMult: 0 },
  { id: 'flash', label: 'フラッシュ', probability: 1 / 30, probability3: 1 / 15, payoutMult: 0 },
]
