// 初回オンボーディングの段階ガイド（pure TS・Phaser非依存）。
// 進行は guide フィールド1つの状態機械で管理し、セーブに保存して
// 2回目以降のプレイでは表示しない
export type GuideStep = 'spin' | 'rush' | 'boost' | 'done'

export type GuideEvent = 'spinDone' | 'rushEntered' | 'boostExplained'

export const GUIDE_STEPS: readonly GuideStep[] = ['spin', 'rush', 'boost', 'done']

/**
 * ガイドの進行。spin(スピンしてみよう) → rush(扉3つor天井でラッシュ)
 * → boost(初ラッシュでブースト説明) → done。
 * 初スピンで扉が揃った場合は rush を飛ばして boost へ直行する
 */
export function nextGuideStep(current: GuideStep, event: GuideEvent): GuideStep {
  if (current === 'done') return 'done'
  if (event === 'rushEntered' && (current === 'spin' || current === 'rush')) return 'boost'
  if (event === 'spinDone' && current === 'spin') return 'rush'
  if (event === 'boostExplained' && current === 'boost') return 'done'
  return current
}

/** メイン画面に出すガイド文言。表示不要の段階は null */
export function guideMessage(step: GuideStep): string | null {
  switch (step) {
    case 'spin':
      return '① まずはスピンしてみよう！'
    case 'rush':
      return '② 扉を3つ揃える or 天井到達でラッシュ突入！'
    default:
      return null
  }
}

/** 初ラッシュ時のブースト説明を出すか */
export function shouldShowBoostGuide(step: GuideStep): boolean {
  return step === 'boost'
}

/** セーブから読んだ値の正規化。未知値・旧セーブ（フィールドなし）は done 扱い */
export function normalizeGuide(value: unknown): GuideStep {
  return GUIDE_STEPS.includes(value as GuideStep) ? (value as GuideStep) : 'done'
}
