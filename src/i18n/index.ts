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

export default i18n
