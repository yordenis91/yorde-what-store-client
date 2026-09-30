import { useTranslation } from 'react-i18next'
import { FAQ_SECTION_ID } from './roles'

interface FaqItem {
  q: string
  a: string
}

export function FaqSection() {
  const { t } = useTranslation()
  const items = t('landing.faq.items', { returnObjects: true }) as FaqItem[]

  return (
    <section id={FAQ_SECTION_ID} className="scroll-mt-16 bg-gray-50 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">{t('landing.faq.title')}</h2>
        <div className="mt-8 flex flex-col gap-3">
          {items.map((item) => (
            <details key={item.q} className="group rounded-xl border border-gray-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
                {item.q}
                <span aria-hidden className="text-xl leading-none text-gray-400 group-open:hidden">
                  +
                </span>
                <span aria-hidden className="hidden text-xl leading-none text-gray-400 group-open:inline">
                  −
                </span>
              </summary>
              <p className="px-5 pb-4 text-sm text-gray-600">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
