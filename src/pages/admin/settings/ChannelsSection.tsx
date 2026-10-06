import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/Input'
import { PlanLockedNotice, SaveButton, SectionCard, SectionFieldset } from './shared'
import { useReportDirty, useSaveTenantFields } from './hooks'
import type { Tenant } from '@/types/api'

type Values = Pick<
  Tenant,
  | 'whatsappEnabled'
  | 'whatsappNumber'
  | 'telegramEnabled'
  | 'telegramBotToken'
  | 'telegramChatId'
  | 'orderMessageTemplate'
>

const toValues = (t: Tenant): Values => ({
  whatsappEnabled: t.whatsappEnabled,
  whatsappNumber: t.whatsappNumber,
  telegramEnabled: t.telegramEnabled,
  telegramBotToken: t.telegramBotToken,
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

  return (
    <form onSubmit={(e) => void handleSubmit((values) => save.mutate(values))(e)}>
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
              <Input label={t('settings.telegramBotToken')} {...register('telegramBotToken')} />
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
