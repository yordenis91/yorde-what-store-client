import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { SOCIAL_NETWORKS } from '@/config/social'
import { SaveButton, SectionCard, SectionFieldset } from './shared'
import { useReportDirty, useSaveTenantFields } from './hooks'
import type { Tenant } from '@/types/api'

type Values = Pick<Tenant, 'socialLinks'>

export function SocialSection({ tenant }: { tenant: Tenant }) {
  const { t } = useTranslation()
  const { register, handleSubmit, reset, formState } = useForm<Values>({
    defaultValues: { socialLinks: tenant.socialLinks ?? {} },
  })
  const save = useSaveTenantFields()
  useReportDirty(formState.isDirty)
  useEffect(() => reset({ socialLinks: tenant.socialLinks ?? {} }), [tenant, reset])

  return (
    <form onSubmit={(e) => void handleSubmit((values) => save.mutate(values))(e)}>
      <SectionFieldset>
        <SectionCard hint={t('settings.socialHint')}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SOCIAL_NETWORKS.map(({ key, label, Icon, placeholder }) => (
              <label key={key} className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                  <Icon className="h-4 w-4" />
                </span>
                <input
                  type="url"
                  placeholder={placeholder}
                  aria-label={label}
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  {...register(`socialLinks.${key}`)}
                />
              </label>
            ))}
          </div>
        </SectionCard>
        <SaveButton loading={save.isPending} />
      </SectionFieldset>
    </form>
  )
}
