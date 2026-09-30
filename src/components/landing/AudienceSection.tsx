import type { ComponentType, SVGProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { CartIcon, ShieldIcon, StoreIcon } from '@/components/ui/icons'
import { HOW_SECTION_ID, ROLES, type Role } from './roles'

const ROLE_ICONS: Record<Role, ComponentType<SVGProps<SVGSVGElement>>> = {
  admin: StoreIcon,
  superAdmin: ShieldIcon,
  customer: CartIcon,
}

interface Props {
  onSelect: (role: Role) => void
}

export function AudienceSection({ onSelect }: Props) {
  const { t } = useTranslation()

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">{t('landing.audience.title')}</h2>
      <p className="mt-2 text-center text-gray-600">{t('landing.audience.subtitle')}</p>

      <div className="mt-8 flex flex-col gap-4 md:grid md:grid-cols-3">
        {ROLES.map((role) => {
          const RoleIcon = ROLE_ICONS[role]
          return (
            <Card key={role} className="flex flex-col gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <RoleIcon className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-semibold text-gray-900">{t(`landing.audience.roles.${role}.label`)}</h3>
              <p className="flex-1 text-sm text-gray-600">{t(`landing.audience.roles.${role}.benefit`)}</p>
              <a
                href={`#${HOW_SECTION_ID}`}
                onClick={() => onSelect(role)}
                className="text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline"
              >
                {t('landing.audience.seeHow')} →
              </a>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
