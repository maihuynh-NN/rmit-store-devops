import { describe, expect, it } from 'vitest'

import { errorMessage, fieldErrors, initial, money } from '@/utils/format'

describe('money', () => {
  it('formats numbers and numeric strings as dollars with cents', () => {
    expect(money(1234.5)).toBe('$1,234.50')
    expect(money('19.9')).toBe('$19.90')
  })

  it('shows $0.00 for missing or invalid values instead of crashing', () => {
    expect(money(null)).toBe('$0.00')
    expect(money(undefined)).toBe('$0.00')
    expect(money('abc')).toBe('$0.00')
  })
})

describe('initial', () => {
  it('returns the uppercase first letter, or ? when empty', () => {
    expect(initial('  mai')).toBe('M')
    expect(initial('')).toBe('?')
  })
})

describe('errorMessage', () => {
  it('prefers the API detail over the generic axios message', () => {
    const error = { message: 'Request failed', response: { data: { detail: 'Your card was declined.' } } }
    expect(errorMessage(error)).toBe('Your card was declined.')
  })

  it('falls back when nothing useful is present', () => {
    expect(errorMessage({}, 'Try again')).toBe('Try again')
  })
})

describe('fieldErrors', () => {
  it('reaches into the payment scope and keeps the first message per field', () => {
    const error = { response: { data: { payment: { number: ['Not valid', 'Second'], cvc: 'Bad' } } } }
    expect(fieldErrors(error, 'payment')).toEqual({ number: 'Not valid', cvc: 'Bad' })
  })

  it('drops detail, which is not a form field', () => {
    const error = { response: { data: { detail: 'Oops', email: ['Taken'] } } }
    expect(fieldErrors(error)).toEqual({ email: 'Taken' })
  })
})