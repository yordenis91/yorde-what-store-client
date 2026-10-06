import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { extractErrorMessage } from '@/services/api-client'
import {
  getPublicStorefront,
  listPaymentSettings,
  upsertPaymentSetting,
  type PaymentSetting,
} from '@/services/tenants.service'
import { PlanLockedNotice, SectionCard } from './shared'
import { useCanEditSettings, useReportDirty } from './hooks'
import type { Tenant } from '@/types/api'

type Provider = PaymentSetting['provider']

function EnabledBadge({ show, label }: { show: boolean; label: string }) {
  if (!show) return null
  return <span className="w-fit rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">{label}</span>
}

/**
 * Saving a payment method replaces its stored credentials wholesale, and the
 * API never returns them. So a save always has to carry the complete set:
 * submitting the form with blank keys would overwrite the ones that work with
 * nothing. Every field the provider needs is therefore required here, even
 * when the only change is switching it off.
 */
function usePaymentSave(provider: Provider) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { credentials: Record<string, string>; isEnabled: boolean }) =>
      upsertPaymentSetting({ provider, ...payload }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payment-settings'] })
      toast.success(t('settings.saved'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })
}

interface StripeValues {
  publishableKey: string
  secretKey: string
  isEnabled: boolean
}

function StripeForm({ setting }: { setting?: PaymentSetting }) {
  const { t } = useTranslation()
  const { register, handleSubmit, reset, formState } = useForm<StripeValues>({
    defaultValues: {
      publishableKey: '',
      secretKey: '',
      isEnabled: setting?.isEnabled ?? false,
    },
  })
  const save = usePaymentSave('STRIPE')
  useReportDirty(formState.isDirty)
  useEffect(
    () =>
      reset({
        publishableKey: '',
        secretKey: '',
        isEnabled: setting?.isEnabled ?? false,
      }),
    [setting, reset],
  )
  const required = t('settings.credentialRequired')

  return (
    <SectionCard title="Stripe" hint={setting ? t('settings.credentialsSavedHint') : t('settings.credentialsNewHint')}>
      <EnabledBadge show={!!setting?.isEnabled} label={t('settings.paymentEnabled', { name: 'Stripe' })} />
      <form
        onSubmit={(e) =>
          void handleSubmit((v) =>
            save.mutate({
              credentials: {
                publishableKey: v.publishableKey.trim(),
                secretKey: v.secretKey.trim(),
              },
              isEnabled: v.isEnabled,
            }),
          )(e)
        }
        className="flex flex-col gap-3"
      >
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" {...register('isEnabled')} /> {t('settings.stripeEnabled')}
        </label>
        <PlanLockedNotice method="STRIPE" />
        <Input
          label={t('settings.stripePublishableKey')}
          placeholder="pk_test_..."
          error={formState.errors.publishableKey && required}
          {...register('publishableKey', { validate: (v) => v.trim() !== '' })}
        />
        <Input
          label={t('settings.stripeSecretKey')}
          type="password"
          placeholder="sk_test_..."
          error={formState.errors.secretKey && required}
          {...register('secretKey', { validate: (v) => v.trim() !== '' })}
        />
        <SaveCredentials loading={save.isPending} />
      </form>
    </SectionCard>
  )
}

interface MercadoPagoValues {
  accessToken: string
  isEnabled: boolean
}

function MercadoPagoForm({ setting }: { setting?: PaymentSetting }) {
  const { t } = useTranslation()
  const { register, handleSubmit, reset, formState } = useForm<MercadoPagoValues>({
    defaultValues: {
      accessToken: '',
      isEnabled: setting?.isEnabled ?? false,
    },
  })
  const save = usePaymentSave('MERCADOPAGO')
  useReportDirty(formState.isDirty)
  useEffect(() => reset({ accessToken: '', isEnabled: setting?.isEnabled ?? false }), [setting, reset])

  return (
    <SectionCard
      title="MercadoPago"
      hint={setting ? t('settings.credentialsSavedHint') : t('settings.credentialsNewHint')}
    >
      <EnabledBadge show={!!setting?.isEnabled} label={t('settings.paymentEnabled', { name: 'MercadoPago' })} />
      <form
        onSubmit={(e) =>
          void handleSubmit((v) =>
            save.mutate({
              credentials: { accessToken: v.accessToken.trim() },
              isEnabled: v.isEnabled,
            }),
          )(e)
        }
        className="flex flex-col gap-3"
      >
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" {...register('isEnabled')} /> {t('settings.mercadoPagoEnabled')}
        </label>
        <PlanLockedNotice method="MERCADOPAGO" />
        <Input
          label={t('settings.mercadoPagoAccessToken')}
          type="password"
          placeholder="APP_USR-..."
          error={formState.errors.accessToken && t('settings.credentialRequired')}
          {...register('accessToken', { validate: (v) => v.trim() !== '' })}
        />
        <SaveCredentials loading={save.isPending} />
      </form>
    </SectionCard>
  )
}

