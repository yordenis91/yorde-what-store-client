import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'

export function HeroSection() {
  const { t } = useTranslation()
  const chips = t('landing.hero.chips', { returnObjects: true }) as string[]

  return (
    <section className="bg-gradient-to-b from-brand-50 to-white px-4 pb-12 pt-10 text-center sm:pb-20 sm:pt-16">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">{t('landing.hero.eyebrow')}</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-gray-900 sm:text-5xl">{t('landing.hero.title')}</h1>
        <p className="mt-4 text-base text-gray-600 sm:text-lg">{t('landing.hero.subtitle')}</p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/register" className="sm:min-w-44">
            <Button className="w-full">{t('landing.hero.ctaPrimary')}</Button>
          </Link>
          <Link to="/login" className="sm:min-w-44">
            <Button variant="secondary" className="w-full">
              {t('landing.hero.ctaSecondary')}
            </Button>
          </Link>
        </div>

        <ul className="mt-7 flex flex-wrap justify-center gap-2">
          {chips.map((chip) => (
            <li key={chip} className="rounded-full border border-brand-100 bg-white px-3 py-1 text-xs font-medium text-brand-700">
              {chip}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
