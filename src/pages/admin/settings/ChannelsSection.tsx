import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/Input'
import { PlanLockedNotice, SaveButton, SectionCard, SectionFieldset } from './shared'
import { useReportDirty, useSaveTenantFields } from './hooks'
import type { Tenant } from '@/types/api'

interface Values {
  whatsappEnabled: boolean
  whatsappNumber: string | null
  telegramEnabled: boolean
  /** Write-only: the API never returns the stored token, so this always starts blank. */
  telegramBotToken: string
  telegramChatId: string | null
  orderMessageTemplate: string
}

const toValues = (t: Tenant): Values => ({
  whatsappEnabled: t.whatsappEnabled,
  whatsappNumber: t.whatsappNumber,
  telegramEnabled: t.telegramEnabled,
  telegramBotToken: '',
  telegramChatId: t.telegramChatId,
  orderMessageTemplate: t.orderMessageTemplate,
})

export function ChannelsSection({ tenant }: { tenant: Tenant }) {
  const { t } = useTranslation()
  const { register, handleSubmit, reset, watch, formState } = useForm<Values>({
    defaultValues: toValues(tenant),
  })
  const save = useSaveTenantFields()
  useReportDirty(formState.isDirty)
  useEffect(() => reset(toValues(tenant)), [tenant, reset])

  // An empty token field means "keep the stored one": sending '' would erase it, and with it every
  // Telegram order notification, on an unrelated save (a new WhatsApp number, say).
  function onSubmit({ telegramBotToken, ...rest }: Values) {
    const token = telegramBotToken.trim()
    save.mutate({ ...rest, ...(token !== '' && { telegramBotToken: token }) })
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
      <SectionFieldset>
        <SectionCard title={t('settings.whatsapp')}>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...register('whatsappEnabled')} /> {t('settings.whatsappEnabled')}
          </label>
          <PlanLockedNotice method="WHATSAPP" />
          {watch('whatsappEnabled') && (
            <Input label={t('settings.whatsappNumber')} placeholder="+15551234567" {...register('whatsappNumber')} />
          )}
        </SectionCard>

        <SectionCard title={t('settings.telegram')}>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...register('telegramEnabled')} /> {t('settings.telegramEnabled')}
          </label>
          <PlanLockedNotice method="TELEGRAM" />
          {watch('telegramEnabled') && (
            <>
              <Input
                label={t('settings.telegramBotToken')}
                type="password"
                autoComplete="off"
                placeholder={tenant.telegramBotTokenSet ? '••••••••' : ''}
                error={formState.errors.telegramBotToken && t('settings.telegramBotTokenRequired')}
                {...register('telegramBotToken', {
                  // Turning Telegram on with no token stored (and none typed) would leave a channel that cannot send.
                  validate: (v) => tenant.telegramBotTokenSet || v.trim() !== '',
                })}
              />
              {tenant.telegramBotTokenSet && (
                <p className="-mt-2 text-xs text-gray-500">{t('settings.telegramBotTokenSavedHint')}</p>
              )}
              <Input label={t('settings.telegramChatId')} {...register('telegramChatId')} />
            </>
          )}
        </SectionCard>

        <SectionCard
          title={t('settings.orderMessageTemplate')}
          hint={`${t('settings.orderMessageTemplatePlaceholders')}: {store_name} {order_no} {item_variable} {sub_total} {discount_amount} {shipping_amount} {item_tax} {item_total}`}
        >
          <textarea
            aria-label={t('settings.orderMessageTemplate')}
            className="rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs"
            rows={8}
            {...register('orderMessageTemplate')}
          />
        </SectionCard>

        <SaveButton loading={save.isPending} />
      </SectionFieldset>
    </form>
  )
}