interface ZelleValues {
  recipientName: string
  recipientEmail: string
  recipientPhone: string
  instructions: string
  isEnabled: boolean
}

const emptyZelle = (isEnabled: boolean): ZelleValues => ({
  recipientName: '',
  recipientEmail: '',
  recipientPhone: '',
  instructions: '',
  isEnabled,
})

/**
 * Unlike the card gateways, a Zelle "credential" is just the recipient shown to
 * customers at checkout — the API already publishes it on the public storefront
 * endpoint on purpose. That is the only place it can be read back, so the form
 * is filled from there; it is only published while Zelle is enabled and on the
 * plan, otherwise the fields start blank.
 */
function ZelleForm({ setting, slug }: { setting?: PaymentSetting; slug: string }) {
  const { t } = useTranslation()
  const { data: storefront } = useQuery({
    queryKey: ['storefront-zelle', slug],
    queryFn: () => getPublicStorefront(slug),
    enabled: !!slug,
  })
  const info = storefront?.zellePaymentInfo
  const isEnabled = setting?.isEnabled ?? false
  const { register, handleSubmit, reset, formState } = useForm<ZelleValues>({ defaultValues: emptyZelle(isEnabled) })
  const save = usePaymentSave('ZELLE')
  useReportDirty(formState.isDirty)
  useEffect(() => {
    reset({
      recipientName: info?.recipientName ?? '',
      recipientEmail: info?.recipientEmail ?? '',
      recipientPhone: info?.recipientPhone ?? '',
      instructions: info?.instructions ?? '',
      isEnabled,
    })
  }, [info, isEnabled, reset])
  const required = t('settings.credentialRequired')

  return (
    <SectionCard title="Zelle" hint={t('settings.zelleHint')}>
      <EnabledBadge show={!!setting?.isEnabled} label={t('settings.paymentEnabled', { name: 'Zelle' })} />
      <form
        onSubmit={(e) =>
          void handleSubmit((v) =>
            save.mutate({
              credentials: {
                recipientName: v.recipientName.trim(),
                recipientEmail: v.recipientEmail.trim(),
                recipientPhone: v.recipientPhone.trim(),
                instructions: v.instructions.trim(),
              },
              isEnabled: v.isEnabled,
            }),
          )(e)
        }
        className="flex flex-col gap-3"
      >
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" {...register('isEnabled')} /> {t('settings.zelleEnabled')}
        </label>
        <PlanLockedNotice method="ZELLE" />
        <Input
          label={t('settings.zelleRecipientName')}
          error={formState.errors.recipientName && required}
          {...register('recipientName', { validate: (v) => v.trim() !== '' })}
        />
        <Input
          label={t('settings.zelleRecipientEmail')}
          placeholder="payments@yourstore.com"
          error={formState.errors.recipientEmail && required}
          {...register('recipientEmail', { validate: (v) => v.trim() !== '' })}
        />
        <Input label={t('settings.zelleRecipientPhone')} {...register('recipientPhone')} />
        <Textarea
          label={t('settings.zelleInstructions')}
          rows={3}
          placeholder={t('settings.zelleInstructionsPlaceholder')}
          {...register('instructions')}
        />
        <SaveCredentials loading={save.isPending} />
      </form>
    </SectionCard>
  )
}

function SaveCredentials({ loading }: { loading: boolean }) {
  const { t } = useTranslation()
  return (
    <Button type="submit" loading={loading} className="w-fit">
      {t('settings.save')}
    </Button>
  )
}

export function PaymentsSection({ tenant }: { tenant: Tenant }) {
  const { t } = useTranslation()
  const canEdit = useCanEditSettings()
  // OWNER-only endpoint: a collaborator's session never calls it.
  const { data: settings } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: listPaymentSettings,
    enabled: canEdit,
  })

  if (!canEdit) {
    return <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">{t('settings.paymentsOwnerOnly')}</p>
  }
  if (!settings) return <p className="text-sm text-gray-500">{t('common.loading')}</p>

  const find = (provider: Provider) => settings.find((s) => s.provider === provider)
  return (
    <div className="flex flex-col gap-6">
      <StripeForm setting={find('STRIPE')} />
      <MercadoPagoForm setting={find('MERCADOPAGO')} />
      <ZelleForm setting={find('ZELLE')} slug={tenant.slug} />
    </div>
  )
}
