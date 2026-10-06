import { forwardRef, useEffect } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { SaveButton, SectionCard, SectionFieldset } from './shared'
import { useReportDirty, useSaveTenantFields } from './hooks'
import type { Tenant } from '@/types/api'

type Values = Pick<
  Tenant,
  'termsOfSaleContent' | 'shippingPolicyContent' | 'returnPolicyContent' | 'privacyPolicyContent'
>

const toValues = (t: Tenant): Values => ({
  termsOfSaleContent: t.termsOfSaleContent,
  shippingPolicyContent: t.shippingPolicyContent,
  returnPolicyContent: t.returnPolicyContent,
  privacyPolicyContent: t.privacyPolicyContent,
})

/** Labelled textarea for one merchant-authored policy. Blank means "not published" — the storefront just omits that page/link. */
const PolicyField = forwardRef<HTMLTextAreaElement, { label: string; hint: string } & UseFormRegisterReturn>(
  function PolicyField({ label, hint, ...field }, ref) {
    return (
      <div>
        <label htmlFor={field.name} className="text-sm font-medium text-gray-700">
          {label}
        </label>
        <p className="mt-0.5 text-xs text-gray-500">{hint}</p>
        <textarea
          id={field.name}
          ref={ref}
          rows={6}
          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          {...field}
        />
      </div>
    )
  },
)

export function PoliciesSection({ tenant }: { tenant: Tenant }) {
  const { t } = useTranslation()
  const { register, handleSubmit, reset, formState } = useForm<Values>({
    defaultValues: toValues(tenant),
  })
  const save = useSaveTenantFields()
  useReportDirty(formState.isDirty)
  useEffect(() => reset(toValues(tenant)), [tenant, reset])

  return (
    <form onSubmit={(e) => void handleSubmit((values) => save.mutate(values))(e)}>
      <SectionFieldset>
        <SectionCard title={t('settings.policies')} hint={t('settings.policiesHint')}>
          <PolicyField
            label={t('settings.termsOfSale')}
            hint={t('settings.termsOfSaleHint')}
            {...register('termsOfSaleContent')}
          />
          <PolicyField
            label={t('settings.shippingPolicy')}
            hint={t('settings.shippingPolicyHint')}
            {...register('shippingPolicyContent')}
          />
          <PolicyField
            label={t('settings.returnPolicy')}
            hint={t('settings.returnPolicyHint')}
            {...register('returnPolicyContent')}
          />
          <PolicyField
            label={t('settings.privacyPolicy')}
            hint={t('settings.privacyPolicyHint')}
            {...register('privacyPolicyContent')}
          />
        </SectionCard>
        <SaveButton loading={save.isPending} />
      </SectionFieldset>
    </form>
  )
}
