// コイン経済（pure TS・Phaser非依存）。数値は役テーブルから導出し二重管理しない
import { PAYTABLE, type RoleId } from '../data/paytable'

export const INITIAL_COINS = 500
export const BET = 10

export function payoutFor(role: RoleId, bet: number): number {
  const def = PAYTABLE.find((r) => r.id === role)
  return def ? Math.floor(bet * def.payoutMult) : 0
}

export function canSpin(coins: number, bet: number): boolean {
  return coins >= bet
}

/** 役で獲得するタマゴ数。確率表の「タマゴ獲得」表記と実際の効果を一致させる */
export function eggsFor(role: RoleId): number {
  return role === 'egg' ? 1 : 0
}
