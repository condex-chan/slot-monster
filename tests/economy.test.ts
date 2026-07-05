import { describe, expect, it } from 'vitest'
import { BET, INITIAL_COINS, canSpin, payoutFor } from '../src/core/economy'
import { PAYTABLE } from '../src/data/paytable'

describe('payoutFor', () => {
  it.each(PAYTABLE.map((r) => [r.id, r.payoutMult] as const))(
    '%s はベット×%s（端数切り捨て）を払い出す',
    (id, mult) => {
      expect(payoutFor(id, 10)).toBe(Math.floor(10 * mult))
    },
  )

  it('ハズレは払い出し0', () => {
    expect(payoutFor('none', 10)).toBe(0)
  })
})

describe('canSpin', () => {
  it('残高がベット以上ならスピン可、未満なら不可', () => {
    expect(canSpin(BET, BET)).toBe(true)
    expect(canSpin(BET - 1, BET)).toBe(false)
    expect(canSpin(0, BET)).toBe(false)
  })
})

describe('初期値', () => {
  it('初期コインでスピンできる', () => {
    expect(INITIAL_COINS).toBeGreaterThanOrEqual(BET)
    expect(canSpin(INITIAL_COINS, BET)).toBe(true)
  })
})
