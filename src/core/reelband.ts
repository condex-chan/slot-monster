// 帯スクロール式リールの位置計算（pure TS・Phaser非依存）。
// 位置 p はセル単位の連続量で、p が増えるほど図柄は上から下へ流れる。
// スロット j（0=窓の上端側）の図柄は REEL_STRIP[mod(floor(p) - j)]、
// 描画位置は「基準y + (j + bandShift(p)) × セル高」。この2式の組で
// p が整数をまたいでも同じ図柄が同じ画面位置に現れる（連続性）。
import { REEL_STRIP, type SymbolId } from './reels'

/** 窓3段 + 上下のはみ出し各1スロット */
export const SLOT_COUNT = 5
/** 中央有効ラインに当たるスロット番号 */
export const CENTER_SLOT = 2

const mod = (v: number, n: number) => ((v % n) + n) % n

/** 位置 p のときスロット j に表示する図柄 */
export function bandSymbolAt(p: number, slot: number): SymbolId {
  return REEL_STRIP[mod(Math.floor(p) - slot, REEL_STRIP.length)]
}

/** 位置 p のときのスロット共通の縦ずらし量（セル単位、[0,1)） */
export function bandShift(p: number): number {
  return p - Math.floor(p)
}

/**
 * 中央スロットに図柄 center を出す、minP 以上で最小の整数位置。
 * 停止演出はこの位置まで減速スクロールしてスナップする
 */
export function snapPositionFor(center: SymbolId, minP: number): number {
  const n = REEL_STRIP.length
  const want = mod(REEL_STRIP.indexOf(center) + CENTER_SLOT, n)
  const base = Math.ceil(minP)
  return base + mod(want - base, n)
}
