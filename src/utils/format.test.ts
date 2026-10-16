import { describe, expect, it } from 'vitest'
import { formatCurrencyCode, formatDate, formatMoney, slugify } from './format'

describe('formatMoney', () => {
  it('puts the symbol in front by default', () => {
    expect(formatMoney(25, '$')).toBe('$25.00')
  })

  it('puts the symbol after when the store is configured that way', () => {
    expect(formatMoney(25, '€', 'post')).toBe('25.00€')
  })

  it('accepts the decimal strings Prisma returns for money columns', () => {
    expect(formatMoney('12.5', '$')).toBe('$12.50')
  })

  it('always shows two decimals', () => {
    expect(formatMoney(0, '$')).toBe('$0.00')
    expect(formatMoney(1000, '$')).toBe('$1000.00')
  })
})

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('My Great Store')).toBe('my-great-store')
  })

  it('strips accents so Spanish names produce usable URLs', () => {
    expect(slugify('Café Bogotá')).toBe('cafe-bogota')
    expect(slugify('Jabón artesanal')).toBe('jabon-artesanal')
  })

  it('drops punctuation and collapses separators', () => {
    expect(slugify('Ropa & Más!!  Nueva')).toBe('ropa-mas-nueva')
  })

  it('leaves no leading or trailing hyphen', () => {
    expect(slugify('  ¡Hola!  ')).toBe('hola')
    expect(slugify('---x---')).toBe('x')
  })
})

describe('formatDate', () => {
  it('renders an ISO timestamp as a readable date', () => {
    expect(formatDate('2026-08-16T10:30:00.000Z')).toMatch(/2026/)
  })
})

describe('formatCurrencyCode', () => {
  it('writes an amount in its own currency, not with a bare dollar sign', () => {
    expect(formatCurrencyCode(1234.5, 'USD')).toBe('$1,234.50')
    expect(formatCurrencyCode(50000, 'CLP')).toContain('50,000')
    expect(formatCurrencyCode(50000, 'CLP')).not.toContain('.00')
  })

  it('falls back to the plain number when there is no currency, or the code is unknown', () => {
    expect(formatCurrencyCode(12.3, null)).toBe('12.30')
    expect(formatCurrencyCode(12.3, 'NOT-A-CODE')).toBe('12.30 NOT-A-CODE')
  })
})
