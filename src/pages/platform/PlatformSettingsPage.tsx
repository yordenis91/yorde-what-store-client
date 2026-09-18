import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getPlatformSettings, updatePlatformSettings, type PlatformSettings } from '@/services/platform.service'
import { extractErrorMessage } from '@/services/api-client'

interface CommissionFormValues {
  defaultCommissionRate: number
}

interface SmtpFormValues {
  smtpEnabled: boolean
  smtpHost: string
  smtpPort: string
  smtpUser: string
  smtpPassword: string
  smtpFrom: string
}

export function PlatformSettingsPage() {
  const { t } = useTranslation()
  const { data: settings, isLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: getPlatformSettings,
  })

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{t('platformSettings.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('platformSettings.subtitle')}</p>
      </div>

      {isLoading || !settings ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : (
        <div className="flex flex-col gap-6">
          <CommissionSection settings={settings} />
          <SmtpSection settings={settings} />
        </div>
      )}
    </div>
  )
}

function CommissionSection({ settings }: { settings: PlatformSettings }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset } = useForm<CommissionFormValues>()

  useEffect(() => {
    reset({ defaultCommissionRate: settings.defaultCommissionRate })
  }, [settings, reset])

  const mutation = useMutation({
    mutationFn: (values: CommissionFormValues) =>
      updatePlatformSettings({ defaultCommissionRate: Number(values.defaultCommissionRate) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform-settings'] })
      toast.success(t('platformSettings.saved'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-medium text-gray-900">{t('platformSettings.commission')}</h2>
        <p className="mt-1 text-xs text-gray-500">{t('platformSettings.commissionHint')}</p>
      </div>
      <form
        onSubmit={(e) => void handleSubmit((values) => mutation.mutate(values))(e)}
        className="flex flex-col gap-3"
      >
        <Input
          label={t('platformSettings.defaultCommissionRate')}
          type="number"
          step="0.01"
          min={0}
          max={100}
          className="max-w-[160px]"
          {...register('defaultCommissionRate', { valueAsNumber: true, required: true, min: 0, max: 100 })}
        />
        <Button type="submit" loading={mutation.isPending} className="w-fit">
          {t('platformSettings.save')}
        </Button>
      </form>
    </Card>
  )
}

/**
 * Mirrors the tenant-facing SmtpSettingsSection in StoreSettingsPage: the
 * password field always loads blank (write-only) — leaving it blank on save
 * keeps whatever password is already stored, since PlatformSettings never
 * returns the raw smtpPassword over the API.
 */
function SmtpSection({ settings }: { settings: PlatformSettings }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, watch } = useForm<SmtpFormValues>()

  useEffect(() => {
    reset({
      smtpEnabled: settings.smtpEnabled,
      smtpHost: settings.smtpHost ?? '',
      smtpPort: settings.smtpPort ? String(settings.smtpPort) : '',
      smtpUser: settings.smtpUser ?? '',
      smtpPassword: '',
      smtpFrom: settings.smtpFrom ?? '',
    })
  }, [settings, reset])

  const mutation = useMutation({
    mutationFn: (values: SmtpFormValues) => {
      const payload: Parameters<typeof updatePlatformSettings>[0] = {
        smtpEnabled: values.smtpEnabled,
        smtpHost: values.smtpHost || null,
        smtpPort: values.smtpPort ? Number(values.smtpPort) : null,
        smtpUser: values.smtpUser || null,
        smtpFrom: values.smtpFrom || null,
      }
      if (values.smtpPassword) payload.smtpPassword = values.smtpPassword
      return updatePlatformSettings(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform-settings'] })
      toast.success(t('platformSettings.saved'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium text-gray-900">{t('platformSettings.smtp')}</h2>
          <p className="mt-1 text-xs text-gray-500">{t('platformSettings.smtpHint')}</p>
        </div>
        {settings.smtpEnabled && settings.smtpPasswordSet && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
            {t('platformSettings.smtpConfigured')}
          </span>
        )}
      </div>
      <form
        onSubmit={(e) => void handleSubmit((values) => mutation.mutate(values))(e)}
        className="flex flex-col gap-3"
      >
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" {...register('smtpEnabled')} /> {t('platformSettings.smtpEnabled')}
        </label>
        {watch('smtpEnabled') && (
          <>
            <Input label={t('platformSettings.smtpHost')} placeholder="smtp.example.com" {...register('smtpHost')} />
            <Input
              label={t('platformSettings.smtpPort')}
              type="number"
              placeholder="587"
              className="max-w-[120px]"
              {...register('smtpPort')}
            />
            <Input label={t('platformSettings.smtpUser')} {...register('smtpUser')} />
            <Input
              label={t('platformSettings.smtpPassword')}
              type="password"
              placeholder={settings.smtpPasswordSet ? '••••••••' : ''}
              {...register('smtpPassword')}
            />
            <p className="-mt-2 text-xs text-gray-500">{t('platformSettings.smtpPasswordHint')}</p>
            <Input
              label={t('platformSettings.smtpFrom')}
              placeholder="no-reply@yourplatform.com"
              {...register('smtpFrom')}
            />
          </>
        )}
        <Button type="submit" loading={mutation.isPending} className="w-fit">
          {t('platformSettings.save')}
        </Button>
      </form>
    </Card>
  )
}
