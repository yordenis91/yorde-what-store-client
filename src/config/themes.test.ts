import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_THEME,
  STOREFRONT_THEMES,
  THEME_NAMES,
  applyStorefrontTheme,
  clearStorefrontTheme,
  resolveTheme,
  themeSwatch,
} from './themes'

const inlineVar = (shade: number) => document.documentElement.style.getPropertyValue(`--color-brand-${shade}`)

afterEach(() => {
  clearStorefrontTheme()
})

describe('resolveTheme', () => {
  it('returns the palette for a known theme', () => {
    expect(resolveTheme('emerald')).toBe(STOREFRONT_THEMES.emerald)
  })

  /**
   * `theme` is a free-form string column. An unknown value must degrade to the
   * default palette rather than leave the storefront unstyled.
   */
  it('falls back to the default palette for anything unrecognised', () => {
    expect(resolveTheme('a-theme-that-does-not-exist')).toBe(STOREFRONT_THEMES[DEFAULT_THEME])
    expect(resolveTheme(null)).toBe(STOREFRONT_THEMES[DEFAULT_THEME])
    expect(resolveTheme(undefined)).toBe(STOREFRONT_THEMES[DEFAULT_THEME])
    expect(resolveTheme('')).toBe(STOREFRONT_THEMES[DEFAULT_THEME])
  })
})

describe('theme palettes', () => {
  it('gives every theme all five shades Tailwind expects', () => {
    for (const name of THEME_NAMES) {
      const shades = STOREFRONT_THEMES[name]
      for (const shade of [50, 100, 500, 600, 700] as const) {
        expect(shades[shade], `${name}/${shade}`).toMatch(/^#[0-9a-f]{6}$/i)
      }
    }
  })

  it('gives each theme a distinct swatch, so the picker is legible', () => {
    const swatches = THEME_NAMES.map((name) => themeSwatch(name))

    expect(new Set(swatches).size).toBe(THEME_NAMES.length)
  })
})

describe('applyStorefrontTheme', () => {
  it('sets the five brand variables Tailwind utilities read', () => {
    applyStorefrontTheme('emerald')

    expect(inlineVar(600)).toBe(STOREFRONT_THEMES.emerald[600])
    expect(inlineVar(50)).toBe(STOREFRONT_THEMES.emerald[50])
    expect(inlineVar(700)).toBe(STOREFRONT_THEMES.emerald[700])
  })

  it('applies the default palette for an unknown theme name', () => {
    applyStorefrontTheme('nonsense')

    expect(inlineVar(600)).toBe(STOREFRONT_THEMES[DEFAULT_THEME][600])
  })

  it('replaces the previous store colours rather than layering them', () => {
    applyStorefrontTheme('rose')
    applyStorefrontTheme('teal')

    expect(inlineVar(600)).toBe(STOREFRONT_THEMES.teal[600])
  })

  /**
   * In `/store/:slug` mode the platform and a storefront share a document, so
   * leaving a store has to hand the stylesheet's own colours back.
   */
  it('clears the overrides so the platform is not left tinted', () => {
    applyStorefrontTheme('rose')
    expect(inlineVar(600)).not.toBe('')

    clearStorefrontTheme()

    expect(inlineVar(600)).toBe('')
    expect(inlineVar(50)).toBe('')
  })
})
