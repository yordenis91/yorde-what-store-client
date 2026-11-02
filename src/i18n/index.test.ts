import { beforeEach, describe, expect, it } from 'vitest'
import i18n, { applyTenantDefaultLanguage, rememberLanguageChoice } from '@/i18n'

describe('applyTenantDefaultLanguage', () => {
  beforeEach(async () => {
    localStorage.clear()
    await i18n.changeLanguage('en')
  })

  it("shows the store in its owner's language when the visitor has not chosen one", async () => {
    applyTenantDefaultLanguage('es')
    await new Promise((r) => setTimeout(r, 0))
    expect(i18n.resolvedLanguage).toBe('es')
  })

  it('accepts a regional locale such as es-VE', async () => {
    applyTenantDefaultLanguage('es-VE')
    await new Promise((r) => setTimeout(r, 0))
    expect(i18n.resolvedLanguage).toBe('es')
  })

  it("leaves the visitor's own choice alone", async () => {
    rememberLanguageChoice()
    applyTenantDefaultLanguage('es')
    await new Promise((r) => setTimeout(r, 0))
    expect(i18n.resolvedLanguage).toBe('en')
  })

  it('ignores a locale the app has no translations for', async () => {
    applyTenantDefaultLanguage('fr')
    await new Promise((r) => setTimeout(r, 0))
    expect(i18n.resolvedLanguage).toBe('en')
  })
})
