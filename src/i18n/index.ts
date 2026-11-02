import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en/common.json'
import es from './locales/es/common.json'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: en },
      es: { common: es },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'es'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  })

/**
 * Keeps `<html lang>` in step with the active language. It ships as `en` in
 * index.html, so without this a Spanish storefront tells crawlers and screen
 * readers it is English.
 */
function syncDocumentLanguage(language: string) {
  document.documentElement.lang = language.split('-')[0]
}

syncDocumentLanguage(i18n.language)
i18n.on('languageChanged', syncDocumentLanguage)

const LANGUAGE_CHOSEN_KEY = 'yws-language-chosen'

/** Remembers that the visitor picked a language themselves, so a store's default never overrides it. */
export function rememberLanguageChoice() {
  try {
    localStorage.setItem(LANGUAGE_CHOSEN_KEY, '1')
  } catch {
    // private mode: the store default simply applies again on the next visit
  }
}

/**
 * Shows a storefront in its owner's language, unless the visitor has chosen one. Without this the
 * detector would follow the browser and a Spanish store would greet an English-set phone in English.
 */
export function applyTenantDefaultLanguage(locale: string | undefined) {
  const wanted = locale?.toLowerCase().split('-')[0]
  if (wanted !== 'en' && wanted !== 'es') return
  try {
    if (localStorage.getItem(LANGUAGE_CHOSEN_KEY)) return
  } catch {
    // unreadable storage counts as no choice made
  }
  if (i18n.resolvedLanguage !== wanted) void i18n.changeLanguage(wanted)
}

export default i18n
