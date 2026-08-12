import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getCurrentTenant, updateCurrentTenant, listPaymentSettings, upsertPaymentSetting } from '@/services/tenants.service'
import { useAuthStore } from '@/store/auth.store'
import { extractErrorMessage } from '@/services/api-client'
import type { Tenant } from '@/types/api'

type FormValues = Pick<
  Tenant,
  | 'name'
  | 'tagline'
  | 'currencySymbol'
  | 'whatsappEnabled'
  | 'whatsappNumber'
  | 'telegramEnabled'
  | 'telegramBotToken'
  | 'telegramChatId'
  | 'orderMessageTemplate'
>

export function StoreSettingsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const setActiveTenant = useAuthStore((s) => s.setActiveTenant)

  const { data: tenant } = useQuery({ queryKey: ['current-tenant'], queryFn: getCurrentTenant })
  const { register, handleSubmit, reset, watch } = useForm<FormValues>()

  useEffect(() => {
    if (tenant) {
      reset({
        name: tenant.name,
        tagline: tenant.tagline,
        currencySymbol: tenant.currencySymbol,
        whatsappEnabled: tenant.whatsappEnabled,
        whatsappNumber: tenant.whatsappNumber,
        telegramEnabled: tenant.telegramEnabled,
        telegramBotToken: tenant.telegramBotToken,
        telegramChatId: tenant.telegramChatId,
        orderMessageTemplate: tenant.orderMessageTemplate,
      })
    }
  }, [tenant, reset])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => updateCurrentTenant(values),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['current-tenant'] })
      setActiveTenant(updated)
      toast.success(t('settings.saved'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  if (!tenant) return <p className="text-sm text-gray-500">{t('common.loading')}</p>

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t('settings.title')}</h1>
      <form onSubmit={(e) => void handleSubmit((values) => mutation.mutate(values))(e)} className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4">
          <h2 className="font-medium text-gray-900">{t('settings.general')}</h2>
          <Input label={t('products.name')} {...register('name')} />
          <Input label="Tagline" {...register('tagline')} />
          <Input label="Currency symbol" {...register('currencySymbol')} className="max-w-[120px]" />
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="font-medium text-gray-900">{t('settings.whatsapp')}</h2>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...register('whatsappEnabled')} /> {t('common.edit')}
          </label>
          {watch('whatsappEnabled') && <Input label="WhatsApp number" placeholder="+15551234567" {...register('whatsappNumber')} />}
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="font-medium text-gray-900">{t('settings.telegram')}</h2>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...register('telegramEnabled')} /> {t('common.edit')}
          </label>
          {watch('telegramEnabled') && (
            <>
              <Input label="Bot token" {...register('telegramBotToken')} />
              <Input label="Chat ID" {...register('telegramChatId')} />
            </>
          )}
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="font-medium text-gray-900">Order message template</h2>
          <p className="text-xs text-gray-500">
            Placeholders: {'{store_name} {order_no} {item_variable} {sub_total} {discount_amount} {shipping_amount} {item_tax} {item_total}'}
          </p>
          <textarea className="rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs" rows={8} {...register('orderMessageTemplate')} />
        </Card>

        <Button type="submit" loading={mutation.isPending} className="w-fit">
          {t('settings.save')}
        </Button>
      </form>

      <PaymentSettingsSection />
    </div>
  )
}

interface StripeFormValues {
  publishableKey: string
  secretKey: string
  isEnabled: boolean
}

function PaymentSettingsSection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: settings } = useQuery({ queryKey: ['payment-settings'], queryFn: listPaymentSettings })
  const { register, handleSubmit, reset } = useForm<StripeFormValues>()

  useEffect(() => {
    const stripe = settings?.find((s) => s.provider === 'STRIPE')
    reset({ publishableKey: '', secretKey: '', isEnabled: stripe?.isEnabled ?? false })
  }, [settings, reset])

  const mutation = useMutation({
    mutationFn: (values: StripeFormValues) =>
      upsertPaymentSetting({
        provider: 'STRIPE',
        credentials: { publishableKey: values.publishableKey, secretKey: values.secretKey },
        isEnabled: values.isEnabled,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payment-settings'] })
      toast.success(t('settings.saved'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  const stripeConfigured = settings?.some((s) => s.provider === 'STRIPE' && s.isEnabled)

  return (
    <Card className="mt-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-gray-900">{t('settings.payments')}</h2>
        {stripeConfigured && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Stripe enabled</span>
        )}
      </div>
      <form onSubmit={(e) => void handleSubmit((values) => mutation.mutate(values))(e)} className="flex flex-col gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" {...register('isEnabled')} /> Enable Stripe checkout
        </label>
        <Input label="Publishable key" placeholder="pk_test_..." {...register('publishableKey')} />
        <Input label="Secret key" type="password" placeholder="sk_test_..." {...register('secretKey')} />
        <Button type="submit" loading={mutation.isPending} className="w-fit">
          {t('settings.save')}
        </Button>
      </form>
    </Card>
  )
}
