import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@/i18n/locales/en/common.json'
import es from '@/i18n/locales/es/common.json'

/**
 * The app's own i18n module attaches a language detector that reads
 * localStorage and navigator. Tests initialise their own instance instead, so
 * assertions can match fixed English copy regardless of the environment.
 */
void i18n.use(initReactI18next).init({
  resources: { en: { common: en }, es: { common: es } },
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'es'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
})

// jsdom implements neither, and components under test call both.
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  window.scrollTo = vi.fn()
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})
