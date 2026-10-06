import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/Input'
import { ImageField, SaveButton, SectionCard, SectionFieldset } from './shared'
import { useReportDirty, useSaveTenantFields } from './hooks'
import type { Tenant } from '@/types/api'

type Values = Pick<Tenant, 'name' | 'tagline' | 'currencySymbol' | 'tracksInventory' | 'invoiceLogoUrl'>

const toValues = (t: Tenant): Values => ({
  name: t.name,
  tagline: t.tagline,
  currencySymbol: t.currencySymbol,
  tracksInventory: t.tracksInventory,
  invoiceLogoUrl: t.invoiceLogoUrl,
})

export function GeneralSection({ tenant }: { tenant: Tenant }) {
  const { t } = useTranslation()
  const { register, handleSubmit, reset, watch, setValue, formState } = useForm<Values>({
    defaultValues: toValues(tenant),
  })
  const save = useSaveTenantFields()
  useReportDirty(formState.isDirty)
  useEffect(() => reset(toValues(tenant)), [tenant, reset])

  return (
    <form onSubmit={(e) => void handleSubmit((values) => save.mutate(values))(e)}>
      <SectionFieldset>
        <SectionCard title={t('settings.storeDetails')}>
          <Input label={t('products.name')} {...register('name')} />
          <Input label={t('settings.tagline')} {...register('tagline')} />
          <Input label={t('settings.currencySymbol')} {...register('currencySymbol')} className="max-w-[120px]" />
        </SectionCard>

        <SectionCard title={t('settings.inventory')} hint={t('settings.inventoryHint')}>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" className="mt-0.5" {...register('tracksInventory')} />
            <span>{t('settings.tracksInventory')}</span>
          </label>
        </SectionCard>

        <SectionCard title={t('settings.billing')}>
          <ImageField
            label={t('settings.invoiceLogo')}
            hint={t('settings.invoiceLogoHint')}
            value={watch('invoiceLogoUrl')}
            onChange={(url) => setValue('invoiceLogoUrl', url, { shouldDirty: true })}
            previewClassName="h-20 w-20 rounded-xl"
            uploadType="logo"
          />
        </SectionCard>

        <SaveButton loading={save.isPending} />
      </SectionFieldset>
    </form>
  )
}
