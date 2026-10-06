import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { getCurrentTenant } from '@/services/tenants.service'
import { AppearanceSection } from './settings/AppearanceSection'
import { ChannelsSection } from './settings/ChannelsSection'
import { EmailSection } from './settings/EmailSection'
import { GeneralSection } from './settings/GeneralSection'
import { PaymentsSection } from './settings/PaymentsSection'
import { PoliciesSection } from './settings/PoliciesSection'
import { SocialSection } from './settings/SocialSection'
import { DirtyProvider, SECTION_IDS, useCanEditSettings, type SectionId } from './settings/hooks'
import type { Tenant } from '@/types/api'

const SECTIONS: Record<SectionId, (props: { tenant: Tenant }) => ReactNode> = {
  general: (p) => <GeneralSection {...p} />,
  appearance: (p) => <AppearanceSection {...p} />,
  social: (p) => <SocialSection {...p} />,
  channels: (p) => <ChannelsSection {...p} />,
  payments: (p) => <PaymentsSection {...p} />,
  policies: (p) => <PoliciesSection {...p} />,
  email: (p) => <EmailSection {...p} />,
}

function isSectionId(value: string | null): value is SectionId {
  return SECTION_IDS.includes(value as SectionId)
}

/**
 * Store settings, split into seven sections reached from an index. Each section
 * is its own form and saves only its own fields (see useSaveTenantFields); the
 * page just chooses which one is on screen, keeps that choice in the URL
 * (?section=…) so it survives a reload and the back button, and asks before
 * leaving a section with unsaved edits.
 */
export function StoreSettingsPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const canEdit = useCanEditSettings()
  const { data: tenant } = useQuery({
    queryKey: ['current-tenant'],
    queryFn: getCurrentTenant,
  })

  const requested = searchParams.get('section')
  const active: SectionId = isSectionId(requested) ? requested : 'general'

  // On a phone the index scrolls sideways; keep the open section in view.
  const navRef = useRef<HTMLElement>(null)
  useEffect(() => {
    navRef.current?.querySelector('[aria-current]')?.scrollIntoView?.({ inline: 'center', block: 'nearest' })
  }, [active, tenant?.id])

  const dirtyReporters = useRef(new Set<string>())
  const reportDirty = useCallback((reporter: string, dirty: boolean) => {
    if (dirty) dirtyReporters.current.add(reporter)
    else dirtyReporters.current.delete(reporter)
  }, [])

  function select(id: SectionId) {
    if (id === active) return
    if (dirtyReporters.current.size > 0 && !confirm(t('settings.unsavedConfirm'))) return
    dirtyReporters.current.clear()
    setSearchParams({ section: id })
  }

  if (!tenant) return <p className="text-sm text-gray-500">{t('common.loading')}</p>

  return (
    <div className="max-w-4xl">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t('settings.title')}</h1>
      {!canEdit && (
        <p role="note" className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t('settings.ownerOnly')}
        </p>
      )}
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <nav ref={navRef} aria-label={t('settings.title')} className="md:sticky md:top-4 md:w-48 md:shrink-0">
          <ul className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {SECTION_IDS.map((id) => (
              <li key={id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => select(id)}
                  aria-current={id === active ? 'page' : undefined}
                  className={`w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    id === active ? 'bg-brand-50 font-medium text-brand-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {t(`settings.sections.${id}`)}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <DirtyProvider value={reportDirty}>
          <section aria-labelledby="settings-section-title" className="min-w-0 flex-1">
            <h2 id="settings-section-title" className="mb-4 text-lg font-medium text-gray-900">
              {t(`settings.sections.${active}`)}
            </h2>
            {SECTIONS[active]({ tenant })}
          </section>
        </DirtyProvider>
      </div>
    </div>
  )
}
