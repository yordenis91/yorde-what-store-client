import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import {
  listEmailTemplates,
  revertEmailTemplate,
  upsertEmailTemplate,
  type ResolvedEmailTemplate,
} from '@/services/email-templates.service'
import { extractErrorMessage } from '@/services/api-client'

const PLACEHOLDERS: Record<string, string> = {
  'staff-invite': '{name} {store_name} {temporary_password}',
  'order-confirmation': '{customer_name} {store_name} {order_no} {grand_total}',
  'password-reset': '{name} {store_name} {reset_link}',
}

export function EmailTemplatesPage() {
  const { t } = useTranslation()
  const { data: templates, isLoading } = useQuery({ queryKey: ['email-templates'], queryFn: listEmailTemplates })

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">{t('nav.emailTemplates')}</h1>
      <p className="mb-6 text-sm text-gray-500">{t('emailTemplates.hint')}</p>

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {templates?.map((tpl) => <TemplateCard key={tpl.key} template={tpl} />)}
        </div>
      )}
    </div>
  )
}

interface FormValues {
  subject: string
  body: string
}

function TemplateCard({ template }: { template: ResolvedEmailTemplate }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { subject: template.subject, body: template.body },
  })

  useEffect(() => {
    reset({ subject: template.subject, body: template.body })
  }, [template, reset])

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => upsertEmailTemplate(template.key, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['email-templates'] })
      toast.success(t('settings.saved'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  const revertMutation = useMutation({
    mutationFn: () => revertEmailTemplate(template.key),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['email-templates'] })
      toast.success(t('emailTemplates.reverted'))
    },
    onError: (error) => toast.error(extractErrorMessage(error, t('errors.generic'))),
  })

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-medium text-gray-900">{t(`emailTemplates.keys.${template.key}`)}</h2>
          {template.isOverridden && (
            <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
              {t('emailTemplates.customized')}
            </span>
          )}
        </div>
        {template.isOverridden && (
          <Button
            type="button"
            variant="ghost"
            loading={revertMutation.isPending}
            onClick={() => revertMutation.mutate()}
          >
            {t('emailTemplates.restoreDefault')}
          </Button>
        )}
      </div>

      <form onSubmit={(e) => void handleSubmit((values) => saveMutation.mutate(values))(e)} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">{t('emailTemplates.subject')}</label>
          <input
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            {...register('subject', { required: true })}
          />
        </div>
        <Textarea
          label={t('emailTemplates.body')}
          className="font-mono text-xs"
          rows={6}
          {...register('body', { required: true })}
        />
        <p className="text-xs text-gray-500">
          {t('emailTemplates.placeholders')}: {PLACEHOLDERS[template.key]}
        </p>
        <Button type="submit" loading={saveMutation.isPending} className="w-fit">
          {t('settings.save')}
        </Button>
      </form>
    </Card>
  )
}
