import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

export function LandingPage() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-4 text-center">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <h1 className="text-3xl font-bold text-brand-700">{t('app.name')}</h1>
      <p className="max-w-md text-gray-600">Multitenant ecommerce with WhatsApp & Telegram checkout.</p>
      <div className="flex gap-3">
        <Link to="/login">
          <Button variant="secondary">{t('nav.login')}</Button>
        </Link>
        <Link to="/register">
          <Button>{t('nav.register')}</Button>
        </Link>
      </div>
    </div>
  )
}
