import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function FinalCtaSection() {
  const { t } = useTranslation()
  return (
    <section className="bg-brand-700 px-4 py-14 text-center text-white">
      <div className="mx-auto max-w-xl">
        <h2 className="text-2xl font-bold sm:text-3xl">{t('landing.finalCta.title')}</h2>
        <p className="mt-2 text-brand-100">{t('landing.finalCta.subtitle')}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/register"
            className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 sm:py-2.5"
          >
            {t('landing.finalCta.primary')}
          </Link>
          <Link
            to="/login"
            className="rounded-lg border border-white/40 px-5 py-3 text-sm font-medium text-white hover:bg-white/10 sm:py-2.5"
          >
            {t('landing.finalCta.secondary')}
          </Link>
        </div>
      </div>
    </section>
  )
}
