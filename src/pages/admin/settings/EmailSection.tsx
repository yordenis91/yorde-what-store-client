import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/Input'
import { SaveButton, SectionCard, SectionFieldset } from './shared'
import { useReportDirty, useSaveTenantFields } from './hooks'
import type { Tenant } from '@/types/api'

interface Values {
  smtpEnabled: boolean
  smtpHost: string
  smtpPort: string
  smtpUser: string
  smtpPassword: string
  smtpFrom: string
}

const toValues = (tenant: Tenant): Values => ({
  smtpEnabled: tenant.smtpEnabled,
  smtpHost: tenant.smtpHost ?? '',
  smtpPort: tenant.smtpPort ? String(tenant.smtpPort) : '',
  smtpUser: tenant.smtpUser ?? '',
  smtpPassword: '',
  smtpFrom: tenant.smtpFrom ?? '',
})

/**
 * The password field always loads blank (write-only, per Tenant.smtpPassword)
 * — leaving it blank on save keeps whatever password is already stored, the
 * same way the payment secrets never round-trip back into the browser.
 */
export function EmailSection({ tenant }: { tenant: Tenant }) {
  const { t } = useTranslation()
  const { register, handleSubmit, reset, watch, formState } = useForm<Values>({
    defaultValues: toValues(tenant),
  })
  const save = useSaveTenantFields()
  useReportDirty(formState.isDirty)
  useEffect(() => reset(toValues(tenant)), [tenant, reset])

  function submit(values: Values) {
    const payload: Partial<Tenant> = {
      smtpEnabled: values.smtpEnabled,
      smtpHost: values.smtpHost || null,
      smtpPort: values.smtpPort ? Number(values.smtpPort) : null,
      smtpUser: values.smtpUser || null,
      smtpFrom: values.smtpFrom || null,
    }
    if (values.smtpPassword) payload.smtpPassword = values.smtpPassword
    save.mutate(payload)
  }

  return (
    <form onSubmit={(e) => void handleSubmit(submit)(e)}>
      <SectionFieldset>
        <SectionCard title={t('settings.smtp')} hint={t('settings.smtpHint')}>
          {tenant.smtpEnabled && tenant.smtpPasswordSet && (
            <span className="w-fit rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
              {t('settings.smtpConfigured')}
            </span>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...register('smtpEnabled')} /> {t('settings.smtpEnabled')}
          </label>
          {watch('smtpEnabled') && (
            <>
              <Input label={t('settings.smtpHost')} placeholder="smtp.example.com" {...register('smtpHost')} />
              <Input
                label={t('settings.smtpPort')}
                type="number"
                placeholder="587"
                {...register('smtpPort')}
                className="max-w-[120px]"
              />
              <Input label={t('settings.smtpUser')} {...register('smtpUser')} />
              <Input
                label={t('settings.smtpPassword')}
                type="password"
                placeholder={tenant.smtpPasswordSet ? '••••••••' : ''}
                {...register('smtpPassword')}
              />
              <p className="-mt-2 text-xs text-gray-500">{t('settings.smtpPasswordHint')}</p>
              <Input label={t('settings.smtpFrom')} placeholder="orders@yourstore.com" {...register('smtpFrom')} />
            </>
          )}
        </SectionCard>
        <SaveButton loading={save.isPending} />
      </SectionFieldset>
    </form>
  )
}
