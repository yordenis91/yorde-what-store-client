import { useTranslation } from 'react-i18next'

interface Testimonial {
  quote: string
  name: string
  role: string
}

export function SocialProofSection() {
  const { t } = useTranslation()
  const items = t('landing.proof.items', { returnObjects: true }) as Testimonial[]

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">{t('landing.proof.title')}</h2>
      <div className="mt-8 flex flex-col gap-4 md:grid md:grid-cols-3">
        {items.map((item) => (
          <figure key={item.name} className="flex flex-col justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5">
            <blockquote className="text-sm text-gray-700">“{item.quote}”</blockquote>
            <figcaption className="text-sm">
              <span className="font-semibold text-gray-900">{item.name}</span>
              <span className="text-gray-500"> · {item.role}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-gray-400">{t('landing.proof.note')}</p>
    </section>
  )
}
