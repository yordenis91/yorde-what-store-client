import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { SaveButton, SectionCard, SectionFieldset } from './shared'
import { useReportDirty, useSaveTenantFields } from './hooks'
import type { Tenant, TrustBadgeKey, TrustBadges } from '@/types/api'

const KEYS: TrustBadgeKey[] = ['shipping', 'payment', 'delivery']

/** The api's column default — what every storefront showed before this was configurable. */
const DEFAULTS: TrustBadges = {
  shipping: { enabled: true, text: 'Envío gratis' },
  payment: { enabled: true, text: 'Pago seguro' },
  delivery: { enabled: true, text: 'Entrega rápida' },
}

/** The strip is a single row on a phone; longer text would be cut off. */
const MAX_TEXT = 24

type Values = { trustBadges: TrustBadges }

const initial = (tenant: Tenant): Values => ({ trustBadges: { ...DEFAULTS, ...tenant.trustBadges } })

export function TrustSection({ tenant }: { tenant: Tenant }) {
  const { t } = useTranslation()
  const { register, handleSubmit, reset, formState } = useForm<Values>({ defaultValues: initial(tenant) })
  const save = useSaveTenantFields()
  useReportDirty(formState.isDirty)
  useEffect(() => reset(initial(tenant)), [tenant, reset])

  const labels: Record<TrustBadgeKey, string> = {
    shipping: t('settings.trustBadgeShipping'),
    payment: t('settings.trustBadgePayment'),
    delivery: t('settings.trustBadgeDelivery'),
  }

  return (
    // The api replaces the whole trustBadges object, so all three badges are always sent.
    <form onSubmit={(e) => void handleSubmit((values) => save.mutate(values))(e)}>
      <SectionFieldset>
        <SectionCard hint={t('settings.trustHint')}>
          <div className="flex flex-col gap-4">
            {KEYS.map((key) => (
              <div key={key} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <label className="flex w-40 shrink-0 items-center gap-2 text-sm font-medium text-gray-700">
                  <input type="checkbox" {...register(`trustBadges.${key}.enabled`)} />
                  {labels[key]}
                  <span className="sr-only">{t('settings.trustBadgeEnabled')}</span>
                </label>
                <input
                  type="text"
                  maxLength={MAX_TEXT}
                  aria-label={`${labels[key]} — ${t('settings.trustBadgeText')}`}
                  placeholder={DEFAULTS[key].text}
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  {...register(`trustBadges.${key}.text`)}
                />
              </div>
            ))}
            <p className="text-xs text-gray-500">{t('settings.trustBadgeTextHint')}</p>
          </div>
        </SectionCard>
        <SaveButton loading={save.isPending} />
      </SectionFieldset>
    </form>
  )
}
