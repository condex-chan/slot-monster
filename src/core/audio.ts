// BGM切替の判定ロジック（pure TS・Phaser非依存）。
// 実際の再生・フェードは src/assets/bgm.ts が担当する
export type BgmTrack = 'bgm-main' | 'bgm-battle'

/** 勝利ジングルのオーディオキー */
export const JINGLE_WIN = 'jingle-win'

/** シーンごとのBGM。バトルのみ専用曲、他はメイン曲を流し続ける */
export function bgmForScene(sceneKey: string): BgmTrack | null {
  if (sceneKey === 'Battle') return 'bgm-battle'
  if (['Title', 'Main', 'Roster', 'Dex', 'Odds'].includes(sceneKey)) return 'bgm-main'
  return null
}

/**
 * シーン入場時のBGM操作を決める。同じ曲が続くなら何もしない
 * （Main⇔育成/図鑑などの往復で曲が途切れないようにする）
 */
export function bgmTransition(
  current: BgmTrack | null,
  sceneKey: string,
): { stop: BgmTrack | null; play: BgmTrack | null } {
  const target = bgmForScene(sceneKey)
  if (target === current) return { stop: null, play: null }
  return { stop: current, play: target }
}

/** セーブから読んだミュート設定の正規化。旧セーブ（フィールドなし）は false */
export function normalizeMuted(value: unknown): boolean {
  return value === true
}
