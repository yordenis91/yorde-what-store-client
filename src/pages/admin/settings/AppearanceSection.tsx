import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { DEFAULT_THEME, THEME_NAMES, themeSwatch } from '@/config/themes'
import { ImageField, SaveButton, SectionCard, SectionFieldset } from './shared'
import { useReportDirty, useSaveTenantFields } from './hooks'
import type { Tenant } from '@/types/api'

type Values = Pick<Tenant, 'logoUrl' | 'bannerUrl' | 'theme'>

const toValues = (t: Tenant): Values => ({
  logoUrl: t.logoUrl,
  bannerUrl: t.bannerUrl,
  theme: t.theme,
})

export function AppearanceSection({ tenant }: { tenant: Tenant }) {
  const { t } = useTranslation()
  const { register, handleSubmit, reset, watch, setValue, formState } = useForm<Values>({
    defaultValues: toValues(tenant),
  })
  const save = useSaveTenantFields()
  useReportDirty(formState.isDirty)
  useEffect(() => reset(toValues(tenant)), [tenant, reset])
  const active = watch('theme') ?? DEFAULT_THEME

  return (
    <form onSubmit={(e) => void handleSubmit((values) => save.mutate(values))(e)}>
      <SectionFieldset>
        <SectionCard title={t('settings.logoAndBanner')}>
          <ImageField
            label={t('settings.logo')}
            hint={t('settings.logoHint')}
            value={watch('logoUrl')}
            onChange={(url) => setValue('logoUrl', url, { shouldDirty: true })}
            previewClassName="h-20 w-20 rounded-xl"
            uploadType="logo"
          />
          <ImageField
            label={t('settings.banner')}
            hint={t('settings.bannerHint')}
            value={watch('bannerUrl')}
            onChange={(url) => setValue('bannerUrl', url, { shouldDirty: true })}
            previewClassName="aspect-[4/1] w-full rounded-xl"
            uploadType="banner"
          />
        </SectionCard>

        {/* Each swatch paints itself with the theme it selects, so the choice is visible without a preview pane. */}
        <SectionCard title={t('settings.theme')} hint={t('settings.themeHint')}>
          <div className="flex flex-wrap gap-3">
            {THEME_NAMES.map((name) => {
              const isActive = active === name
              return (
                <label
                  key={name}
                  title={t(`settings.themes.${name}`)}
                  className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border px-3 py-2 transition-colors ${
                    isActive ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input type="radio" value={name} className="sr-only" {...register('theme')} />
                  <span
                    aria-hidden
                    className="h-7 w-7 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: themeSwatch(name) }}
                  />
                  <span className={`text-xs ${isActive ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                    {t(`settings.themes.${name}`)}
                  </span>
                </label>
              )
            })}
          </div>
        </SectionCard>

        <SaveButton loading={save.isPending} />
      </SectionFieldset>
    </form>
  )
}
