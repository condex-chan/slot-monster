// 天井システム（pure TS・Phaser非依存）。
// バトル非突入が CEILING_SPINS 続いたら、次のスピンは抽選結果に関わらず突入確定
import type { RoleId } from '../data/paytable'

export const CEILING_SPINS = 40

/** 直前までの非突入連続スピン数が天井に達しているか（達していれば今スピンは突入確定） */
export function isForcedByCeiling(spinsSinceBattle: number): boolean {
  return spinsSinceBattle >= CEILING_SPINS
}

/** このスピンでバトルラッシュへ突入するか（扉3揃い or 天井） */
export function entersBattle(role: RoleId, spinsSinceBattle: number): boolean {
  return role === 'door' || isForcedByCeiling(spinsSinceBattle)
}

/** スピン結果を反映した次の天井カウンタ */
export function nextCeilingCount(entered: boolean, spinsSinceBattle: number): number {
  return entered ? 0 : spinsSinceBattle + 1
}

/** メーター表示用: 天井までの残りスピン数 */
export function spinsUntilCeiling(spinsSinceBattle: number): number {
  return Math.max(0, CEILING_SPINS - spinsSinceBattle)
}
