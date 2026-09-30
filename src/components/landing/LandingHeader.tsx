import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { HOW_SECTION_ID } from './roles'

export function LandingHeader() {
  const { t } = useTranslation()
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link to="/" className="truncate text-base font-bold text-brand-700">
          {t('app.name')}
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <a href={`#${HOW_SECTION_ID}`} className="hidden text-gray-600 hover:text-gray-900 sm:inline">
            {t('landing.nav.howItWorks')}
          </a>
          <Link to="/login" className="font-medium text-gray-700 hover:text-gray-900">
            {t('nav.login')}
          </Link>
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  )
}
